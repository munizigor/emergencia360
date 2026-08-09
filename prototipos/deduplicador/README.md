# Protótipo — Painel de Ocorrências Correlatas

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
