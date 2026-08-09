/*
 * Tela do atendente — HU02.1/HU02.2 do documento de visão. O painel lateral
 * carrega de forma assíncrona (setTimeout simulando os ~800 ms de NFR-01) e
 * "Concluir cadastro" nunca espera por ele: é a demonstração literal de P1.
 */

// `abertura` é fixo (mesma data-base de `dados.js`, 2026-08-06), não o horário
// real do navegador (achado 2.4 da UX review) — se usasse `new Date()`, a
// busca por candidatos nunca bateria com a massa de dados semeada assim que o
// relógio real se afastasse mais de 30 min (RN-04) de 2026-08-06, e o painel
// pareceria vazio para sempre. Cada horário abaixo foi escolhido para cair
// dentro da janela de algum caso plantado em dados.js:
const ENDERECOS_CONHECIDOS = [
  {
    rotulo: 'EPTG KM 5, sentido Plano Piloto (Taguatinga)',
    geo: { lat: -15.7801, lon: -47.9292, precisao_m: 45, fonte: 'GEOCODIFICADO' },
    regiao_administrativa: 'TAGUATINGA',
    endereco_normalizado: 'EPTG KM 5 SENTIDO PLANO PILOTO',
    abertura: '2026-08-06T14:24:00-03:00', // entre o cluster EPTG (14:22-14:25) e a armadilha (14:40)
  },
  {
    rotulo: 'SQN 208 Bloco C (Asa Norte)',
    geo: { lat: -15.7797, lon: -47.8898, precisao_m: 20, fonte: 'GEOCODIFICADO' },
    regiao_administrativa: 'ASA NORTE',
    endereco_normalizado: 'SQN 208 BLOCO C',
    abertura: '2026-08-06T09:18:00-03:00', // entre a ocorrência encerrada (09:10) e a aberta (09:22), RN-10
  },
  {
    rotulo: 'Ceilândia Centro, próximo à feira (endereço impreciso)',
    geo: { lat: -15.8198, lon: -48.1075, precisao_m: 900, fonte: 'RA_INFORMADA' },
    regiao_administrativa: 'CEILÂNDIA',
    endereco_normalizado: 'CEILÂNDIA CENTRO, PRÓXIMO À FEIRA',
    abertura: '2026-08-06T11:08:00-03:00', // entre o par de baixa precisão (11:05 e 11:11), RN-11
  },
  {
    rotulo: 'Quadra 302, Recanto das Emas',
    geo: { lat: -15.901, lon: -48.0608, precisao_m: 25, fonte: 'GEOCODIFICADO' },
    regiao_administrativa: 'RECANTO DAS EMAS',
    endereco_normalizado: 'QUADRA 302 RECANTO DAS EMAS',
    abertura: '2026-08-06T20:17:00-03:00', // entre a ocorrência sigilosa (20:15) e a vizinha (20:19), RN-13
  },
  {
    rotulo: 'W3 Sul, próximo à 508 Sul (Asa Sul)',
    geo: { lat: -15.827, lon: -47.921, precisao_m: 30, fonte: 'GEOCODIFICADO' },
    regiao_administrativa: 'ASA SUL',
    endereco_normalizado: 'W3 SUL PRÓXIMO À 508 SUL',
    abertura: '2026-08-06T15:30:00-03:00', // longe do ruído de fundo gerado em Asa Sul (~07:00/07:58) — mantém um caso real de "nada encontrado"
  },
];

let carregandoPainel = false;
let ultimaBuscaId = 0;

document.addEventListener('DOMContentLoaded', () => {
  montarCabecalho('atendente');
  popularEnderecos();

  document.getElementById('campoEndereco').addEventListener('change', tentarBuscarCandidatos);
  document.getElementById('campoTipo').addEventListener('change', tentarBuscarCandidatos);
  document.getElementById('formCadastro').addEventListener('submit', concluirCadastro);
  window.addEventListener('motorAlterado', tentarBuscarCandidatos);

  // Camada P2 — transferência de ligação com contexto
  if (ESTADO.obterCamadas().p2) {
    const btnTransferir = document.getElementById('btnTransferir');
    btnTransferir.hidden = false;
    btnTransferir.addEventListener('click', transferirComContexto);
    renderizarBannerTransferencia();
  }
});

// ---------------------------------------------------------------------
// Camada P2 — o pacote de contexto viaja junto com a transferência da
// chamada: a central de destino continua a triagem de onde parou.
// ---------------------------------------------------------------------

const DESTINO_TRANSFERENCIA = { CBMDF: 'SAMU', SAMU: 'CBMDF', PMDF: 'CBMDF' };

async function transferirComContexto() {
  const endereco = enderecoSelecionado();
  const tipo = document.getElementById('campoTipo').value;
  const confirmacao = document.getElementById('confirmacao');

  if (!endereco || !tipo) {
    confirmacao.innerHTML =
      '<div class="confirmacao-cadastro" style="background:var(--alerta-bg);color:var(--alerta)">Selecione endereço e tipo antes de transferir — é esse contexto que viaja com a ligação.</div>';
    return;
  }

  const orgaoOrigem = ESTADO.obterVerComo();
  const orgaoDestino = DESTINO_TRANSFERENCIA[orgaoOrigem];

  const confirmado = await confirmarAcao({
    titulo: `Transferir ligação ao ${orgaoDestino}`,
    mensagem: `A chamada será transferida ao ${orgaoDestino} levando junto o pacote de contexto (endereço, tipo, telefone e relato já colhidos). A triagem continua de onde parou — o cidadão não reconta nada (P2).`,
    textoConfirmar: 'Transferir com contexto',
  });
  if (!confirmado) return;

  ESTADO.criarTransferencia({
    orgaoOrigem,
    orgaoDestino,
    enderecoIndice: Number(document.getElementById('campoEndereco').value),
    tipo,
    telefone: document.getElementById('campoTelefone').value.trim(),
    resumo: document.getElementById('campoResumo').value.trim(),
    hora: endereco.abertura,
  });

  confirmacao.innerHTML = `<div class="confirmacao-cadastro">📞 Ligação transferida ao ${orgaoDestino} com contexto às ${formatarHora(endereco.abertura)}. Troque "Ver como" para ${orgaoDestino} no cabeçalho para assumir a triagem na central de destino.</div>`;
  document.getElementById('formCadastro').reset();
  tentarBuscarCandidatos();
}

function renderizarBannerTransferencia() {
  const verComo = ESTADO.obterVerComo();
  const pendente = ESTADO.obterTransferenciaPendente(verComo);
  const destino = document.getElementById('bannerTransferencia');
  if (!pendente) {
    destino.innerHTML = '';
    return;
  }
  destino.innerHTML = `
    <div class="banner-transferencia" role="status">
      <div class="texto">
        📞 <strong>Ligação transferida do ${escaparHtml(pendente.orgaoOrigem)} com contexto</strong> às
        ${formatarHora(pendente.hora)} — endereço, tipo e relato já colhidos viajaram junto.
        O cidadão não precisa recontar (P2).
      </div>
      <button type="button" class="btn btn-primary" id="btnAssumirTransferencia">Assumir triagem</button>
    </div>
  `;
  document.getElementById('btnAssumirTransferencia').addEventListener('click', () => assumirTriagem(pendente));
}

function assumirTriagem(transferencia) {
  document.getElementById('campoEndereco').value = String(transferencia.enderecoIndice);
  document.getElementById('campoTipo').value = transferencia.tipo;
  document.getElementById('campoTelefone').value = transferencia.telefone || '';
  const prefixo = `(via transferência do ${transferencia.orgaoOrigem}, contexto recebido às ${formatarHora(transferencia.hora)}) `;
  document.getElementById('campoResumo').value = prefixo + (transferencia.resumo || '');
  ESTADO.assumirTransferencia(transferencia.id);
  document.getElementById('bannerTransferencia').innerHTML =
    '<div class="confirmacao-cadastro">Contexto carregado — a triagem continua de onde parou. Revise os dados e conclua o cadastro.</div>';
  tentarBuscarCandidatos();
}

function popularEnderecos() {
  const select = document.getElementById('campoEndereco');
  ENDERECOS_CONHECIDOS.forEach((end, indice) => {
    const opcao = document.createElement('option');
    opcao.value = String(indice);
    opcao.textContent = end.rotulo;
    select.appendChild(opcao);
  });
}

function enderecoSelecionado() {
  const indice = document.getElementById('campoEndereco').value;
  return indice === '' ? null : ENDERECOS_CONHECIDOS[Number(indice)];
}

function tentarBuscarCandidatos() {
  const endereco = enderecoSelecionado();
  const tipo = document.getElementById('campoTipo').value;
  const destino = document.getElementById('conteudoPainelLateral');

  if (!endereco || !tipo) {
    destino.innerHTML = '<p class="aviso-vazio">Selecione o endereço e o tipo para carregar candidatos.</p>';
    return;
  }

  const idBusca = ++ultimaBuscaId;
  carregandoPainel = true;
  destino.innerHTML = '<div class="painel-carregando"><div class="spinner"></div> Carregando ocorrências próximas…</div>';

  setTimeout(() => {
    if (idBusca !== ultimaBuscaId) return; // uma busca mais nova já está em andamento
    carregandoPainel = false;

    const rascunho = {
      id_ocorrencia: '__RASCUNHO__',
      id_evento: '__RASCUNHO__',
      orgao: ESTADO.obterVerComo(),
      tipo_canonico: tipo,
      abertura: endereco.abertura,
      geo: endereco.geo,
      regiao_administrativa: endereco.regiao_administrativa,
    };

    const resultado = MOTOR.buscarCandidatos(rascunho, ESTADO.obterOcorrencias(), {
      motorLigado: ESTADO.obterMotorLigado(),
      descartados: ESTADO.obterDescartadosComoSet(),
    });

    renderizarCandidatosAtendente(resultado, destino);
  }, 800);
}

function renderizarCandidatosAtendente(resultado, destino) {
  if (resultado.candidatos.length === 0) {
    destino.innerHTML = '<p class="aviso-vazio">Nenhuma ocorrência de outro órgão encontrada nas proximidades e no horário.</p>';
    return;
  }

  destino.innerHTML = resultado.candidatos
    .map((item) => {
      const o = item.candidata;
      const suprimir = o.sigiloso && o.orgao !== ESTADO.obterVerComo();
      return `
        <div class="card-candidato">
          <div class="card-candidato-cabeco">
            ${tagOrgao(o.orgao)}
            ${badgeStatus(o.status)}
            ${suprimir ? '' : badgeRegulacao(o)}
            ${badgeScore(item.score, item.baixaConfianca)}
          </div>
          <div class="endereco">${suprimir ? 'Endereço reservado' : escaparHtml(o.endereco_normalizado)}</div>
          <div class="motivo">${escaparHtml(item.motivo)} · aberta às ${formatarHora(o.abertura)}</div>
        </div>
      `;
    })
    .join('');
}

function concluirCadastro(evento) {
  evento.preventDefault();

  const endereco = enderecoSelecionado();
  const tipo = document.getElementById('campoTipo').value;
  const telefone = document.getElementById('campoTelefone').value.trim();
  const resumo = document.getElementById('campoResumo').value.trim();
  const orgao = ESTADO.obterVerComo();

  const confirmacao = document.getElementById('confirmacao');

  if (!endereco || !tipo) {
    confirmacao.innerHTML = '<div class="confirmacao-cadastro" style="background:var(--alerta-bg);color:var(--alerta)">Selecione endereço e tipo antes de concluir.</div>';
    return;
  }

  const agora = endereco.abertura;
  const idNovo = `${orgao}-2026-DEMO${Date.now().toString().slice(-6)}`;
  const nova = {
    id_ocorrencia: idNovo,
    orgao,
    sistema_origem: SISTEMA_POR_ORGAO[orgao],
    status: 'EM_ANDAMENTO',
    abertura: agora,
    atualizacao: agora,
    tipo_canonico: tipo,
    tipo_origem: document.getElementById('campoTipo').selectedOptions[0].textContent,
    geo: endereco.geo,
    endereco_normalizado: endereco.endereco_normalizado,
    regiao_administrativa: endereco.regiao_administrativa,
    hash_telefone_solicitante: telefone ? hashFalso(telefone) : hashFalso('anonimo-' + idNovo),
    resumo: resumo || '(sem resumo informado)',
    sigiloso: false,
  };

  ESTADO.adicionarOcorrencia(nova);

  const avisoAssincrono = carregandoPainel
    ? ' O painel ao lado ainda estava carregando — o cadastro foi concluído mesmo assim (princípio P1).'
    : '';

  confirmacao.innerHTML = `<div class="confirmacao-cadastro">Cadastro ${idNovo} concluído às ${formatarHora(agora)}.${avisoAssincrono}</div>`;
  document.getElementById('formCadastro').reset();
}
