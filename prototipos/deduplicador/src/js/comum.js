/*
 * Estado compartilhado, cabeçalho e utilitários comuns às três telas do
 * protótipo. Persistência em localStorage — não há backend. Depende de
 * dados.js já carregado (SEED_OCORRENCIAS, IDS_DEMO).
 */

const ESTADO = (function () {
  const CHAVE = 'e360_dedup_prototipo_v1';

  function estadoPadrao() {
    return {
      ocorrencias: JSON.parse(JSON.stringify(SEED_OCORRENCIAS)),
      motorLigado: true,
      verComo: 'CBMDF',
      auditoria: [],
      descartes: [],
      camadas: { p2: true, p3: true, p4: true },
      transferencias: [],
      contrarregulacoes: [],
      simulacaoP4Feita: false,
    };
  }

  function carregar() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (!bruto) return estadoPadrao();
      const dado = JSON.parse(bruto);
      if (!dado.ocorrencias || !Array.isArray(dado.ocorrencias)) return estadoPadrao();
      // Migração suave: estados salvos antes das camadas P2/P3/P4 ganham os
      // campos novos sem perder vínculos, descartes e cadastros da sessão.
      if (!dado.camadas) dado.camadas = { p2: true, p3: true, p4: true };
      if (!Array.isArray(dado.transferencias)) dado.transferencias = [];
      if (!Array.isArray(dado.contrarregulacoes)) dado.contrarregulacoes = [];
      if (typeof dado.simulacaoP4Feita !== 'boolean') dado.simulacaoP4Feita = false;
      dado.ocorrencias.forEach((o) => {
        if (o.orgao === 'SAMU' && !o.regulacao) {
          const definida = ['DESPACHADA', 'A_CAMINHO', 'ENCERRADA'].includes(o.status);
          o.regulacao = definida ? 'DEFINIDA' : 'EM_REGULACAO';
          o.recurso_regulado = definida ? (o.tipo_canonico === 'ACIDENTE_TRANSITO' ? 'USA' : 'USB') : null;
        }
      });
      return dado;
    } catch (e) {
      return estadoPadrao();
    }
  }

  function salvar(estado) {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  }

  function reiniciar() {
    localStorage.removeItem(CHAVE);
    window.location.reload();
  }

  function obterOcorrencias() {
    return carregar().ocorrencias;
  }

  function obterOcorrenciaPorId(id) {
    return obterOcorrencias().find((o) => o.id_ocorrencia === id) || null;
  }

  function obterOcorrenciasDoEvento(idEvento) {
    return obterOcorrencias().filter((o) => o.id_evento === idEvento);
  }

  function obterEventosMultiOrgao() {
    const lista = obterOcorrencias();
    const grupos = {};
    lista.forEach((o) => {
      (grupos[o.id_evento] = grupos[o.id_evento] || []).push(o);
    });
    return Object.keys(grupos)
      .map((idEvento) => grupos[idEvento])
      .filter((grupo) => grupo.length > 1)
      .sort((a, b) => new Date(b[0].abertura) - new Date(a[0].abertura));
  }

  function registrarAuditoria(acao, detalhes) {
    const estado = carregar();
    estado.auditoria.unshift({
      acao,
      detalhes,
      verComo: estado.verComo,
      data: new Date().toISOString(),
    });
    salvar(estado);
  }

  function vincular(idA, idB) {
    const estado = carregar();
    const lista = estado.ocorrencias;
    const a = lista.find((o) => o.id_ocorrencia === idA);
    const b = lista.find((o) => o.id_ocorrencia === idB);
    if (!a || !b) return;

    const eventoJaCompartilhado = (idEvento) => lista.filter((o) => o.id_evento === idEvento).length > 1;
    let alvo;
    if (eventoJaCompartilhado(a.id_evento)) alvo = a.id_evento;
    else if (eventoJaCompartilhado(b.id_evento)) alvo = b.id_evento;
    else alvo = 'ev_' + idA.toLowerCase().replace(/[^a-z0-9]/g, '');

    a.id_evento = alvo;
    b.id_evento = alvo;
    salvar(estado);
    registrarAuditoria('VINCULO', { origem: idA, candidata: idB, id_evento: alvo });
    return alvo;
  }

  function desvincular(idOcorrencia, justificativa) {
    const estado = carregar();
    const o = estado.ocorrencias.find((x) => x.id_ocorrencia === idOcorrencia);
    if (!o) return;
    const idEventoAnterior = o.id_evento;
    o.id_evento = o.id_ocorrencia;
    salvar(estado);
    registrarAuditoria('DESVINCULO', { ocorrencia: idOcorrencia, id_evento_anterior: idEventoAnterior, justificativa });
  }

  function adicionarOcorrencia(ocorrencia) {
    const estado = carregar();
    ocorrencia.id_evento = ocorrencia.id_ocorrencia;
    estado.ocorrencias.push(ocorrencia);
    salvar(estado);
    registrarAuditoria('CADASTRO', { id_ocorrencia: ocorrencia.id_ocorrencia });
  }

  function descartar(idOrigem, idCandidata, motivo) {
    const estado = carregar();
    estado.descartes.push({ origem: idOrigem, candidata: idCandidata, motivo, data: new Date().toISOString() });
    salvar(estado);
    registrarAuditoria('DESCARTE', { origem: idOrigem, candidata: idCandidata, motivo });
  }

  function obterDescartadosComoSet() {
    return new Set(carregar().descartes.map((d) => d.origem + '::' + d.candidata));
  }

  function obterMotorLigado() {
    return carregar().motorLigado;
  }

  function definirMotorLigado(valor) {
    const estado = carregar();
    estado.motorLigado = valor;
    salvar(estado);
  }

  function obterVerComo() {
    return carregar().verComo;
  }

  function definirVerComo(orgao) {
    const estado = carregar();
    estado.verComo = orgao;
    salvar(estado);
  }

  // ── Camadas de integração (P2/P3/P4) ─────────────────────────────────

  function obterCamadas() {
    return carregar().camadas;
  }

  function definirCamada(nome, valor) {
    const estado = carregar();
    estado.camadas[nome] = valor;
    salvar(estado);
  }

  // ── P2: transferência de ligação com contexto ────────────────────────

  function criarTransferencia(pacote) {
    const estado = carregar();
    const transferencia = Object.assign({ id: 'tr_' + Date.now(), status: 'PENDENTE' }, pacote);
    estado.transferencias.push(transferencia);
    salvar(estado);
    registrarAuditoria('TRANSFERENCIA_ENVIADA', {
      id: transferencia.id,
      de: transferencia.orgaoOrigem,
      para: transferencia.orgaoDestino,
    });
    return transferencia;
  }

  function obterTransferenciaPendente(orgao) {
    return carregar().transferencias.find((t) => t.status === 'PENDENTE' && t.orgaoDestino === orgao) || null;
  }

  function assumirTransferencia(id) {
    const estado = carregar();
    const t = estado.transferencias.find((x) => x.id === id);
    if (!t) return;
    t.status = 'ASSUMIDA';
    salvar(estado);
    registrarAuditoria('TRANSFERENCIA_ASSUMIDA', { id, por: estado.verComo });
  }

  // ── P4: contra-regulação com notificação ─────────────────────────────

  function registrarContrarregulacao(dados) {
    const estado = carregar();
    const o = estado.ocorrencias.find((x) => x.id_ocorrencia === dados.idOcorrencia);
    if (!o) return;
    o.regulacao = 'DEFINIDA';
    o.recurso_regulado = dados.para;
    const notificacao = {
      id: 'cr_' + Date.now(),
      idOcorrencia: dados.idOcorrencia,
      orgaoOrigem: o.orgao,
      de: dados.de,
      para: dados.para,
      motivo: dados.motivo || '',
      hora: new Date().toISOString(),
      cientes: [],
    };
    estado.contrarregulacoes.push(notificacao);
    salvar(estado);
    registrarAuditoria('CONTRARREGULACAO', { ocorrencia: dados.idOcorrencia, de: dados.de, para: dados.para });
    return notificacao;
  }

  function obterContrarregulacoesPendentes(orgao) {
    return carregar().contrarregulacoes.filter((n) => n.orgaoOrigem !== orgao && !n.cientes.includes(orgao));
  }

  function darCienciaContrarregulacao(id, orgao) {
    const estado = carregar();
    const n = estado.contrarregulacoes.find((x) => x.id === id);
    if (!n || n.cientes.includes(orgao)) return;
    n.cientes.push(orgao);
    salvar(estado);
    registrarAuditoria('CIENCIA_CONTRARREGULACAO', { notificacao: id, orgao });
  }

  function simulacaoP4Feita() {
    return carregar().simulacaoP4Feita;
  }

  function marcarSimulacaoP4() {
    const estado = carregar();
    estado.simulacaoP4Feita = true;
    salvar(estado);
  }

  return {
    obterOcorrencias,
    obterOcorrenciaPorId,
    obterOcorrenciasDoEvento,
    obterEventosMultiOrgao,
    vincular,
    desvincular,
    adicionarOcorrencia,
    descartar,
    obterDescartadosComoSet,
    obterMotorLigado,
    definirMotorLigado,
    obterVerComo,
    definirVerComo,
    obterCamadas,
    definirCamada,
    criarTransferencia,
    obterTransferenciaPendente,
    assumirTransferencia,
    registrarContrarregulacao,
    obterContrarregulacoesPendentes,
    darCienciaContrarregulacao,
    simulacaoP4Feita,
    marcarSimulacaoP4,
    reiniciar,
    registrarAuditoria,
  };
})();

// ---------------------------------------------------------------------
// Utilitários de formatação e apresentação
// ---------------------------------------------------------------------

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto == null ? '' : String(texto);
  return div.innerHTML;
}

function formatarDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarDistancia(m) {
  if (m === null || m === undefined) return '—';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

const ROTULO_STATUS = {
  EM_ANDAMENTO: 'Em andamento',
  DESPACHADA: 'Despachada',
  A_CAMINHO: 'A caminho',
  ENCERRADA: 'Encerrada',
};

const ROTULO_TIPO = {
  ACIDENTE_TRANSITO: 'Acidente de trânsito',
  INCENDIO_EDIFICACAO: 'Incêndio em edificação',
  MAL_SUBITO: 'Mal súbito / clínico',
  PARTO: 'Parto de emergência',
  INCENDIO_FLORESTAL: 'Incêndio florestal',
  RESERVADO: 'Reservado',
};

function labelTipo(tipo) {
  return ROTULO_TIPO[tipo] || tipo;
}

function tagOrgao(orgao) {
  return `<span class="tag-orgao tag-${orgao.toLowerCase()}">${orgao}</span>`;
}

function badgeStatus(status) {
  const rotulo = ROTULO_STATUS[status] || status;
  const classe = status === 'ENCERRADA' ? 'badge-encerrada' : 'badge-ativa';
  return `<span class="badge-status ${classe}">${rotulo}</span>`;
}

function badgeVinculo(qtdOutras) {
  const rotulo = qtdOutras === 1 ? '1 ocorrência' : `${qtdOutras} ocorrências`;
  return `<span class="badge-status badge-vinculado">Vinculada · ${rotulo}</span>`;
}

// Camada P3 — status da regulação médica exposto às demais centrais. A
// decisão clínica permanece no SAU: aqui viaja só o estado, nunca o conteúdo.
function badgeRegulacao(o) {
  if (!o || !o.regulacao || !ESTADO.obterCamadas().p3) return '';
  const definida = o.regulacao === 'DEFINIDA';
  const rotulo = definida
    ? `Regulação definida${o.recurso_regulado ? ' · ' + o.recurso_regulado : ''}`
    : 'Em regulação médica';
  const classe = definida ? 'badge-reg-definida' : 'badge-reg-andamento';
  return `<span class="badge-regulacao ${classe}" title="P3 — status da regulação exposto pela plataforma; a decisão clínica permanece no SAU">${rotulo}</span>`;
}

function badgeScore(score, baixaConfianca) {
  if (baixaConfianca) return '<span class="badge-score badge-score-baixa-confianca">Baixa confiança de localização</span>';
  if (score === null || score === undefined) return '<span class="badge-score badge-score-nulo">— (motor desligado)</span>';
  const banda = MOTOR.bandaScore(score);
  const classe = banda === 'forte' ? 'badge-score-forte' : 'badge-score-fraca';
  const rotulo = banda === 'forte' ? 'Sugestão forte' : 'Sugestão fraca';
  return `<span class="badge-score ${classe}">${rotulo} · ${score.toFixed(2)}</span>`;
}

// ---------------------------------------------------------------------
// Modal genérico — substitui confirm()/prompt()/alert() nativos do
// navegador, que quebram a identidade visual da tela e empilham diálogos
// bloqueantes (ex.: prompt + alert em sequência para desvincular). Baseado
// em <dialog> nativo para herdar de graça foco preso, fechamento por Esc e
// backdrop — sem reimplementar isso à mão.
// ---------------------------------------------------------------------

function garantirModal() {
  if (document.getElementById('modalPrototipo')) return;
  const dialogo = document.createElement('dialog');
  dialogo.id = 'modalPrototipo';
  dialogo.className = 'modal-prototipo';
  dialogo.setAttribute('aria-labelledby', 'modalTitulo');
  dialogo.setAttribute('aria-describedby', 'modalMensagem');
  dialogo.innerHTML = `
    <form method="dialog" id="modalForm">
      <h2 id="modalTitulo"></h2>
      <p id="modalMensagem"></p>
      <div class="input-group" id="modalCampoWrap" hidden>
        <label for="modalCampo" id="modalCampoLabel"></label>
        <textarea id="modalCampo"></textarea>
        <p class="modal-erro" id="modalErro" hidden>Este campo é obrigatório.</p>
      </div>
      <div class="modal-acoes">
        <button type="button" class="btn btn-descartar" id="modalCancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="modalConfirmar">Confirmar</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialogo);
}

/**
 * @param {object} opcoes
 * @param {string} opcoes.titulo
 * @param {string} opcoes.mensagem
 * @param {string|null} [opcoes.campo] - rótulo do campo de texto; omitido = confirmação simples
 * @param {boolean} [opcoes.obrigatorio] - só relevante quando `campo` é informado
 * @param {string} [opcoes.textoConfirmar]
 * @param {string} [opcoes.textoCancelar]
 * @param {boolean} [opcoes.variantePerigo] - estilo de ação sensível (vermelho) no botão de confirmar
 * @returns {Promise<boolean|string|null>} true/false para confirmação simples; texto ou null (cancelado) quando há campo
 */
function abrirModal(opcoes) {
  garantirModal();
  const dialogo = document.getElementById('modalPrototipo');
  const campoWrap = document.getElementById('modalCampoWrap');
  const campoInput = document.getElementById('modalCampo');
  const erro = document.getElementById('modalErro');
  const btnConfirmar = document.getElementById('modalConfirmar');
  const btnCancelar = document.getElementById('modalCancelar');
  const form = document.getElementById('modalForm');

  document.getElementById('modalTitulo').textContent = opcoes.titulo;
  document.getElementById('modalMensagem').textContent = opcoes.mensagem;
  campoWrap.hidden = !opcoes.campo;
  erro.hidden = true;
  campoInput.value = '';
  if (opcoes.campo) document.getElementById('modalCampoLabel').textContent = opcoes.campo;

  btnConfirmar.textContent = opcoes.textoConfirmar || 'Confirmar';
  btnConfirmar.classList.toggle('btn-desvincular', !!opcoes.variantePerigo);
  btnConfirmar.classList.toggle('btn-primary', !opcoes.variantePerigo);
  btnCancelar.textContent = opcoes.textoCancelar || 'Cancelar';

  return new Promise((resolve) => {
    function finalizar(valor) {
      form.removeEventListener('submit', aoSubmeter);
      btnCancelar.removeEventListener('click', aoCancelarClique);
      dialogo.removeEventListener('cancel', aoCancelarNativo);
      resolve(valor);
    }
    function aoSubmeter(ev) {
      ev.preventDefault();
      if (opcoes.campo && opcoes.obrigatorio && campoInput.value.trim() === '') {
        erro.hidden = false;
        campoInput.focus();
        return;
      }
      dialogo.close();
      finalizar(opcoes.campo ? campoInput.value.trim() : true);
    }
    function aoCancelarClique() {
      dialogo.close();
      finalizar(opcoes.campo ? null : false);
    }
    function aoCancelarNativo() {
      // Esc já fecha o <dialog> nativamente; só resta resolver a promise.
      finalizar(opcoes.campo ? null : false);
    }
    form.addEventListener('submit', aoSubmeter);
    btnCancelar.addEventListener('click', aoCancelarClique);
    dialogo.addEventListener('cancel', aoCancelarNativo);
    dialogo.showModal();
    (opcoes.campo ? campoInput : btnConfirmar).focus();
  });
}

function confirmarAcao(opcoes) {
  return abrirModal(Object.assign({}, opcoes, { campo: null }));
}

function pedirTexto(opcoes) {
  return abrirModal(Object.assign({}, opcoes, { campo: opcoes.campo || 'Justificativa' }));
}

// ---------------------------------------------------------------------
// Botão de Feedback — presente em todas as telas do protótipo.
// ---------------------------------------------------------------------

// TODO: inserir aqui o link do formulário de feedback (ex.: Google Forms).
// Enquanto vazio, o botão informa que o formulário será disponibilizado.
const LINK_FORMULARIO_FEEDBACK = '';

function montarBotaoFeedback() {
  if (document.getElementById('fabFeedback')) return;
  const botao = document.createElement('a');
  botao.id = 'fabFeedback';
  botao.className = 'fab-feedback';
  botao.innerHTML = '💬 <span>Feedback</span>';
  if (LINK_FORMULARIO_FEEDBACK) {
    botao.href = LINK_FORMULARIO_FEEDBACK;
    botao.target = '_blank';
    botao.rel = 'noopener';
  } else {
    botao.href = '#';
    botao.addEventListener('click', (ev) => {
      ev.preventDefault();
      confirmarAcao({
        titulo: 'Feedback do protótipo',
        mensagem: 'O formulário de feedback será disponibilizado em breve. Enquanto isso, registre suas observações com a coordenação do projeto durante a sessão de demonstração.',
        textoConfirmar: 'Entendi',
        textoCancelar: 'Fechar',
      });
    });
  }
  document.body.appendChild(botao);
}

// ---------------------------------------------------------------------
// Camada P4 — alertas de contra-regulação. Aparecem dentro da própria tela
// (princípio "substituir canal, não somar"): nenhuma janela ou som extra,
// um cartão fixo com exigência de ciência explícita do operador.
// ---------------------------------------------------------------------

function montarAlertasContrarregulacao() {
  const orgao = ESTADO.obterVerComo();
  let container = document.getElementById('alertasContrarreg');
  if (!container) {
    container = document.createElement('div');
    container.id = 'alertasContrarreg';
    container.className = 'alertas-contrarreg';
    container.setAttribute('aria-live', 'assertive');
    document.body.appendChild(container);
  }
  if (!ESTADO.obterCamadas().p4) {
    container.innerHTML = '';
    return;
  }
  const pendentes = ESTADO.obterContrarregulacoesPendentes(orgao);
  container.innerHTML = pendentes
    .map((n) => {
      const o = ESTADO.obterOcorrenciaPorId(n.idOcorrencia);
      const endereco = o ? escaparHtml(o.endereco_normalizado) : n.idOcorrencia;
      return `
        <div class="toast-contrarreg" role="alert">
          <div class="toast-contrarreg-titulo">⚠ Contra-regulação — ${escaparHtml(n.idOcorrencia)}</div>
          <div class="toast-contrarreg-corpo">
            ${endereco}<br>
            Recurso regulado alterado de <strong>${escaparHtml(n.de)}</strong> para
            <strong>${escaparHtml(n.para)}</strong>.
            ${n.motivo ? '<br>' + escaparHtml(n.motivo) : ''}
          </div>
          <button type="button" class="btn btn-primary btn-ciencia" onclick="darCienciaContrarreg('${n.id}')">Ciente</button>
        </div>
      `;
    })
    .join('');
}

function darCienciaContrarreg(idNotificacao) {
  ESTADO.darCienciaContrarregulacao(idNotificacao, ESTADO.obterVerComo());
  montarAlertasContrarregulacao();
  // As listas exibem o recurso regulado (P3) — re-renderiza a tela que tiver.
  if (typeof renderizarLista === 'function') renderizarLista();
  if (typeof renderizarListaEventos === 'function') renderizarListaEventos();
}

// Demonstração automática do P4: alguns segundos depois de abrir qualquer
// tela, o médico regulador (simulado) contra-regula a ocorrência do cluster
// EPTG — a notificação chega às demais centrais sem nenhuma ação do usuário.
function agendarSimulacaoContrarregulacao() {
  if (!ESTADO.obterCamadas().p4 || ESTADO.simulacaoP4Feita()) return;
  setTimeout(() => {
    if (ESTADO.simulacaoP4Feita()) return;
    ESTADO.marcarSimulacaoP4();
    ESTADO.registrarContrarregulacao({
      idOcorrencia: IDS_DEMO.clusterSamu,
      de: 'USB',
      para: 'USA',
      motivo: 'Reavaliação do médico regulador: vítima evoluiu com instabilidade (demonstração).',
    });
    montarAlertasContrarregulacao();
  }, 6000);
}

// ---------------------------------------------------------------------
// Cabeçalho compartilhado
// ---------------------------------------------------------------------

const INICIAIS_ORGAO = { CBMDF: 'CB', SAMU: 'SA', PMDF: 'PM' };

function montarCabecalho(paginaAtual) {
  const alvo = document.getElementById('cabecalho');
  if (!alvo) return;

  garantirModal();
  const verComo = ESTADO.obterVerComo();
  const motorLigado = ESTADO.obterMotorLigado();
  const camadas = ESTADO.obterCamadas();

  // Reskin por órgão — a casca da tela (cor, marca) segue quem está "vendo",
  // não o dono dos registros exibidos nela (isso continua nas tags dos
  // cartões). Ver style.css, blocos :root[data-orgao=...].
  document.documentElement.dataset.orgao = verComo;

  alvo.innerHTML = `
    <div class="watermark-banner">PROTÓTIPO — DADOS FICTÍCIOS</div>
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-mark">${INICIAIS_ORGAO[verComo] || 'E360'}</div>
          <div class="brand-title">
            <strong>Estação Integrada</strong>
            <span>Protótipo de demonstração — Emergência 360</span>
          </div>
        </div>
        <nav class="nav-links">
          <a href="index.html" class="${paginaAtual === 'atendente' ? 'ativo' : ''}">Atendente</a>
          <a href="despachante.html" class="${paginaAtual === 'despachante' ? 'ativo' : ''}">Despachante</a>
          <a href="evento.html" class="${paginaAtual === 'evento' ? 'ativo' : ''}">Eventos vinculados</a>
        </nav>
        <div class="controles">
          <label class="controle">
            Ver como
            <select id="seletorOrgao">
              <option value="CBMDF" ${verComo === 'CBMDF' ? 'selected' : ''}>CBMDF</option>
              <option value="SAMU" ${verComo === 'SAMU' ? 'selected' : ''}>SAMU</option>
              <option value="PMDF" ${verComo === 'PMDF' ? 'selected' : ''}>PMDF</option>
            </select>
          </label>
          <label class="controle controle-toggle">
            <input type="checkbox" id="toggleMotor" ${motorLigado ? 'checked' : ''}>
            Motor de similaridade
          </label>
          <div class="camadas-grupo" title="Camadas de integração em avaliação — cada uma corresponde a um processo do plano de trabalho">
            <span class="camadas-rotulo">Camadas</span>
            <label class="controle-camada"><input type="checkbox" id="camadaP2" ${camadas.p2 ? 'checked' : ''}>P2 Transferência</label>
            <label class="controle-camada"><input type="checkbox" id="camadaP3" ${camadas.p3 ? 'checked' : ''}>P3 Regulação</label>
            <label class="controle-camada"><input type="checkbox" id="camadaP4" ${camadas.p4 ? 'checked' : ''}>P4 Contra-reg.</label>
          </div>
          <button id="btnReiniciar" class="btn-secundario" type="button">Reiniciar demonstração</button>
        </div>
      </div>
      <div class="aviso-degradado" id="avisoDegradado" ${motorLigado ? 'hidden' : ''}>
        Modo degradado — motor de similaridade desligado, ordenação por horário (§4.3 do documento de visão)
      </div>
    </header>
  `;

  document.getElementById('seletorOrgao').addEventListener('change', (ev) => {
    ESTADO.definirVerComo(ev.target.value);
    window.location.reload();
  });

  document.getElementById('toggleMotor').addEventListener('change', (ev) => {
    ESTADO.definirMotorLigado(ev.target.checked);
    document.getElementById('avisoDegradado').hidden = ev.target.checked;
    window.dispatchEvent(new CustomEvent('motorAlterado', { detail: { motorLigado: ev.target.checked } }));
  });

  document.getElementById('btnReiniciar').addEventListener('click', async () => {
    const confirmado = await confirmarAcao({
      titulo: 'Reiniciar demonstração',
      mensagem: 'Isso apaga todos os vínculos, descartes e cadastros feitos nesta demonstração e restaura os dados originais. Continuar?',
      textoConfirmar: 'Reiniciar',
      textoCancelar: 'Cancelar',
      variantePerigo: true,
    });
    if (confirmado) ESTADO.reiniciar();
  });

  ['camadaP2', 'camadaP3', 'camadaP4'].forEach((idToggle) => {
    document.getElementById(idToggle).addEventListener('change', (ev) => {
      ESTADO.definirCamada(idToggle.replace('camada', '').toLowerCase(), ev.target.checked);
      window.location.reload();
    });
  });

  montarBotaoFeedback();
  montarAlertasContrarregulacao();
  agendarSimulacaoContrarregulacao();
}
