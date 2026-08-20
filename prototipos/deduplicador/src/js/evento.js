/*
 * Tela de evento vinculado — HU03.2, HU03.4. Mostra todas as ocorrências de
 * um evento lado a lado, íntegras (P2), e permite desvincular com
 * justificativa obrigatória (RN-03).
 */

let eventoSelecionado = null;

document.addEventListener('DOMContentLoaded', () => {
  montarCabecalho('evento');
  const eventoNaUrl = new URLSearchParams(window.location.search).get('evento');
  if (eventoNaUrl) eventoSelecionado = eventoNaUrl;
  renderizarListaEventos();
});

function renderizarListaEventos() {
  const grupos = ESTADO.obterEventosMultiOrgao();
  const destino = document.getElementById('listaEventos');

  if (grupos.length === 0) {
    destino.innerHTML =
      '<p class="aviso-vazio">Nenhum evento vinculado ainda. Vá à tela do <a href="despachante.html">despachante</a> e vincule duas ocorrências.</p>';
    document.getElementById('tituloEvento').textContent = 'Nenhum evento selecionado';
    document.getElementById('detalheEvento').innerHTML = '';
    return;
  }

  if (!eventoSelecionado || !grupos.some((g) => g[0].id_evento === eventoSelecionado)) {
    eventoSelecionado = grupos[0][0].id_evento;
  }

  destino.innerHTML = grupos
    .map((grupo) => {
      const idEvento = grupo[0].id_evento;
      const orgaos = [...new Set(grupo.map((o) => o.orgao))];
      const primeiraOcorrencia = grupo.slice().sort((a, b) => new Date(a.abertura) - new Date(b.abertura))[0];
      return `
        <button type="button" class="item-evento ${idEvento === eventoSelecionado ? 'ativo' : ''}" onclick="selecionarEvento('${idEvento}')">
          <strong>${escaparHtml(primeiraOcorrencia.endereco_normalizado || 'Endereço reservado')}</strong>
          <div class="meta">${grupo.length} ocorrências · aberto às ${formatarHora(primeiraOcorrencia.abertura)}</div>
          <div class="orgaos">${orgaos.map(tagOrgao).join('')}</div>
        </button>
      `;
    })
    .join('');

  renderizarDetalheEvento();
}

function selecionarEvento(idEvento) {
  eventoSelecionado = idEvento;
  renderizarListaEventos();
}

function renderizarDetalheEvento() {
  const ocorrencias = ESTADO.obterOcorrenciasDoEvento(eventoSelecionado).sort((a, b) => new Date(a.abertura) - new Date(b.abertura));
  const rotuloEvento = ocorrencias.length ? ocorrencias[0].endereco_normalizado : eventoSelecionado;
  document.getElementById('tituloEvento').textContent = `${rotuloEvento} — ${ocorrencias.length} ocorrências vinculadas`;

  const verComo = ESTADO.obterVerComo();
  const destino = document.getElementById('detalheEvento');

  const camadas = ESTADO.obterCamadas();

  destino.innerHTML = ocorrencias
    .map((o) => {
      const suprimir = o.sigiloso && o.orgao !== verComo;
      // Camada P4: contra-regular é ato do médico regulador — o botão só
      // aparece na visão SAMU, sobre ocorrências do próprio SAMU.
      const podeContrarregular = camadas.p4 && verComo === 'SAMU' && o.orgao === 'SAMU' && o.status !== 'ENCERRADA';
      const linhaRegulacao = o.regulacao && camadas.p3
        ? `<dt>Regulação</dt><dd>${badgeRegulacao(o)}</dd>`
        : '';
      return `
        <article class="cartao-ocorrencia-evento">
          <div class="card-candidato-cabeco">
            ${tagOrgao(o.orgao)}
            ${badgeStatus(o.status)}
            ${suprimir ? '' : badgeRegulacao(o)}
          </div>
          <dl>
            <dt>Identificador</dt>
            <dd>${o.id_ocorrencia}</dd>
            <dt>Endereço</dt>
            <dd class="${suprimir ? 'campo-suprimido' : ''}">${suprimir ? '🔒 Reservado' : escaparHtml(o.endereco_normalizado)}</dd>
            <dt>Tipo</dt>
            <dd>${suprimir ? '🔒 Reservado' : labelTipo(o.tipo_canonico)}</dd>
            <dt>Abertura</dt>
            <dd>${formatarDataHora(o.abertura)}</dd>
            ${linhaRegulacao}
            <dt>Resumo</dt>
            <dd class="${suprimir ? 'campo-suprimido' : ''}">${suprimir ? '🔒 Conteúdo suprimido — acesso restrito ao órgão de origem' : escaparHtml(o.resumo)}</dd>
          </dl>
          <div class="acoes" style="margin-top:12px;">
            ${podeContrarregular ? `<button class="btn btn-vincular" onclick="contrarregularDemo('${o.id_ocorrencia}')">Contra-regular</button>` : ''}
            <button class="btn btn-desvincular" onclick="desvincularOcorrencia('${o.id_ocorrencia}')">Desvincular</button>
          </div>
        </article>
      `;
    })
    .join('');
}

// Camada P4 — a contra-regulação parte do médico regulador (visão SAMU) e
// notifica em tempo real as centrais com recurso empenhado na ocorrência.
async function contrarregularDemo(idOcorrencia) {
  const o = ESTADO.obterOcorrenciaPorId(idOcorrencia);
  if (!o) return;
  const de = o.recurso_regulado || 'USB';
  const para = de === 'USA' ? 'USB' : 'USA';
  const confirmado = await confirmarAcao({
    titulo: 'Contra-regulação',
    mensagem: `Alterar o recurso regulado de ${de} para ${para}? As outras centrais que já enviaram equipe para esta ocorrência serão avisadas na hora. Para ver o aviso chegar, escolha CBMDF ou PMDF no cabeçalho depois de contra-regular.`,
    textoConfirmar: 'Contra-regular',
  });
  if (!confirmado) return;
  ESTADO.registrarContrarregulacao({
    idOcorrencia,
    de,
    para,
    motivo: 'Reavaliação do médico regulador.',
  });
  renderizarListaEventos();
  montarAlertasContrarregulacao();
}

async function desvincularOcorrencia(idOcorrencia) {
  const justificativa = await pedirTexto({
    titulo: 'Desvincular ocorrência',
    mensagem: 'Por que estas ocorrências não são o mesmo evento? A justificativa é obrigatória e fica registrada.',
    campo: 'Justificativa',
    obrigatorio: true,
    textoConfirmar: 'Desvincular',
    variantePerigo: true,
  });
  if (justificativa === null) return; // cancelou
  ESTADO.desvincular(idOcorrencia, justificativa);
  renderizarListaEventos();
}
