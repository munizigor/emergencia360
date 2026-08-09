/*
 * Tela do despachante — HU02.3, HU03.1, HU03.3. Lista as ocorrências em
 * andamento do órgão selecionado em "Ver como" e permite verificar
 * duplicidade, vincular ou descartar sugestões.
 */

document.addEventListener('DOMContentLoaded', () => {
  montarCabecalho('despachante');
  renderizarLista();
  window.addEventListener('motorAlterado', () => {
    const idAberto = document.getElementById('containerVerificacao').dataset.origemId;
    if (idAberto) abrirVerificacao(idAberto);
  });
});

function renderizarLista() {
  const orgao = ESTADO.obterVerComo();
  const lista = ESTADO.obterOcorrencias()
    .filter((o) => o.orgao === orgao && o.status !== 'ENCERRADA')
    .sort((a, b) => new Date(b.abertura) - new Date(a.abertura));

  const destino = document.getElementById('listaOcorrencias');

  if (lista.length === 0) {
    destino.innerHTML = '<p class="aviso-vazio">Nenhuma ocorrência em andamento para este órgão.</p>';
    return;
  }

  destino.innerHTML = lista
    .map((o) => {
      const outrasVinculadas = ESTADO.obterOcorrenciasDoEvento(o.id_evento).filter((x) => x.id_ocorrencia !== o.id_ocorrencia);
      return `
      <div class="item-ocorrencia">
        <div class="info">
          <div class="info-linha1">
            ${tagOrgao(o.orgao)}
            ${badgeStatus(o.status)}
            ${badgeRegulacao(o)}
            ${outrasVinculadas.length ? badgeVinculo(outrasVinculadas.length) : ''}
            <span class="endereco">${escaparHtml(o.endereco_normalizado)}</span>
          </div>
          <div class="meta">${o.id_ocorrencia} · ${labelTipo(o.tipo_canonico)} · aberta às ${formatarHora(o.abertura)}</div>
        </div>
        <button class="btn btn-primary" onclick="abrirVerificacao('${o.id_ocorrencia}')">Verificar duplicidade</button>
      </div>
    `;
    })
    .join('');
}

function abrirVerificacao(idOrigem) {
  const origem = ESTADO.obterOcorrenciaPorId(idOrigem);
  if (!origem) return;

  const container = document.getElementById('containerVerificacao');
  container.hidden = false;
  container.dataset.origemId = idOrigem;

  document.getElementById('tituloOrigem').textContent = `${origem.id_ocorrencia} — ${escapararPlano(origem.endereco_normalizado)}`;

  const resultado = MOTOR.buscarCandidatos(origem, ESTADO.obterOcorrencias(), {
    motorLigado: ESTADO.obterMotorLigado(),
    descartados: ESTADO.obterDescartadosComoSet(),
  });

  document.getElementById('subtituloVerificacao').textContent = resultado.degradado
    ? 'Estratégia efetiva: cronológica (motor desligado) — mesmos candidatos, sem score.'
    : 'Estratégia efetiva: geo-temporal.';

  // HU02.3/HU-06: a tela precisa informar se já existe vínculo estabelecido
  // para esta ocorrência, não só listar candidatos novos.
  const outrasVinculadas = ESTADO.obterOcorrenciasDoEvento(origem.id_evento).filter((o) => o.id_ocorrencia !== origem.id_ocorrencia);
  document.getElementById('statusVinculoOrigem').innerHTML = outrasVinculadas.length
    ? `<div class="aviso-vinculo-existente">Esta ocorrência já está vinculada a ${outrasVinculadas
        .map((o) => tagOrgao(o.orgao) + ' ' + escaparHtml(o.id_ocorrencia))
        .join(', ')}. <a href="evento.html?evento=${encodeURIComponent(origem.id_evento)}">Ver evento</a></div>`
    : '';
  document.getElementById('feedbackVerificacao').innerHTML = '';

  renderizarCandidatos(resultado, idOrigem);
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escapararPlano(texto) {
  return texto == null ? '' : String(texto);
}

function renderizarCandidatos(resultado, idOrigem) {
  const destino = document.getElementById('listaCandidatos');

  if (resultado.candidatos.length === 0) {
    destino.innerHTML = '<p class="aviso-vazio">Nenhum candidato encontrado no raio e na janela definidos para este tipo.</p>';
    return;
  }

  const verComo = ESTADO.obterVerComo();

  destino.innerHTML = resultado.candidatos
    .map((item) => {
      const o = item.candidata;
      const suprimir = o.sigiloso && o.orgao !== verComo;
      return `
      <div class="card-candidato">
        <div class="card-candidato-cabeco">
          ${tagOrgao(o.orgao)}
          ${badgeStatus(o.status)}
          ${suprimir ? '' : badgeRegulacao(o)}
          ${badgeScore(item.score, item.baixaConfianca)}
        </div>
        ${
          suprimir
            ? `<div class="suprimido">🔒 Conteúdo reservado — acesso restrito ao órgão de origem (RN-13)</div>`
            : `
              <div class="endereco">${escaparHtml(o.endereco_normalizado)}</div>
              <div class="motivo">${escaparHtml(item.motivo)} · aberta às ${formatarHora(o.abertura)} · ${labelTipo(o.tipo_canonico)}</div>
              <div class="resumo">${escaparHtml(o.resumo)}</div>
            `
        }
        <div class="acoes">
          <button class="btn btn-vincular" onclick="vincularCandidato('${idOrigem}','${o.id_ocorrencia}')">É o mesmo evento</button>
          <button class="btn btn-descartar" onclick="descartarCandidato('${idOrigem}','${o.id_ocorrencia}')">São eventos distintos</button>
        </div>
      </div>
    `;
    })
    .join('');
}

async function vincularCandidato(idOrigem, idCandidata) {
  const candidata = ESTADO.obterOcorrenciaPorId(idCandidata);
  const verComo = ESTADO.obterVerComo();
  const suprimido = !!(candidata && candidata.sigiloso && candidata.orgao !== verComo);

  if (suprimido) {
    // RN-13: sem esta barreira, o despachante vincularia um registro cujo
    // endereço, tipo e resumo ele nunca viu — só o score. A confirmação
    // extra obriga a decisão consciente que o §2.5 do documento de visão
    // exige do operador.
    const confirmado = await confirmarAcao({
      titulo: 'Vincular ocorrência reservada',
      mensagem:
        'Esta ocorrência é sigilosa (RN-13): você não vê endereço, tipo ou resumo dela, apenas o score. Confirma o vínculo mesmo sem ver o conteúdo?',
      textoConfirmar: 'Vincular mesmo assim',
      textoCancelar: 'Cancelar',
      variantePerigo: true,
    });
    if (!confirmado) return;
  }

  const idEvento = ESTADO.vincular(idOrigem, idCandidata);
  abrirVerificacao(idOrigem);
  renderizarLista();
  mostrarFeedbackVinculo(idCandidata, idEvento);
}

function mostrarFeedbackVinculo(idCandidata, idEvento) {
  document.getElementById('feedbackVerificacao').innerHTML = `
    <div class="confirmacao-cadastro">
      Vinculado a ${escaparHtml(idCandidata)}.
      <a href="evento.html?evento=${encodeURIComponent(idEvento)}">Ver evento</a>
    </div>
  `;
}

async function descartarCandidato(idOrigem, idCandidata) {
  const motivo = await pedirTexto({
    titulo: 'São eventos distintos',
    mensagem: 'Por que estes são eventos distintos? (opcional — vira rótulo de calibração, RN-17)',
    campo: 'Motivo (opcional)',
    obrigatorio: false,
    textoConfirmar: 'Descartar sugestão',
  });
  if (motivo === null) return; // usuário cancelou
  ESTADO.descartar(idOrigem, idCandidata, motivo);
  abrirVerificacao(idOrigem);
}
