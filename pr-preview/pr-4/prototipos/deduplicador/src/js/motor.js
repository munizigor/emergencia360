/*
 * Motor de similaridade simplificado — implementa só os níveis 0
 * (cronológico) e 2 (geo-temporal) da cascata descrita no documento de
 * visão, §4.3. Os níveis 1 (determinístico por telefone/endereço), 3
 * (fuzzy textual) e 4 (semântico) ficam fora do protótipo — não são
 * necessários para provar P1–P3 e o desacoplamento, que é o que esta
 * demonstração se propõe a provar.
 *
 * Responde sempre no formato do contrato único do §4.3:
 *   { candidatos: [...], estrategia_efetiva, degradado }
 * com ou sem motor ligado — o consumidor (despachante.js) não muda uma
 * linha para lidar com os dois casos.
 *
 * Simplificação assumida: RN-04 define uma janela assimétrica (30 min antes
 * / 15 min depois). Aqui a janela de corte é tratada como simétrica
 * (±30 min) para não exigir que a demo saiba, campo a campo, "quem ligou
 * primeiro" — o texto do motivo sempre mostra os minutos de diferença para
 * o operador julgar.
 */

const MOTOR = (function () {
  const JANELA_MIN = 30;

  // RN-05 — valores iniciais, a calibrar. "default" cobre tipos não listados
  // explicitamente na spec (MAL_SUBITO, PARTO, RESERVADO).
  const RAIOS_POR_TIPO = {
    ACIDENTE_TRANSITO: 200,
    INCENDIO_EDIFICACAO: 100,
    INCENDIO_FLORESTAL: 1500,
    AFOGAMENTO: 500,
    default: 250,
  };

  function raioPara(tipoCanonico) {
    return RAIOS_POR_TIPO[tipoCanonico] || RAIOS_POR_TIPO.default;
  }

  function haversineM(geoA, geoB) {
    const R = 6371000;
    const toRad = (g) => (g * Math.PI) / 180;
    const dLat = toRad(geoB.lat - geoA.lat);
    const dLon = toRad(geoB.lon - geoA.lon);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(geoA.lat)) * Math.cos(toRad(geoB.lat)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function diffMinutos(isoA, isoB) {
    return Math.abs(new Date(isoA) - new Date(isoB)) / 60000;
  }

  // RN-06 — só tipos compatíveis casam. RESERVADO (RN-13) é a única exceção
  // deliberada: participa do casamento geo-temporal com qualquer tipo,
  // porque o próprio conteúdo que permitiria mapear a compatibilidade está
  // suprimido.
  function tiposCompativeis(a, b) {
    return a.tipo_canonico === b.tipo_canonico || a.tipo_canonico === 'RESERVADO' || b.tipo_canonico === 'RESERVADO';
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function avaliarCandidato(origem, candidata) {
    if (candidata.id_ocorrencia === origem.id_ocorrencia) return null;
    if (candidata.id_evento === origem.id_evento) return null; // já vinculadas
    if (!tiposCompativeis(origem, candidata)) return null;

    const diffMin = diffMinutos(origem.abertura, candidata.abertura);
    if (diffMin > JANELA_MIN) return null; // RN-04 (simplificação simétrica, ver cabeçalho)

    // RN-11 — geolocalização ausente ou de baixa precisão: ignora estratégia
    // geográfica, casa por região administrativa + tipo, marca baixa confiança.
    const precisaoRuim = origem.geo.precisao_m > 500 || candidata.geo.precisao_m > 500;
    if (precisaoRuim) {
      if (origem.regiao_administrativa !== candidata.regiao_administrativa) return null;
      return {
        candidata,
        score: null,
        motivo: 'Mesma região administrativa e tipo compatível — geolocalização de baixa precisão',
        baixaConfianca: true,
        distanciaM: null,
        diffMin,
      };
    }

    const raio = raioPara(origem.tipo_canonico);
    const distanciaM = haversineM(origem.geo, candidata.geo);
    if (distanciaM > raio) return null; // RN-05

    const scoreGeo = clamp(1 - 0.7 * (distanciaM / raio), 0, 1);
    const scoreTempo = clamp(1 - diffMin / 90, 0, 1);
    const score = Math.round((0.4 * scoreGeo + 0.6 * scoreTempo) * 100) / 100;

    return {
      candidata,
      score,
      motivo: `${Math.round(distanciaM)} m, ${Math.round(diffMin)} min, tipo compatível`,
      baixaConfianca: false,
      distanciaM,
      diffMin,
    };
  }

  /**
   * @param {object} origem - ocorrência a partir da qual se busca candidatos
   * @param {object[]} ocorrencias - estado atual (não o seed) de todas as ocorrências
   * @param {object} opcoes
   * @param {boolean} opcoes.motorLigado
   * @param {Set<string>} [opcoes.descartados] - chaves "origemId::candidataId" já descartadas (RN-17)
   */
  function buscarCandidatos(origem, ocorrencias, opcoes) {
    const motorLigado = !!(opcoes && opcoes.motorLigado);
    const descartados = (opcoes && opcoes.descartados) || new Set();

    let avaliados = ocorrencias
      .map((c) => avaliarCandidato(origem, c))
      .filter(Boolean)
      .filter((r) => !descartados.has(origem.id_ocorrencia + '::' + r.candidata.id_ocorrencia));

    if (motorLigado) {
      // RN-07 — abaixo de 0,60 não é exibido. Candidatos de baixa confiança
      // (score nulo) não têm banda de score e são sempre exibidos.
      avaliados = avaliados.filter((r) => r.baixaConfianca || r.score >= 0.6);
    } else {
      // Nível 0 — cronológico, sem score, motor desligado (§4.3).
      avaliados = avaliados.map((r) => Object.assign({}, r, { score: null, degradadoItem: true }));
    }

    // RN-16 — ocorrências de outros órgãos têm precedência sobre as do
    // próprio órgão; dentro de cada grupo, por score (se houver) e depois
    // por proximidade temporal.
    avaliados.sort((a, b) => {
      const mesmoOrgaoA = a.candidata.orgao === origem.orgao ? 1 : 0;
      const mesmoOrgaoB = b.candidata.orgao === origem.orgao ? 1 : 0;
      if (mesmoOrgaoA !== mesmoOrgaoB) return mesmoOrgaoA - mesmoOrgaoB;
      if (motorLigado && a.score !== b.score) return (b.score || 0) - (a.score || 0);
      return a.diffMin - b.diffMin;
    });

    return {
      candidatos: avaliados,
      estrategia_efetiva: motorLigado ? 'GEO_TEMPORAL' : 'CRONOLOGICO',
      degradado: !motorLigado,
    };
  }

  function bandaScore(score) {
    if (score === null || score === undefined) return null;
    if (score >= 0.85) return 'forte';
    if (score >= 0.6) return 'fraca';
    return null;
  }

  return { buscarCandidatos, bandaScore, haversineM, diffMinutos };
})();
