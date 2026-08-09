# Protótipo — Estação Integrada (Deduplicação + Camadas P2–P4)

Protótipo de média fidelidade, sem backend, com dados 100% sintéticos. Construído para validar
interação e parâmetros (P1–P3, desacoplamento do motor, raios/janelas/limiares de score) antes de
comprometer a Fatia F1 real — ver [docs/roteiro_demonstracao_prototipo.md](../docs/roteiro_demonstracao_prototipo.md)
para o roteiro de demonstração e [docs/documento_de_visao.md](../docs/documento_de_visao.md) para o
produto que este protótipo instrumenta.

## Como abrir

Não há build, não há dependências. Abra `index.html` diretamente no navegador, ou sirva a pasta com
qualquer servidor estático (recomendado, evita restrições de `file://` em alguns navegadores):

```bash
cd prototipo
python -m http.server 8000
# depois abra http://localhost:8000/
```

## Telas

| Arquivo | Persona | O que demonstra |
| --- | --- | --- |
| `index.html` | Atendente | Cadastro + painel lateral assíncrono (P1) |
| `despachante.html` | Despachante | Verificação de duplicidade, vincular, descartar |
| `evento.html` | Regulador / Supervisor | Evento com ocorrências vinculadas lado a lado (P2), desvínculo |

O cabeçalho, presente nas três telas, controla:
- **Ver como** — troca o órgão sob cuja ótica a tela é exibida (CBMDF/SAMU/PMDF), sem autenticação real.
- **Motor de similaridade** — liga/desliga o motor para demonstrar o desacoplamento (§4.3 do documento
  de visão): as telas continuam funcionando, só muda a ordenação e some o score.
- **Reiniciar demonstração** — apaga vínculos, descartes e cadastros feitos durante a sessão e restaura
  os dados originais.

## Estado e persistência

Tudo fica em `localStorage`, chave `e360_dedup_prototipo_v1`. Fechar a aba não perde o progresso; o
botão "Reiniciar demonstração" limpa essa chave e recarrega a massa de dados original de `src/js/dados.js`.

## Camadas de integração (P2/P3/P4)

Além da deduplicação (P1), as telas carregam as demais camadas de integração do plano de
trabalho, cada uma ligável/desligável no grupo **Camadas** do cabeçalho:

- **P2 — Transferência com contexto**: na tela do atendente, o botão "Transferir ligação com
  contexto" envia o cadastro parcial à outra central; trocando "Ver como" para a central de
  destino, um banner permite assumir a triagem com o formulário pré-carregado.
- **P3 — Status da regulação médica**: ocorrências do SAMU exibem o badge de regulação
  (em regulação / definida · USB/USA) em todas as listas. A decisão clínica permanece no SAU —
  só o status viaja.
- **P4 — Contra-regulação**: na visão SAMU da tela de eventos, "Contra-regular (demo)" altera o
  recurso regulado e notifica as demais centrais com um alerta na própria tela (com ciência
  explícita). Alguns segundos após abrir qualquer tela, uma contra-regulação simulada também
  dispara automaticamente, para a demonstração não depender de ação prévia.

O objetivo das camadas é duplo: validar cada processo isoladamente e observar a **carga
combinada** sobre a estação do operador (risco R6 — "substituir canal, não somar").

## Feedback

Todas as telas exibem o botão flutuante **Feedback**. O link do formulário é configurado na
constante `LINK_FORMULARIO_FEEDBACK` em `src/js/comum.js` (TODO pendente — enquanto vazio, o
botão informa que o formulário será disponibilizado).

## Estrutura

```
  index.html            atendente
  despachante.html       despachante
  evento.html             evento vinculado
  src/css/style.css       paleta neutra + tags de órgão
  src/js/dados.js         massa sintética (~40 ocorrências, casos plantados)
  src/js/motor.js         motor simplificado (níveis 0 e 2 da cascata do §4.3)
  src/js/comum.js         estado (localStorage), cabeçalho, formatação
  src/js/painel.js        lógica da tela do atendente
  src/js/despachante.js   lógica da tela do despachante
  src/js/evento.js        lógica da tela de evento vinculado
```

## O que este protótipo não é

Não é o início do produto real — é uma sonda descartável. Não integra com Hefesto/SAU, não implementa
autenticação, não implementa os níveis 1/3/4 do motor (determinístico por telefone, fuzzy textual,
semântico/IA) nem a edição da matriz de compatibilidade de tipos (HU01.3). Ver a seção "O que este
protótipo não prova" no roteiro de demonstração.
