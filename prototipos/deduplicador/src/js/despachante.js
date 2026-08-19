/*
 * Tela do despachante — HU02.3, HU03.1, HU03.3. Lista as ocorrências em
 * andamento do órgão selecionado em "Ver como" e permite vincular ou
 * descartar sugestões.
 *
 * A verificação de duplicidade não é uma ação do operador: cada ocorrência
 * da fila já chega com suas candidatas calculadas e visíveis. Exigir um
 * clique por ocorrência para descobrir se havia duplicidade transferia ao
 * despachante o trabalho que a plataforma existe para fazer — e escondia,
 * atrás de um botão, justamente a informação que sustenta a dor D2/D3 do
 * documento de visão §2.2. O que permanece humano é a decisão: "é o mesmo
 * evento" ou "são eventos distintos" (P2 / RN-17).
 */

document.addEventListener('DOMContentLoaded', () => {
  montarCabecalho('despachante');
  renderizarLista();
  // Ligar/desligar o motor (cabeçalho) muda a estratégia efetiva de todas as
  // ocorrências da fila ao mesmo tempo, não só de uma "aberta".
  window.addEventListener('motorAlterado', () => renderizarLista());
});

function renderizarLista() {
  const orgao = ESTADO.obterVerComo();
  const todas = ESTADO.obterOcorrencias();
  const lista = todas
    .filter((o) => o.orgao === orgao && o.status !== 'ENCERRADA')
    .sort((a, b) => new Date(b.abertura) - new Date(a.abertura));

  const destino = document.getElementById('listaOcorrencias');

  if (lista.length === 0) {
    destino.innerHTML = '<p class="aviso-vazio">Nenhuma ocorrência em andamento para este órgão.</p>';
    return;
  }

  const opcoes = {
    motorLigado: ESTADO.obterMotorLigado(),
    descartados: ESTADO.obterDescartadosComoSet(),
  };

  destino.innerHTML = lista
    .map((o) => cartaoOcorrencia(o, MOTOR.buscarCandidatos(o, todas, opcoes), orgao))
    .join('');
}

function cartaoOcorrencia(origem, resultado, verComo) {
  const outrasVinculadas = ESTADO.obterOcorrenciasDoEvento(origem.id_evento).filter(
    (o) => o.id_ocorrencia !== origem.id_ocorrencia
  );
  const qtd = resultado.candidatos.length;

  return `
    <article class="item-ocorrencia${qtd ? ' tem-duplicidade' : ''}" id="oc-${origem.id_ocorrencia}">
      <div class="item-ocorrencia-topo">
        <div class="info">
          <div class="info-linha1">
            ${tagOrgao(origem.orgao)}
            ${badgeStatus(origem.status)}
            ${badgeRegulacao(origem)}
            ${outrasVinculadas.length ? badgeVinculo(outrasVinculadas.length) : ''}
            ${badgeDuplicidade(qtd)}
            <span class="endereco">${escaparHtml(origem.endereco_normalizado)}</span>
          </div>
          <div class="meta">${origem.id_ocorrencia} · ${labelTipo(origem.tipo_canonico)} · aberta às ${formatarHora(origem.abertura)}</div>
        </div>
      </div>

      ${
        // HU02.3/HU-06: a fila precisa informar se já existe vínculo
        // estabelecido para esta ocorrência, não só listar candidatas novas.
        outrasVinculadas.length
          ? `<div class="aviso-vinculo-existente">Esta ocorrência já está vinculada a ${outrasVinculadas
              .map((o) => tagOrgao(o.orgao) + ' ' + escaparHtml(o.id_ocorrencia))
              .join(', ')}. <a href="evento.html?evento=${encodeURIComponent(origem.id_evento)}">Ver evento</a></div>`
          : ''
      }

      <div class="feedback-vinculo" id="feedback-${origem.id_ocorrencia}" aria-live="polite"></div>

      ${qtd ? blocoDuplicidade(origem, resultado, verComo) : ''}
    </article>
  `;
}

function badgeDuplicidade(qtd) {
  if (qtd === 0) return '<span class="badge-dup badge-dup-sem">Sem duplicidade detectada</span>';
  const rotulo = qtd === 1 ? '1 possível duplicada' : `${qtd} possíveis duplicadas`;
  return `<span class="badge-dup badge-dup-com">⚠ ${rotulo}</span>`;
}

function blocoDuplicidade(origem, resultado, verComo) {
  const estrategia = resultado.degradado
    ? 'Estratégia efetiva: cronológica (motor desligado) — mesmos candidatos, sem score.'
    : 'Estratégia efetiva: geo-temporal.';

  return `
    <div class="bloco-duplicidade">
      <div class="bloco-duplicidade-titulo">
        Possível duplicidade — decida abaixo
        <span class="bloco-duplicidade-estrategia">${estrategia}</span>
      </div>
      <div class="lista-candidatos">
        ${resultado.candidatos.map((item) => cartaoCandidato(item, origem.id_ocorrencia, verComo)).join('')}
      </div>
    </div>
  `;
}

function cartaoCandidato(item, idOrigem, verComo) {
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
}

// Mantida para quem chega à tela apontando uma ocorrência específica (tour,
// links): não há mais nada a "abrir" — só levar o operador até o cartão.
function abrirVerificacao(idOrigem) {
  const item = document.getElementById(`oc-${idOrigem}`);
  if (item) item.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  renderizarLista();
  mostrarFeedbackVinculo(idOrigem, idCandidata, idEvento);
}

function mostrarFeedbackVinculo(idOrigem, idCandidata, idEvento) {
  const destino = document.getElementById(`feedback-${idOrigem}`);
  if (!destino) return;
  destino.innerHTML = `
    <div class="confirmacao-cadastro">
      Vinculado a ${escaparHtml(idCandidata)}.
      <a href="evento.html?evento=${encodeURIComponent(idEvento)}">Ver evento</a>
    </div>
  `;
  destino.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  renderizarLista();
  abrirVerificacao(idOrigem);
}
