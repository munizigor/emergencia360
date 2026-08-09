/*
 * Massa de dados sintética do protótipo — Painel de Ocorrências Correlatas.
 * Todos os registros, nomes e coordenadas são fictícios. Nenhum dado real de
 * ocorrência, vítima ou solicitante é usado aqui.
 *
 * Campos seguem o contrato ICO v1 do documento de visão (§4.1), com três
 * extensões só de protótipo: `regiao_administrativa` (usada no fallback de
 * baixa precisão, RN-11), `sigiloso` (RN-13) e `id_evento` (inicialmente
 * igual ao próprio id_ocorrencia — nenhum registro "não deduplicado" existe,
 * como o documento de visão descreve em §4.1).
 */

function hashFalso(texto) {
  let soma = 0;
  for (let i = 0; i < texto.length; i++) soma = (soma * 31 + texto.charCodeAt(i)) >>> 0;
  return 'sha256:' + soma.toString(16).padStart(8, '0') + '… (simulado)';
}

const SISTEMA_POR_ORGAO = { CBMDF: 'HEFESTO', SAMU: 'SAU', PMDF: 'PMDF-COPOM' };

function novaOcorrencia(campos) {
  const base = {
    sistema_origem: SISTEMA_POR_ORGAO[campos.orgao],
    atualizacao: campos.abertura,
    hash_telefone_solicitante: hashFalso(campos.id_ocorrencia + campos.abertura),
    sigiloso: false,
  };
  const ocorrencia = Object.assign(base, campos);
  ocorrencia.id_evento = ocorrencia.id_ocorrencia;
  // Camada P3: toda ocorrência do SAMU carrega o estado da regulação médica.
  // A decisão clínica permanece no SAU — a plataforma só transporta o status.
  if (ocorrencia.orgao === 'SAMU' && !ocorrencia.regulacao) {
    const definida = ['DESPACHADA', 'A_CAMINHO', 'ENCERRADA'].includes(ocorrencia.status);
    ocorrencia.regulacao = definida ? 'DEFINIDA' : 'EM_REGULACAO';
    ocorrencia.recurso_regulado = definida
      ? (ocorrencia.tipo_canonico === 'ACIDENTE_TRANSITO' ? 'USA' : 'USB')
      : null;
  }
  return ocorrencia;
}

// ---------------------------------------------------------------------
// Caso 1 — o cluster verdadeiro: a colisão na EPTG do §2.1 do documento de
// visão. Três órgãos, três ligações, um evento.
// ---------------------------------------------------------------------
const CLUSTER_EPTG = [
  novaOcorrencia({
    id_ocorrencia: 'CBMDF-2026-0158234', orgao: 'CBMDF', status: 'EM_ANDAMENTO',
    abertura: '2026-08-06T14:22:11-03:00',
    tipo_canonico: 'ACIDENTE_TRANSITO', tipo_origem: 'COLISAO_VEICULAR',
    geo: { lat: -15.7801, lon: -47.9292, precisao_m: 40, fonte: 'GEOCODIFICADO' },
    endereco_normalizado: 'EPTG KM 5 SENTIDO PLANO PILOTO', regiao_administrativa: 'TAGUATINGA',
    resumo: 'Colisão entre dois veículos, uma vítima presa às ferragens.',
  }),
  novaOcorrencia({
    id_ocorrencia: 'SAU-2026-004821', orgao: 'SAMU', status: 'DESPACHADA',
    abertura: '2026-08-06T14:23:40-03:00',
    tipo_canonico: 'ACIDENTE_TRANSITO', tipo_origem: 'Trauma — acidente de trânsito',
    geo: { lat: -15.7803, lon: -47.929, precisao_m: 25, fonte: 'GEOCODIFICADO' },
    endereco_normalizado: 'EPTG KM 5 SENTIDO PLANO PILOTO', regiao_administrativa: 'TAGUATINGA',
    resumo: 'Vítima presa às ferragens, trauma múltiplo, consciente.',
  }),
  novaOcorrencia({
    id_ocorrencia: 'PMDF-2026-021093', orgao: 'PMDF', status: 'A_CAMINHO',
    abertura: '2026-08-06T14:25:02-03:00',
    tipo_canonico: 'ACIDENTE_TRANSITO', tipo_origem: 'Acidente de trânsito',
    geo: { lat: -15.7799, lon: -47.9294, precisao_m: 30, fonte: 'GEOCODIFICADO' },
    endereco_normalizado: 'EPTG KM 5 SENTIDO PLANO PILOTO', regiao_administrativa: 'TAGUATINGA',
    resumo: 'Colisão entre dois veículos na pista, trânsito interrompido.',
  }),
];

// ---------------------------------------------------------------------
// Caso 2 — a armadilha: um acidente DISTINTO, sentido oposto da via, 18 min
// depois do cluster acima. Tipo compatível e perto o bastante para entrar na
// busca (RN-04/RN-05) e receber sugestão fraca — não forte.
// ---------------------------------------------------------------------
const ARMADILHA_EPTG = [
  novaOcorrencia({
    id_ocorrencia: 'PMDF-2026-021077', orgao: 'PMDF', status: 'EM_ANDAMENTO',
    abertura: '2026-08-06T14:40:00-03:00',
    tipo_canonico: 'ACIDENTE_TRANSITO', tipo_origem: 'Acidente de trânsito',
    geo: { lat: -15.7813, lon: -47.9304, precisao_m: 35, fonte: 'GEOCODIFICADO' },
    endereco_normalizado: 'EPTG KM 5 SENTIDO TAGUATINGA', regiao_administrativa: 'TAGUATINGA',
    resumo: 'Colisão traseira entre dois veículos, sem vítimas graves.',
  }),
];

// ---------------------------------------------------------------------
// Caso 3 — ocorrência já encerrada dentro da janela (RN-10): o sinal de
// "já foi atendido".
// ---------------------------------------------------------------------
const PAR_ENCERRADA = [
  novaOcorrencia({
    id_ocorrencia: 'CBMDF-2026-0158201', orgao: 'CBMDF', status: 'ENCERRADA',
    abertura: '2026-08-06T09:10:00-03:00',
    tipo_canonico: 'MAL_SUBITO', tipo_origem: 'Atendimento pré-hospitalar clínico',
    geo: { lat: -15.7797, lon: -47.8898, precisao_m: 20, fonte: 'GEOCODIFICADO' },
    endereco_normalizado: 'SQN 208 BLOCO C', regiao_administrativa: 'ASA NORTE',
    resumo: 'Atendimento a pessoa com mal súbito, removida ao hospital.',
  }),
  novaOcorrencia({
    id_ocorrencia: 'SAU-2026-004790', orgao: 'SAMU', status: 'EM_ANDAMENTO',
    abertura: '2026-08-06T09:22:00-03:00',
    tipo_canonico: 'MAL_SUBITO', tipo_origem: 'Clínico',
    geo: { lat: -15.7798, lon: -47.8897, precisao_m: 15, fonte: 'GEOCODIFICADO' },
    endereco_normalizado: 'SQN 208 BLOCO C', regiao_administrativa: 'ASA NORTE',
    resumo: 'Chamado para pessoa passando mal em via pública.',
  }),
];

// ---------------------------------------------------------------------
// Caso 4 — geolocalização de baixa precisão (RN-11): a estratégia geográfica
// é ignorada, usa-se região administrativa + tipo, com marcação de baixa
// confiança.
// ---------------------------------------------------------------------
const PAR_BAIXA_PRECISAO = [
  novaOcorrencia({
    id_ocorrencia: 'PMDF-2026-021150', orgao: 'PMDF', status: 'EM_ANDAMENTO',
    abertura: '2026-08-06T11:05:00-03:00',
    tipo_canonico: 'INCENDIO_EDIFICACAO', tipo_origem: 'Apoio a incêndio',
    geo: { lat: -15.8198, lon: -48.1075, precisao_m: 800, fonte: 'RA_INFORMADA' },
    endereco_normalizado: 'CEILÂNDIA CENTRO, PRÓXIMO À FEIRA', regiao_administrativa: 'CEILÂNDIA',
    resumo: 'Princípio de incêndio em imóvel comercial, fumaça visível.',
  }),
  novaOcorrencia({
    id_ocorrencia: 'CBMDF-2026-0158260', orgao: 'CBMDF', status: 'EM_ANDAMENTO',
    abertura: '2026-08-06T11:11:00-03:00',
    tipo_canonico: 'INCENDIO_EDIFICACAO', tipo_origem: 'Incêndio em edificação',
    geo: { lat: -15.8203, lon: -48.107, precisao_m: 35, fonte: 'GEOCODIFICADO' },
    endereco_normalizado: 'QNM 24 CEILÂNDIA', regiao_administrativa: 'CEILÂNDIA',
    resumo: 'Incêndio em loja no comércio local, sem vítimas reportadas.',
  }),
];

// ---------------------------------------------------------------------
// Caso 5 — ocorrência reservada (RN-13): participa do casamento geo-temporal,
// mas o conteúdo fica suprimido para quem não é o órgão de origem.
// ---------------------------------------------------------------------
const PAR_RESERVADA = [
  Object.assign(
    novaOcorrencia({
      id_ocorrencia: 'PMDF-2026-021204', orgao: 'PMDF', status: 'EM_ANDAMENTO',
      abertura: '2026-08-06T20:15:00-03:00',
      tipo_canonico: 'RESERVADO', tipo_origem: 'Ocorrência sob sigilo',
      geo: { lat: -15.9012, lon: -48.0605, precisao_m: 60, fonte: 'GEOCODIFICADO' },
      endereco_normalizado: 'QUADRA 106 CONJUNTO 4 RECANTO DAS EMAS', regiao_administrativa: 'RECANTO DAS EMAS',
      resumo: 'Ocorrência de natureza sigilosa (violência doméstica) — conteúdo restrito ao órgão de origem, RN-13.',
    }),
    { sigiloso: true }
  ),
  novaOcorrencia({
    id_ocorrencia: 'CBMDF-2026-0158299', orgao: 'CBMDF', status: 'EM_ANDAMENTO',
    abertura: '2026-08-06T20:19:00-03:00',
    tipo_canonico: 'MAL_SUBITO', tipo_origem: 'Atendimento pré-hospitalar clínico',
    geo: { lat: -15.901, lon: -48.0608, precisao_m: 25, fonte: 'GEOCODIFICADO' },
    endereco_normalizado: 'QUADRA 302 RECANTO DAS EMAS', regiao_administrativa: 'RECANTO DAS EMAS',
    resumo: 'Atendimento pré-hospitalar solicitado por terceiros.',
  }),
];

// ---------------------------------------------------------------------
// Ruído de fundo — ocorrências dispersas pelo DF para a lista não parecer
// vazia fora dos casos plantados acima. Geradas por combinação, não uma a
// uma, para manter o arquivo legível.
// ---------------------------------------------------------------------
function gerarRuido() {
  const BAIRROS = [
    { nome: 'ASA SUL', lat: -15.827, lon: -47.921, regiao: 'ASA SUL' },
    { nome: 'SUDOESTE', lat: -15.798, lon: -47.938, regiao: 'SUDOESTE/OCTOGONAL' },
    { nome: 'GUARÁ II', lat: -15.828, lon: -47.978, regiao: 'GUARÁ' },
    { nome: 'ÁGUAS CLARAS', lat: -15.834, lon: -48.027, regiao: 'ÁGUAS CLARAS' },
    { nome: 'SAMAMBAIA NORTE', lat: -15.865, lon: -48.087, regiao: 'SAMAMBAIA' },
    { nome: 'GAMA CENTRAL', lat: -16.017, lon: -48.062, regiao: 'GAMA' },
    { nome: 'SOBRADINHO', lat: -15.653, lon: -47.791, regiao: 'SOBRADINHO' },
    { nome: 'PLANALTINA', lat: -15.618, lon: -47.653, regiao: 'PLANALTINA' },
    { nome: 'SANTA MARIA', lat: -16.011, lon: -48.008, regiao: 'SANTA MARIA' },
    { nome: 'RIACHO FUNDO', lat: -15.883, lon: -48.015, regiao: 'RIACHO FUNDO' },
    { nome: 'VICENTE PIRES', lat: -15.808, lon: -48.029, regiao: 'VICENTE PIRES' },
    { nome: 'LAGO NORTE', lat: -15.746, lon: -47.865, regiao: 'LAGO NORTE' },
    { nome: 'CRUZEIRO', lat: -15.789, lon: -47.945, regiao: 'CRUZEIRO' },
    { nome: 'NÚCLEO BANDEIRANTE', lat: -15.868, lon: -47.968, regiao: 'NÚCLEO BANDEIRANTE' },
  ];

  const TIPOS = [
    {
      tipo: 'ACIDENTE_TRANSITO',
      origem: { CBMDF: 'Atropelamento', SAMU: 'Trauma — atropelamento', PMDF: 'Acidente de trânsito com vítima' },
      resumos: ['Atropelamento de pedestre na via.', 'Colisão lateral entre dois veículos.', 'Capotamento de veículo de passeio.'],
    },
    {
      tipo: 'INCENDIO_EDIFICACAO',
      origem: { CBMDF: 'Incêndio em edificação', SAMU: 'Intoxicação por fumaça', PMDF: 'Apoio a incêndio' },
      resumos: ['Princípio de incêndio em cozinha residencial.', 'Curto-circuito com princípio de incêndio.'],
    },
    {
      tipo: 'MAL_SUBITO',
      origem: { CBMDF: 'Atendimento pré-hospitalar clínico', SAMU: 'Clínico', PMDF: 'Apoio a ocorrência clínica' },
      resumos: ['Pessoa desacordada em via pública.', 'Crise convulsiva em idoso.', 'Dor torácica intensa.'],
    },
    {
      tipo: 'PARTO',
      origem: { CBMDF: 'Parto de emergência', SAMU: 'Obstétrico' },
      resumos: ['Trabalho de parto avançado em residência.'],
    },
    {
      tipo: 'INCENDIO_FLORESTAL',
      origem: { CBMDF: 'Incêndio florestal' },
      resumos: ['Foco de incêndio em vegetação próxima a via.'],
    },
  ];

  const STATUS = ['EM_ANDAMENTO', 'DESPACHADA', 'A_CAMINHO', 'EM_ANDAMENTO', 'ENCERRADA'];
  const lista = [];

  for (let i = 0; i < 26; i++) {
    const bairro = BAIRROS[i % BAIRROS.length];
    const tipoInfo = TIPOS[i % TIPOS.length];
    const orgaosPossiveis = Object.keys(tipoInfo.origem);
    const orgao = orgaosPossiveis[i % orgaosPossiveis.length];
    const hora = 7 + (i % 14);
    const minuto = (i * 17) % 60;
    const jitterLat = ((i * 37) % 100) / 100000 - 0.0005;
    const jitterLon = ((i * 53) % 100) / 100000 - 0.0005;

    lista.push(
      novaOcorrencia({
        id_ocorrencia: `${orgao}-2026-0${1500 + i * 7}`,
        orgao,
        status: STATUS[i % STATUS.length],
        abertura: `2026-08-06T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00-03:00`,
        tipo_canonico: tipoInfo.tipo,
        tipo_origem: tipoInfo.origem[orgao],
        geo: {
          lat: bairro.lat + jitterLat,
          lon: bairro.lon + jitterLon,
          precisao_m: 20 + (i % 5) * 10,
          fonte: 'GEOCODIFICADO',
        },
        endereco_normalizado: `${bairro.nome} — ENDEREÇO ${100 + i}`,
        regiao_administrativa: bairro.regiao,
        resumo: tipoInfo.resumos[i % tipoInfo.resumos.length],
      })
    );
  }

  return lista;
}

const SEED_OCORRENCIAS = [
  ...CLUSTER_EPTG,
  ...ARMADILHA_EPTG,
  ...PAR_ENCERRADA,
  ...PAR_BAIXA_PRECISAO,
  ...PAR_RESERVADA,
  ...gerarRuido(),
];

// IDs das ocorrências plantadas, usados pelas telas para atalhos da demo
// (ex.: abrir direto a ocorrência do roteiro de demonstração).
const IDS_DEMO = {
  clusterOrigem: 'CBMDF-2026-0158234',
  clusterSamu: 'SAU-2026-004821',
  clusterPmdf: 'PMDF-2026-021093',
  armadilha: 'PMDF-2026-021077',
  encerradaOrigem: 'SAU-2026-004790',
  encerradaAlvo: 'CBMDF-2026-0158201',
  baixaPrecisaoOrigem: 'PMDF-2026-021150',
  reservada: 'PMDF-2026-021204',
  reservadaVizinha: 'CBMDF-2026-0158299',
};
