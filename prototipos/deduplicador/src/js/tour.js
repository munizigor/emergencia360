/*
 * Tour guiado da Estação Integrada. Motor de coachmarks em JS puro: destaca
 * um elemento por vez (recorte via box-shadow), mostra um cartão explicativo
 * e prepara a tela a cada passo (aoEntrar) para o usuário ver o comportamento
 * real, não uma descrição dele. Sem dependências externas.
 *
 * O progresso do tour vive numa chave própria do localStorage, separada do
 * estado da demonstração: "Reiniciar demonstração" não reapresenta o tour.
 */

const TOUR = (() => {
  const CHAVE_TOUR = 'e360_dedup_tour_v1';

  function carregarProgresso() {
    try {
      const bruto = localStorage.getItem(CHAVE_TOUR);
      if (!bruto) return { welcomeVisto: false, concluidos: {} };
      const dado = JSON.parse(bruto);
      if (!dado.concluidos) dado.concluidos = {};
      return dado;
    } catch (e) {
      return { welcomeVisto: false, concluidos: {} };
    }
  }

  function salvarProgresso(progresso) {
    localStorage.setItem(CHAVE_TOUR, JSON.stringify(progresso));
  }

  function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Definição dos passos por tela ────────────────────────────────────
  // Passo: { alvo, titulo, texto, aoEntrar? }. Alvo ausente na página →
  // o passo é pulado (robustez para camadas desligadas, listas vazias etc.).
  // `alvo: null` centraliza o cartão, sem destaque.

  const DEFINICOES = {
    atendente: {
      rotulo: 'Atendente',
      proxima: { href: 'despachante.html', rotulo: 'Continuar: Despachante →' },
      passos: [
        {
          alvo: '.watermark-banner',
          titulo: 'Ambiente de demonstração',
          texto: 'Tudo aqui é fictício: ocorrências, endereços e telefones são sintéticos, e nada sai do seu navegador. Explore à vontade — o botão "Reiniciar demonstração" restaura os dados originais.',
        },
        {
          alvo: '#seletorOrgao',
          titulo: '"Ver como" — troque de central',
          texto: 'Este seletor muda a ótica da tela (CBMDF, SAMU ou PMDF) sem autenticação. As integrações têm sempre dois lados — você vai usá-lo para ver a mesma história das duas centrais.',
        },
        {
          alvo: '#painelCadastro',
          titulo: 'Cadastro de ocorrência',
          texto: 'Preenchemos um exemplo para você: uma colisão na EPTG. Repare que o cadastro nunca depende da integração — concluir aqui funciona mesmo se todo o resto estiver fora do ar.',
          aoEntrar: async () => {
            const campoEndereco = document.getElementById('campoEndereco');
            const campoTipo = document.getElementById('campoTipo');
            if (campoEndereco.value !== '0') {
              campoEndereco.value = '0';
              campoEndereco.dispatchEvent(new Event('change'));
            }
            if (campoTipo.value !== 'ACIDENTE_TRANSITO') {
              campoTipo.value = 'ACIDENTE_TRANSITO';
              campoTipo.dispatchEvent(new Event('change'));
            }
          },
        },
        {
          alvo: '#painelLateral',
          titulo: 'Ocorrências correlatas (P1)',
          texto: 'O painel carregou em paralelo, sem travar o cadastro, e mostra ocorrências parecidas registradas por outros órgãos — mesmo local, mesma janela de tempo, tipo compatível — com um score de similaridade.',
          aoEntrar: async () => {
            await esperar(1100); // o painel simula ~800 ms de latência (NFR-01)
          },
        },
        {
          alvo: '#painelLateral .badge-regulacao',
          titulo: 'Status da regulação médica (P3)',
          texto: 'A candidata do SAMU exibe o estado da regulação (em regulação / definida · USB/USA). Só o status viaja pela integração — a decisão clínica permanece no SAU, com o médico regulador.',
        },
        {
          alvo: '#btnTransferir',
          titulo: 'Transferir com contexto (P2)',
          texto: 'Transfere a ligação à outra central levando junto tudo que já foi colhido: endereço, tipo, telefone e relato. Experimente depois: transfira e troque "Ver como" para a central de destino — a triagem continua de onde parou.',
        },
        {
          alvo: '.camadas-grupo',
          titulo: 'Camadas de integração',
          texto: 'Cada camada corresponde a um processo do plano de trabalho (P2, P3, P4) e pode ser ligada ou desligada. Isso permite avaliar cada processo isolado — e também a carga combinada de informações sobre a sua tela.',
        },
      ],
    },

    despachante: {
      rotulo: 'Despachante',
      proxima: { href: 'evento.html', rotulo: 'Continuar: Eventos vinculados →' },
      passos: [
        {
          alvo: '#listaOcorrencias',
          titulo: 'Minhas ocorrências',
          texto: 'A fila do despachante mostra as ocorrências em andamento do órgão selecionado em "Ver como". Ocorrências do SAMU trazem o status da regulação (P3); vínculos já feitos aparecem como badge.',
        },
        {
          alvo: '#containerVerificacao',
          titulo: 'Verificação de duplicidade',
          texto: 'Abrimos a colisão da EPTG. O motor buscou candidatas por proximidade geográfica, janela temporal e compatibilidade de tipo. Com o motor desligado (cabeçalho), a lista continua — apenas em ordem cronológica, sem score.',
          aoEntrar: async () => {
            if (typeof abrirVerificacao === 'function') {
              abrirVerificacao(IDS_DEMO.clusterOrigem);
              await esperar(300);
            }
          },
        },
        {
          alvo: '#listaCandidatos .card-candidato',
          titulo: 'Candidatas com score',
          texto: 'Cada cartão mostra o órgão, o status e a força da sugestão (forte/fraca). A sugestão fraca existe de propósito: há um segundo acidente real no sentido oposto da via — nem toda semelhança é duplicidade.',
        },
        {
          alvo: '#listaCandidatos .card-candidato .acoes',
          titulo: 'A decisão é sempre humana',
          texto: '"É o mesmo evento" vincula as ocorrências num evento único. "São eventos distintos" descarta a sugestão — e o motivo informado vira rótulo de calibração do motor (RN-17). O sistema sugere; o operador decide.',
        },
        {
          alvo: '.toast-contrarreg',
          titulo: 'Contra-regulação (P4)',
          texto: 'O médico regulador do SAMU mudou o recurso da ocorrência — e o alerta chegou aqui, dentro da própria tela, sem rádio nem telefone. O botão "Ciente" registra sua ciência na trilha de auditoria. Pode clicar depois do tour.',
          aoEntrar: async () => {
            const orgao = ESTADO.obterVerComo();
            if (
              ESTADO.obterCamadas().p4 &&
              orgao !== 'SAMU' &&
              ESTADO.obterContrarregulacoesPendentes(orgao).length === 0
            ) {
              ESTADO.marcarSimulacaoP4();
              ESTADO.registrarContrarregulacao({
                idOcorrencia: IDS_DEMO.clusterSamu,
                de: 'USB',
                para: 'USA',
                motivo: 'Reavaliação do médico regulador: vítima evoluiu com instabilidade (demonstração).',
              });
            }
            montarAlertasContrarregulacao();
            await esperar(400);
          },
        },
      ],
    },

    evento: {
      rotulo: 'Eventos vinculados',
      proxima: null,
      passos: [
        {
          alvo: '#listaEventos',
          titulo: 'Eventos vinculados',
          texto: 'Quando o despachante vincula ocorrências, elas formam um evento único — sem apagar nem fundir os registros originais. Garantimos um vínculo de exemplo: a colisão da EPTG vista pelo CBMDF e pelo SAMU.',
          aoEntrar: async () => {
            if (ESTADO.obterEventosMultiOrgao().length === 0) {
              ESTADO.vincular(IDS_DEMO.clusterOrigem, IDS_DEMO.clusterSamu);
            }
            if (typeof renderizarListaEventos === 'function') renderizarListaEventos();
            await esperar(200);
          },
        },
        {
          alvo: '#detalheEvento',
          titulo: 'Ocorrências lado a lado',
          texto: 'Cada órgão mantém seu registro íntegro, com identificador, tipo e resumo próprios. A integração correlaciona — não substitui. Conteúdo sigiloso (RN-13) aparece suprimido para quem não é o órgão de origem.',
        },
        {
          alvo: '#detalheEvento .btn-vincular',
          titulo: 'Contra-regular (P4) — visão SAMU',
          texto: 'Trocamos "Ver como" para SAMU: contra-regular é ato do médico regulador. Este botão altera o recurso regulado e notifica, em tempo real, as centrais com recurso empenhado. Teste depois: contra-regule e volte para a visão CBMDF.',
          aoEntrar: async () => {
            if (ESTADO.obterVerComo() !== 'SAMU') {
              ESTADO.definirVerComo('SAMU');
              document.documentElement.dataset.orgao = 'SAMU';
              const seletor = document.getElementById('seletorOrgao');
              if (seletor) seletor.value = 'SAMU';
              if (typeof renderizarListaEventos === 'function') renderizarListaEventos();
              await esperar(200);
            }
          },
        },
        {
          alvo: '#detalheEvento .btn-desvincular',
          titulo: 'Todo vínculo é reversível',
          texto: 'Desvincular exige justificativa (RN-03) e fica na trilha de auditoria. Errar ao vincular não é catástrofe — é um clique auditado para desfazer.',
        },
        {
          alvo: '#fabFeedback',
          titulo: 'Sua opinião vale mais que o protótipo',
          texto: 'Este protótipo existe para ser criticado. O que funcionaria na sua rotina? O que atrapalharia? Use o botão de Feedback — cada observação registrada orienta o que vai (ou não) para desenvolvimento.',
        },
      ],
    },
  };

  // ── Motor ────────────────────────────────────────────────────────────

  let paginaAtual = null;
  let passosAtivos = [];
  let indice = -1;
  let ativo = false;

  function garantirElementosTour() {
    if (document.getElementById('tourDestaque')) return;

    const bloqueio = document.createElement('div');
    bloqueio.id = 'tourBloqueio';
    bloqueio.className = 'tour-bloqueio';
    bloqueio.hidden = true;

    const destaque = document.createElement('div');
    destaque.id = 'tourDestaque';
    destaque.className = 'tour-destaque';
    destaque.hidden = true;

    const cartao = document.createElement('div');
    cartao.id = 'tourCartao';
    cartao.className = 'tour-cartao';
    cartao.setAttribute('role', 'dialog');
    cartao.setAttribute('aria-live', 'polite');
    cartao.hidden = true;

    document.body.append(bloqueio, destaque, cartao);

    window.addEventListener('resize', () => {
      if (ativo) posicionar();
    });
    document.addEventListener('keydown', (ev) => {
      if (!ativo) return;
      if (ev.key === 'Escape') encerrar(false);
      if (ev.key === 'ArrowRight') avancar();
      if (ev.key === 'ArrowLeft') voltar();
    });
  }

  function alvoDoPassoAtual() {
    const passo = passosAtivos[indice];
    return passo && passo.alvo ? document.querySelector(passo.alvo) : null;
  }

  function posicionar() {
    const destaque = document.getElementById('tourDestaque');
    const cartao = document.getElementById('tourCartao');
    const alvo = alvoDoPassoAtual();

    if (!alvo) {
      destaque.hidden = true;
      cartao.style.left = `${Math.max(16, (window.innerWidth - cartao.offsetWidth) / 2 + window.scrollX)}px`;
      cartao.style.top = `${window.scrollY + window.innerHeight / 2 - cartao.offsetHeight / 2}px`;
      return;
    }

    const rect = alvo.getBoundingClientRect();
    const margem = 6;
    destaque.hidden = false;
    destaque.style.left = `${rect.left + window.scrollX - margem}px`;
    destaque.style.top = `${rect.top + window.scrollY - margem}px`;
    destaque.style.width = `${rect.width + margem * 2}px`;
    destaque.style.height = `${rect.height + margem * 2}px`;

    const alturaCartao = cartao.offsetHeight;
    const larguraCartao = cartao.offsetWidth;
    const espacoAbaixo = window.innerHeight - rect.bottom;
    const topo =
      espacoAbaixo > alturaCartao + 24 || rect.top < alturaCartao + 24
        ? rect.bottom + window.scrollY + 14
        : rect.top + window.scrollY - alturaCartao - 14;
    const esquerda = Math.min(
      Math.max(16 + window.scrollX, rect.left + window.scrollX),
      window.scrollX + window.innerWidth - larguraCartao - 16
    );
    cartao.style.top = `${topo}px`;
    cartao.style.left = `${esquerda}px`;
  }

  function renderizarCartao() {
    const definicao = DEFINICOES[paginaAtual];
    const passo = passosAtivos[indice];
    const cartao = document.getElementById('tourCartao');
    const ultimo = indice === passosAtivos.length - 1;
    const botaoFinal = ultimo && definicao.proxima
      ? `<button type="button" class="btn btn-primary" id="tourProximo">${definicao.proxima.rotulo}</button>`
      : ultimo
        ? '<button type="button" class="btn btn-primary" id="tourProximo">Concluir tour</button>'
        : '<button type="button" class="btn btn-primary" id="tourProximo">Próximo</button>';

    cartao.innerHTML = `
      <div class="tour-cartao-titulo">${passo.titulo}</div>
      <div class="tour-cartao-texto">${passo.texto}</div>
      <div class="tour-cartao-rodape">
        <button type="button" class="tour-sair" id="tourSair">Sair do tour</button>
        <span class="tour-progresso">${indice + 1} de ${passosAtivos.length}</span>
        <div class="tour-navegacao">
          ${indice > 0 ? '<button type="button" class="btn btn-descartar" id="tourAnterior">Anterior</button>' : ''}
          ${botaoFinal}
        </div>
      </div>
    `;

    document.getElementById('tourSair').addEventListener('click', () => encerrar(false));
    document.getElementById('tourProximo').addEventListener('click', avancar);
    const anterior = document.getElementById('tourAnterior');
    if (anterior) anterior.addEventListener('click', voltar);
  }

  async function mostrarPasso(direcao) {
    // Pula passos cujo alvo não existe (camada desligada, lista vazia etc.).
    while (indice >= 0 && indice < passosAtivos.length) {
      const passo = passosAtivos[indice];
      if (passo.aoEntrar) await passo.aoEntrar();
      if (!passo.alvo || document.querySelector(passo.alvo)) break;
      indice += direcao;
    }
    if (indice < 0) indice = 0;
    if (indice >= passosAtivos.length) {
      concluirPagina();
      return;
    }

    const cartao = document.getElementById('tourCartao');
    cartao.hidden = false;
    renderizarCartao();

    const alvo = alvoDoPassoAtual();
    if (alvo) alvo.scrollIntoView({ block: 'center', behavior: 'auto' });
    posicionar();
  }

  function avancar() {
    if (indice >= passosAtivos.length - 1) {
      concluirPagina();
      return;
    }
    indice += 1;
    mostrarPasso(1);
  }

  function voltar() {
    if (indice === 0) return;
    indice -= 1;
    mostrarPasso(-1);
  }

  function concluirPagina() {
    const definicao = DEFINICOES[paginaAtual];
    const progresso = carregarProgresso();
    progresso.concluidos[paginaAtual] = true;
    salvarProgresso(progresso);
    encerrar(true);
    if (definicao.proxima) {
      window.location.href = definicao.proxima.href + '?tour=auto';
    }
  }

  function encerrar(concluiu) {
    ativo = false;
    document.getElementById('tourBloqueio').hidden = true;
    document.getElementById('tourDestaque').hidden = true;
    document.getElementById('tourCartao').hidden = true;
    if (!concluiu) {
      const progresso = carregarProgresso();
      progresso.concluidos[paginaAtual] = true;
      salvarProgresso(progresso);
    }
  }

  async function iniciar(pagina) {
    if (!DEFINICOES[pagina]) return;
    garantirElementosTour();
    paginaAtual = pagina;
    passosAtivos = DEFINICOES[pagina].passos;
    indice = 0;
    ativo = true;
    document.getElementById('tourBloqueio').hidden = false;
    await mostrarPasso(1);
  }

  // ── Boas-vindas (primeira visita) ────────────────────────────────────

  function garantirDialogoBoasVindas() {
    if (document.getElementById('tourWelcome')) return;
    const dialogo = document.createElement('dialog');
    dialogo.id = 'tourWelcome';
    dialogo.className = 'modal-prototipo tour-welcome';
    dialogo.setAttribute('aria-labelledby', 'tourWelcomeTitulo');
    dialogo.innerHTML = `
      <h2 id="tourWelcomeTitulo">Bem-vindo à Estação Integrada</h2>
      <ul class="tour-welcome-lista">
        <li><strong>O que é:</strong> protótipo navegável do Emergência 360°, para validar os cinco
        processos de integração entre as centrais 193 (CBMDF) e 192 (SAMU) antes do desenvolvimento.</li>
        <li><strong>Dados 100% fictícios:</strong> ocorrências, endereços e telefones são sintéticos
        e tudo roda apenas no seu navegador.</li>
        <li><strong>Três telas, três papéis:</strong> Atendente (cadastro + correlatas),
        Despachante (verificação de duplicidade) e Regulador/Supervisor (eventos vinculados).</li>
      </ul>
      <div class="modal-acoes">
        <button type="button" class="btn btn-descartar" id="tourWelcomePular">Explorar por conta própria</button>
        <button type="button" class="btn btn-primary" id="tourWelcomeComecar">🎓 Fazer o tour guiado (~2 min)</button>
      </div>
      <p class="tour-welcome-nota">Você pode refazer o tour a qualquer momento pelo botão 🎓 Tour, no topo da tela.</p>
    `;
    document.body.appendChild(dialogo);
  }

  function mostrarBoasVindas() {
    garantirDialogoBoasVindas();
    const dialogo = document.getElementById('tourWelcome');
    return new Promise((resolve) => {
      function fechar(comecarTour) {
        dialogo.close();
        resolve(comecarTour);
      }
      document.getElementById('tourWelcomeComecar').addEventListener('click', () => fechar(true), { once: true });
      document.getElementById('tourWelcomePular').addEventListener('click', () => fechar(false), { once: true });
      dialogo.addEventListener('cancel', () => resolve(false), { once: true });
      dialogo.showModal();
    });
  }

  // ── Entrada: chamada pelo cabeçalho ao carregar cada página ──────────

  async function aoCarregarPagina(pagina) {
    if (!DEFINICOES[pagina]) return;
    garantirElementosTour();

    const url = new URLSearchParams(window.location.search);
    const progresso = carregarProgresso();

    if (url.get('tour') === 'auto') {
      progresso.welcomeVisto = true;
      salvarProgresso(progresso);
      await esperar(400); // dá tempo de a página renderizar listas
      iniciar(pagina);
      return;
    }

    if (!progresso.welcomeVisto) {
      progresso.welcomeVisto = true;
      salvarProgresso(progresso);
      await esperar(400);
      const comecar = await mostrarBoasVindas();
      if (comecar) iniciar(pagina);
    }
  }

  return { iniciar, aoCarregarPagina };
})();