# Verificação de Duplicidade de Ocorrências entre Órgãos
### Documento de Product Owner — Emergência 360 / GT APH Móvel DF

**Versão:** 0.1 (rascunho para refinamento)
**Contexto:** integração Hefesto (SSP) ↔ SAU (SES-DF/SAMU), com extensão a PMDF e PCDF
**Autor:** Igor — CBMDF

---

## 1. Reenquadramento do problema

O pedido chegou como *"verificar se a ocorrência já foi registrada"*. Vale
separar o que parece ser o problema do que ele de fato é.

**Não é** um problema de detecção de registros duplicados em banco de dados.
Se fosse, resolveria-se com chave única.

**É** um problema de **um mesmo fato do mundo real gerando N acionamentos
independentes, em N centrais que não enxergam umas às outras.**

Uma colisão na EPTG gera: um passante liga 190, o motorista liga 193, um
terceiro liga 192. Três centrais abrem três registros. Nenhuma delas sabe da
existência das outras duas. O resultado não é "dado sujo" — é **recurso
operacional deslocado em duplicidade** enquanto outra ocorrência espera.

Isso reposiciona o valor de negócio: o ganho principal **não** é estatística
limpa (esse é o ganho secundário, e é real). O ganho principal é
**disponibilidade de recurso operacional** e **redução do tempo-resposta
agregado do sistema de emergência do DF**.

---

## 2. Problema de negócio

### 2.1 Dores atuais (As-Is)

| # | Dor | Consequência | Quem sofre |
|---|-----|--------------|------------|
| D1 | Múltiplos acionamentos do mesmo evento em centrais distintas | Empenho redundante de viaturas/ambulâncias | População (recurso indisponível para outro chamado) |
| D2 | Atendente não tem como saber se outro órgão já foi acionado | Retrabalho de coleta de dados com o solicitante | Solicitante, atendente |
| D3 | Solicitação de apoio a outro órgão feita "no escuro" | Órgão apoiador já está a caminho, ou não está e ninguém sabe | Despachante |
| D4 | Consolidação estatística intersetorial impossível | Números do DF somam ocorrências, não eventos | SSP, gestão, BI |
| D5 | Contrarregulação e regulação sem visão do que o outro órgão registrou | Decisão clínica/operacional com informação parcial | Regulador médico |
| D6 | Informação circula por WhatsApp para suprir a lacuna | Sem rastreabilidade, sem LGPD, sem auditoria | Todos |

### 2.2 Hipótese de valor

> Se o atendente/despachante enxergar, no momento do cadastro, as ocorrências
> registradas por qualquer órgão nas proximidades e na janela temporal
> relevante, então a taxa de empenho redundante cairá e a decisão de
> solicitar apoio externo passará a ser informada.

Mensurável. Ver §9.

---

## 3. O princípio de desenho: assimetria de risco

Esta é a decisão mais importante do produto e deve estar no topo do
entendimento do time.

| Erro | O que acontece | Custo | Reversível? |
|------|----------------|-------|-------------|
| **Falso negativo** (não detecta duplicata real) | Duas guarnições vão ao mesmo local | Desperdício de recurso. É o *status quo de hoje.* | Sim |
| **Falso positivo** (marca como duplicata algo que não é) | Uma ocorrência real é tratada como já atendida e **ninguém vai** | Potencialmente uma vida | **Não** |

Os dois erros **não** são simétricos. Portanto:

> **P1 — A verificação de duplicidade jamais bloqueia, cancela ou atrasa o
> despacho. Ela sugere; o ser humano decide; o atendimento segue.**

> **P2 — Vincular, não fundir.** Nenhum registro é apagado, mesclado ou
> sobrescrito. Cada órgão continua dono e íntegro do seu próprio registro.
> A deduplicação apenas *declara que dois registros falam do mesmo evento.*

> **P3 — Todo vínculo é reversível**, por ação humana, com trilha de
> auditoria.

P1–P3 protegem o produto do pior cenário e, de quebra, resolvem a política:
nenhum órgão precisa ceder controle sobre seus dados para o motor funcionar.

---

## 4. Modelo conceitual

O modelo de dados carrega a solução. Introduzir uma entidade nova resolve
o problema quase sozinho.

```
        EVENTO (o fato no mundo real)
        id_evento (UUID, gerado na SSP)
              |
              | 1 : N
              v
        OCORRÊNCIA (o registro de UM órgão sobre o evento)
        id_ocorrencia + orgao  (chave natural)
```

- **Evento**: a colisão na EPTG. Existe uma vez.
- **Ocorrência**: o registro do CBMDF sobre a colisão. O registro do SAMU
  sobre a colisão. O registro da PMDF. Três ocorrências, um evento.

Deduplicar = **atribuir o mesmo `id_evento` a ocorrências de órgãos
diferentes**. Nada é destruído. É uma operação aditiva.

Corolário prático: uma ocorrência sem vínculo simplesmente tem um
`id_evento` só dela. Não existe estado "não deduplicado" — existe evento
com uma ocorrência ou evento com várias. Isso elimina uma classe inteira de
bug e de nulidade no schema.

### 4.1 Índice Canônico de Ocorrências (ICO)

O motor **não** consulta os sistemas de origem. Cada órgão publica no ICO um
registro mínimo — o suficiente para casar eventos e nada além disso.

```json
{
  "id_ocorrencia": "CBMDF-2026-0158234",
  "orgao": "CBMDF",
  "sistema_origem": "HEFESTO",
  "abertura": "2026-07-31T14:22:11-03:00",
  "atualizacao": "2026-07-31T14:23:02-03:00",
  "status": "EM_ANDAMENTO",
  "tipo_canonico": "ACIDENTE_TRANSITO",
  "tipo_origem": "COLISAO_VEICULAR",
  "geo": { "lat": -15.7801, "lon": -47.9292, "precisao_m": 40, "fonte": "GEOCODIFICADO" },
  "endereco_normalizado": "EPTG KM 5 SENTIDO PLANO PILOTO",
  "hash_telefone_solicitante": "sha256:9f2a...",
  "resumo": "colisao dois veiculos, uma vitima presa as ferragens",
  "id_evento": "ev_01J8X4..."
}
```

Regras do ICO:
- **Minimização (LGPD, art. 6º III e art. 11)**: sem nome de vítima, sem
  dado clínico, sem CPF, sem cartão SUS. Telefone só em *hash*.
  Isso não é burocracia — é o que torna politicamente viável o SAMU
  publicar dados de saúde num índice hospedado na SSP.
- **Idempotência**: republicação da mesma ocorrência atualiza o registro,
  não cria outro.
- O ICO é *derivado*. Se corromper, reconstrói-se do sistema de origem.

---

## 5. Mapeamento do processo

### 5.1 As-Is (simplificado)

```
Solicitante liga → Atendente coleta dados → Classifica → Cadastra →
Despachante designa recursos → [se precisa de outro órgão]
→ liga por telefone / WhatsApp para a outra central → ???
```

Ponto cego: entre "Classifica" e "Cadastra" não existe nenhuma consulta
transversal. E o "???" é onde a duplicidade nasce e morre sem ser vista.

### 5.2 To-Be

```
Solicitante liga
   ↓
Atendente coleta dados (endereço, tipo, telefone)
   ↓
[GATILHO 1] Endereço geocodificado ou tipo classificado
   ↓
   ├─→ Painel de Ocorrências Próximas carrega em paralelo  ────┐
   │   (assíncrono, NÃO bloqueia o formulário)                 │
   ↓                                                            │
Atendente conclui cadastro  ←────────────────────────────────---┘
   ↓
[GATILHO 2] Ocorrência publicada no ICO
   ↓
Motor avalia candidatos → sugestões aparecem no painel do despachante
   ↓
Despachante decide:
   ├─ "É o mesmo evento" → VINCULAR → decide se mantém ou libera recurso
   ├─ "São eventos distintos" → DESCARTAR SUGESTÃO (feedback p/ calibração)
   └─ (não decide nada) → fluxo segue normalmente, sem prejuízo
```

Dois gatilhos, dois momentos, dois papéis. O gatilho 1 previne; o gatilho 2
corrige. Nenhum dos dois está no caminho crítico.

### 5.3 Onde isso encaixa nos processos já mapeados

O GT já identificou quatro processos com interação de raias. A deduplicação
é **transversal** a três deles:

| Processo do GT | Papel da deduplicação |
|---|---|
| Transferir Ligação | Antes de transferir, verificar se o destino já tem registro |
| Solicitar Recursos para Órgão Externo | Se já há ocorrência vinculada do outro órgão, a solicitação vira *confirmação*, não *acionamento* |
| Regular / Contrarregular Ocorrência | Regulador enxerga o registro do CBMDF sobre o mesmo evento |

Sugestão: tratar "Verificar Ocorrência Duplicada" como **subprocesso
reutilizável** no BPMN, não como atividade replicada em cada raia.

---

## 6. Arquitetura de desacoplamento

O requisito "não acoplar fortemente ao motor" resolve-se por uma inversão
simples.

### 6.1 A tela não é o fallback — é o produto

A intuição natural é: *construo o motor de IA, e a tela de últimas
ocorrências é o plano B se ele cair.* Isso produz acoplamento, porque o time
constrói a experiência em torno do motor.

Inverta:

> **A tela de ocorrências próximas é o produto. O motor apenas reordena a
> lista que a tela já mostraria sozinha.**

Assim, o frontend nunca escreve uma linha de código que dependa do motor
existir. O contrato é sempre o mesmo:

```
GET /eventos/candidatos?lat&lon&tipo&t0&raio&janela
→ 200 { "candidatos": [ {ocorrencia..., "score": 0.0-1.0, "motivo": "...", "estrategia": "GEO_TEMPORAL"} ],
        "estrategia_efetiva": "DETERMINISTICO|FUZZY|SEMANTICO|CRONOLOGICO",
        "degradado": false }
```

Com motor: lista ordenada por score, com justificativa.
Sem motor: **mesma resposta**, `score: null`, ordenação cronológica,
`estrategia_efetiva: "CRONOLOGICO"`, `degradado: true`.

O consumidor não muda. Isso é o desacoplamento — não é uma flag de
configuração, é a forma do contrato.

### 6.2 Cascata de estratégias (Chain of Responsibility)

Cada camada é independente, plugável e desligável por *feature flag*:

| Nível | Estratégia | Como funciona | Custo | Confiança |
|---|---|---|---|---|
| 0 | **Cronológica** | últimas N ocorrências no raio/janela, sem ranqueamento | ~0 | baixa (mas o humano ranqueia) |
| 1 | **Determinística** | mesmo hash de telefone; ou endereço normalizado idêntico | baixo | alta |
| 2 | **Geo-temporal** | haversine + decaimento temporal + matriz de tipos | baixo | média-alta |
| 3 | **Fuzzy textual** | Jaro-Winkler / trigram sobre endereço e resumo | médio | média |
| 4 | **Semântica (IA)** | *embeddings* do relato; ou LLM avaliando pares candidatos | alto | a medir |

Regra: **o nível N nunca é pré-requisito do nível N-1.** Se o 4 cair, o 3
responde. Se todos caírem, o 0 responde — e o 0 é uma query SQL.

O nível 4 só entra em produção **depois** de provar, em *shadow mode*, que
supera o nível 2 (§8, HU-19). Não antes.

### 6.3 Resiliência

- **Timeout agressivo**: 800 ms na chamada síncrona. Estourou, cai para o
  nível imediatamente inferior.
- **Circuit breaker**: 5 falhas em 30 s abre o circuito por 60 s; enquanto
  aberto, nível 0 direto, sem tentar.
- **Erro é invisível ao atendente.** Ele nunca vê "serviço indisponível" —
  vê uma lista menos inteligente. O estado degradado aparece discretamente
  ("ordenação por horário") e vai forte para o painel de observabilidade.
- **Sem motor não há bloqueio de nada.** Vale repetir porque é P1.

---

## 7. Regras de negócio

| ID | Regra |
|---|---|
| **RN-01** | A verificação de duplicidade nunca bloqueia, cancela ou atrasa cadastro ou despacho. |
| **RN-02** | Vincular, nunca fundir. Nenhum registro de origem é alterado pela deduplicação. |
| **RN-03** | Todo vínculo e todo desvínculo são reversíveis e auditados (quem, quando, estratégia, score, justificativa). |
| **RN-04** | **Janela temporal** padrão: 30 min antes / 15 min depois da abertura. Parametrizável por `tipo_canonico`. |
| **RN-05** | **Raio geográfico** por tipo (valores iniciais, a calibrar): acidente de trânsito 200 m; incêndio em edificação 100 m; incêndio florestal 1.500 m; afogamento 500 m; ocorrência em via expressa 400 m ao longo do eixo. |
| **RN-06** | Só são candidatas ocorrências de **tipos compatíveis**, conforme matriz de-para entre taxonomias (§7.1). |
| **RN-07** | **Bandas de score**: ≥ 0,85 → sugestão forte (destaque); 0,60–0,84 → sugestão fraca (lista); < 0,60 → não exibe. Limiares configuráveis sem *deploy*. |
| **RN-08** | **Fase 1: nenhum vínculo automático.** Todo vínculo exige ação humana explícita. Reavaliar após 90 dias de *shadow mode*. |
| **RN-09** | Exceção determinística: mesmo `hash_telefone_solicitante` + janela + tipos compatíveis → sugestão forte, independentemente de geolocalização. |
| **RN-10** | Ocorrências já encerradas dentro da janela **entram** na busca, sinalizadas como encerradas — são justamente as que indicam "já foi atendido". |
| **RN-11** | Geolocalização ausente ou de baixa precisão (> 500 m) → a estratégia geo é ignorada e usa-se texto; o candidato recebe *flag* de baixa confiança. |
| **RN-12** | O ICO armazena apenas os campos do §4.1. Dado pessoal sensível não trafega. |
| **RN-13** | Ocorrências de natureza sigilosa (violência sexual, tentativa de autoextermínio, ocorrências sob segredo de justiça) são indexadas com `tipo_canonico: RESERVADO` e resumo suprimido; participam do casamento geo-temporal, mas o conteúdo não é exibido a órgão não competente. |
| **RN-14** | Publicação no ICO é idempotente por (`orgao`, `id_ocorrencia`). |
| **RN-15** | Um evento pode ter mais de uma ocorrência do **mesmo** órgão (ex.: duas guarnições, dois trechos). Não é erro; gera alerta ao supervisor. |
| **RN-16** | Na exibição, ocorrências de **outros** órgãos têm precedência de ordenação sobre as do próprio órgão — é a informação que o atendente não possui hoje. |
| **RN-17** | Descartar uma sugestão é uma ação registrada, não um silêncio. É o rótulo negativo que calibra o motor. |
| **RN-18** | Vincular ocorrências **não** implica qualquer ação automática sobre recursos empenhados. Liberar viatura é decisão humana, em sistema próprio. |

### 7.1 Matriz de compatibilidade de tipos

Artefato obrigatório e provavelmente o item de maior esforço não-técnico do
projeto. Cada órgão tem taxonomia própria. Exemplo do formato:

| Tipo canônico | CBMDF (Hefesto) | SAMU (SAU) | PMDF | Compatível entre si? |
|---|---|---|---|---|
| ACIDENTE_TRANSITO | Colisão / Capotamento / Atropelamento | Trauma — acidente de trânsito | Acidente de trânsito | Sim |
| INCENDIO_EDIFICACAO | Incêndio em edificação | Queimadura / Intoxicação por fumaça | Apoio a incêndio | Sim |
| MAL_SUBITO | Atendimento pré-hospitalar clínico | Clínico | — | Sim |
| PARTO | Parto de emergência | Obstétrico | — | Sim |
| INCENDIO_FLORESTAL | Incêndio florestal | — | — | (raro cruzar) |

> **Recomendação de PO:** esta matriz é *dado*, não *código*. Tabela
> editável por área de negócio, versionada, sem *deploy*. Se virar `if/else`,
> o projeto morre na primeira mudança de taxonomia.

---

## 8. Épicos e histórias de usuário

**Personas:**
- **Atendente** (call-taker 190/192/193) — recebe a ligação, coleta, cadastra
- **Despachante** — designa e acompanha recursos
- **Regulador médico** (SAMU) — decide conduta clínica e recurso
- **Supervisor de sala** — resolve conflitos, audita
- **Analista SSP/BI** — consolida estatística
- **Gestor do GT** — mede resultado do projeto

Convenção dos critérios de aceite: Gherkin. Cada história é uma **fatia
vertical** (banco → API → tela), entregável e demonstrável isoladamente.

---

### ÉPICO 0 — Índice Canônico de Ocorrências

**HU-01 — Publicar ocorrência no ICO**
> Como **sistema de origem (Hefesto)**, quero publicar no ICO um registro
> mínimo de cada ocorrência aberta ou atualizada, para que ela possa ser
> considerada na verificação de duplicidade.

```gherkin
Dado que uma ocorrência é aberta no sistema de origem
Quando o evento de abertura é emitido
Então um registro correspondente existe no ICO em até 5 segundos
E o registro contém exatamente os campos do contrato ICO v1
E não contém nome, CPF, cartão SUS ou dado clínico

Dado que uma ocorrência já publicada é atualizada
Quando a atualização é emitida
Então o registro existente é atualizado (mesma chave orgao+id_ocorrencia)
E nenhum registro novo é criado
```
*Notas dev:* chave natural `(orgao, id_ocorrencia)`; publicação assíncrona
(fila); falha de publicação **não** propaga erro ao sistema de origem — vai
para DLQ e alerta.

---

**HU-02 — Consultar candidatos por geo e tempo**
> Como **aplicação cliente**, quero consultar o ICO por coordenada, tipo e
> janela temporal, para obter a lista de ocorrências potencialmente
> relacionadas.

```gherkin
Dado um ICO com ocorrências de múltiplos órgãos
Quando consulto GET /eventos/candidatos com lat, lon, tipo e t0
Então recebo as ocorrências dentro do raio e da janela do tipo (RN-04, RN-05)
E apenas de tipos compatíveis (RN-06)
E ordenadas cronologicamente, com ocorrências de outros órgãos primeiro (RN-16)
E o campo estrategia_efetiva vale "CRONOLOGICO"
E a resposta retorna em menos de 300 ms no percentil 95
```
*Notas dev:* índice geoespacial (PostGIS `ST_DWithin` ou equivalente) +
índice em `abertura`. Sem IA nesta história — de propósito.

---

**HU-03 — Manter a matriz de compatibilidade de tipos**
> Como **supervisor de sala**, quero manter o de-para entre as taxonomias dos
> órgãos, para que a verificação não sugira ocorrências irrelevantes.

```gherkin
Dado que sou supervisor autorizado
Quando altero o mapeamento de um tipo de origem para um tipo canônico
Então a alteração passa a valer para novas consultas sem necessidade de deploy
E a versão anterior fica preservada com data de vigência
```

---

### ÉPICO 1 — Painel de Ocorrências Próximas (MVP — entrega valor sozinho)

**HU-04 — Ver ocorrências próximas durante o atendimento**
> Como **atendente**, quero ver as ocorrências registradas por qualquer órgão
> perto do endereço que estou digitando, para perceber que o evento já foi
> comunicado antes de concluir o cadastro.

```gherkin
Dado que estou cadastrando uma ocorrência
Quando o endereço é geocodificado com precisão melhor que 500 m
Então um painel lateral carrega as ocorrências candidatas em paralelo
E o carregamento não trava, bloqueia ou atrasa nenhum campo do formulário
E cada item exibe órgão, horário, tipo, distância e status

Dado que o painel está carregando
Quando concluo o cadastro antes de o painel responder
Então o cadastro é concluído normalmente
```
*Notas dev:* esta é a história que já resolve boa parte do problema **sem
motor nenhum**. Se o projeto parar aqui, ainda assim entregou valor.

---

**HU-05 — Ver ocorrências próximas sem endereço geocodificado**
> Como **atendente**, quero ver ocorrências candidatas mesmo quando o
> endereço não geocodifica, para não perder a verificação nos casos de
> endereço impreciso (que são justamente os mais confusos).

```gherkin
Dado que o endereço não geocodificou ou tem precisão pior que 500 m
Quando informo a região administrativa e o tipo
Então o painel exibe candidatos filtrados por RA + tipo + janela
E cada item traz marcação visual de "baixa confiança de localização"
```

---

**HU-06 — Consultar duplicidade sob demanda**
> Como **despachante**, quero abrir a verificação de duplicidade a qualquer
> momento sobre uma ocorrência já cadastrada, para checar antes de solicitar
> apoio a outro órgão.

```gherkin
Dado que estou visualizando uma ocorrência em andamento
Quando aciono "Verificar duplicidade"
Então vejo os candidatos atuais
E vejo se já existe vínculo estabelecido para esta ocorrência
```

---

### ÉPICO 2 — Vinculação de eventos

**HU-07 — Vincular ocorrências ao mesmo evento**
> Como **despachante**, quero declarar que duas ocorrências tratam do mesmo
> evento, para que ambas as centrais passem a enxergar a relação.

```gherkin
Dado que vejo uma ocorrência candidata no painel
Quando seleciono "É o mesmo evento" e confirmo
Então as duas ocorrências passam a compartilhar o mesmo id_evento
E nenhum campo de qualquer das ocorrências de origem é alterado (RN-02)
E o vínculo é visível para as duas centrais em até 5 segundos
E o registro de auditoria grava usuário, órgão, data/hora, score e estratégia
E nenhum recurso é liberado ou empenhado automaticamente (RN-18)
```

---

**HU-08 — Desvincular**
> Como **supervisor de sala**, quero desfazer um vínculo incorreto, para
> corrigir erro sem perder o histórico.

```gherkin
Dado um vínculo existente
Quando o desfaço informando justificativa
Então cada ocorrência volta a ter id_evento próprio
E o vínculo anterior permanece no histórico como "desfeito"
E a justificativa é obrigatória e fica registrada
```

---

**HU-09 — Descartar sugestão**
> Como **despachante**, quero marcar uma sugestão como "eventos distintos",
> para limpar minha tela e alimentar a calibração do motor.

```gherkin
Dado que vejo uma sugestão de duplicidade
Quando marco "São eventos distintos"
Então a sugestão não reaparece para esta ocorrência
E o descarte é registrado como rótulo negativo para calibração (RN-17)
```

---

**HU-10 — Ver ocorrência vinculada de outro órgão**
> Como **regulador médico**, quero ver as informações públicas da ocorrência
> vinculada do CBMDF, para regular com o quadro completo.

```gherkin
Dado um evento com ocorrências de CBMDF e SAMU vinculadas
Quando abro a ocorrência no SAU
Então vejo órgão, horário, tipo, status e recursos empenhados da ocorrência do CBMDF
E não vejo campos classificados como reservados (RN-13)
E o acesso é registrado em log de auditoria
```

---

### ÉPICO 3 — Motor de similaridade

**HU-11 — Detecção determinística por telefone**
> Como **atendente**, quero que o sistema destaque ocorrências abertas a
> partir do mesmo telefone solicitante, para identificar o rechamado imediato.

```gherkin
Dado que informei o telefone do solicitante
Quando existe ocorrência na janela com o mesmo hash de telefone e tipo compatível
Então ela aparece no topo com marcação de sugestão forte (RN-09)
E o motivo exibido é "mesmo telefone solicitante"
```

---

**HU-12 — Detecção determinística por endereço normalizado**
```gherkin
Dado um endereço normalizado idêntico a outro na janela
Quando os tipos são compatíveis
Então a ocorrência aparece como sugestão forte
E o motivo exibido é "mesmo endereço"
```
*Notas dev:* normalização de endereço do DF é um sub-problema real
(QNL/QNM, quadras, conjuntos, entrequadras, DF-xxx, rodovias com marco
quilométrico). Vale história técnica dedicada — ver HU-13.

---

**HU-13 — [Técnica] Normalizador de endereços do DF**
> Como **time de desenvolvimento**, quero um serviço de normalização de
> endereços do DF, para que comparações textuais sejam confiáveis.

```gherkin
Dado "SHIS QI 15 CONJ 3 CASA 12" e "shis qi15 cj3 c12"
Quando ambos são normalizados
Então produzem a mesma forma canônica

Dado "EPTG km 5" e "DF-095 km 5"
Quando ambos são normalizados
Então produzem a mesma forma canônica com marco quilométrico extraído
```

---

**HU-14 — Score geo-temporal**
> Como **despachante**, quero que os candidatos venham ordenados por
> probabilidade de serem o mesmo evento, para não ler uma lista longa.

```gherkin
Dado dois candidatos na janela
Quando um está a 50 m e 2 min de diferença e outro a 400 m e 25 min
Então o primeiro tem score maior
E cada candidato exibe motivo legível ("120 m, 3 min, tipo compatível")
E candidatos com score abaixo de 0,60 não são exibidos (RN-07)
```

---

**HU-15 — Similaridade textual do relato**
```gherkin
Dado dois relatos descrevendo o mesmo evento com palavras diferentes
Quando a estratégia textual é aplicada
Então a similaridade contribui para o score composto
E o peso da contribuição textual é configurável sem deploy
```

---

**HU-16 — Avaliação semântica assistida por IA** *(atrás de feature flag)*
> Como **despachante**, quero uma avaliação semântica dos pares candidatos,
> para capturar casos que regra e distância textual não pegam.

```gherkin
Dado um par de ocorrências candidatas
Quando a estratégia semântica está habilitada
Então o motor produz score e justificativa em linguagem natural
E a justificativa é exibida ao operador junto da sugestão
E a decisão de vincular permanece exclusivamente humana (RN-08)
E se a estratégia falhar ou estourar 800 ms, o resultado do nível inferior é usado
E o operador não vê mensagem de erro
```
*Notas dev:* prompt versionado como artefato; entrada limitada aos campos do
ICO (sem dado pessoal); resposta em JSON estrito com validação de schema;
resposta inválida = falha = cai para nível inferior.

---

### ÉPICO 4 — Integração SAMU (fora da SSP)

**HU-17 — Publicar ocorrências do SAU no ICO**
> Como **SES-DF/SAMU**, quero publicar no ICO os campos mínimos das minhas
> ocorrências, para participar da deduplicação sem expor dado de saúde.

```gherkin
Dado que o SAU abre uma ocorrência
Quando o registro é publicado no ICO
Então trafegam apenas os campos do contrato ICO v1
E nenhum dado pessoal sensível de saúde é transmitido (RN-12)
E o tráfego ocorre em canal cifrado com autenticação mútua
E há registro de tratamento para fins de RIPD/LGPD
```
*Notas dev/negócio:* dependência de **instrumento jurídico** entre SSP e
SES-DF. Levantar cedo — é o caminho crítico, não a tecnologia.

---

**HU-18 — Tolerância a indisponibilidade do SAMU**
```gherkin
Dado que a publicação do SAU está indisponível
Quando consulto candidatos
Então recebo os candidatos dos demais órgãos normalmente
E o painel informa "dados do SAMU indisponíveis — última sincronização às HH:MM"
E nenhuma funcionalidade é bloqueada
```

---

### ÉPICO 5 — Calibração e observabilidade

**HU-19 — Shadow mode**
> Como **gestor do GT**, quero rodar cada nova estratégia em modo sombra,
> comparando suas sugestões com as decisões humanas, para só promovê-la à
> produção quando os números justificarem.

```gherkin
Dado que uma estratégia está em modo sombra
Quando ela avalia candidatos
Então os resultados são gravados mas não exibidos a nenhum operador
E o painel de calibração mostra precisão, revocação e sobreposição com a estratégia ativa
E a promoção para produção é uma ação explícita e reversível
```
*Nota de PO:* **esta história vem antes de qualquer discussão sobre qual
modelo de IA usar.** Sem ela, não há como saber se a IA melhora ou piora o
resultado — e o custo do erro (§3) não permite descobrir em produção.

---

**HU-20 — Painel de qualidade da deduplicação**
> Como **analista SSP**, quero acompanhar métricas de duplicidade, para medir
> o efeito do produto.

```gherkin
Quando abro o painel
Então vejo: eventos multi-órgão / total, vínculos por estratégia,
     taxa de descarte de sugestões, taxa de desvínculo,
     tempo mediano até vínculo, % de consultas em modo degradado
E posso filtrar por órgão, tipo, RA e período
```

---

**HU-21 — Estatística por evento, não por ocorrência**
> Como **analista SSP**, quero contar eventos além de ocorrências, para
> reportar o volume real de fatos atendidos no DF.

```gherkin
Dado um período com ocorrências vinculadas
Quando extraio o relatório consolidado
Então vejo contagem de eventos e contagem de ocorrências separadamente
E a diferença entre as duas é a taxa de duplicidade intersetorial
```

---

## 9. Métricas de sucesso

| Métrica | O que mede | Meta inicial |
|---|---|---|
| **Taxa de duplicidade intersetorial** | eventos multi-órgão / total de eventos | *baseline a estabelecer* |
| **Empenhos redundantes evitados** | vínculos que levaram à liberação de recurso | ↑ |
| **Precisão das sugestões** | vínculos aceitos / sugestões fortes exibidas | ≥ 0,80 |
| **Taxa de desvínculo** | *proxy* de falso positivo — a métrica mais crítica | ≤ 2 % |
| **Tempo até vínculo** | da 2ª abertura ao vínculo | ↓ |
| **Impacto no tempo de cadastro** | segundos a mais no atendimento | **= 0** (não negociável) |
| **% de consultas degradadas** | saúde do motor | ≤ 5 % |

A quarta linha é a que mata o produto se subir. Instrumentar desde a HU-07.

---

## 10. Requisitos não funcionais

| ID | Requisito |
|---|---|
| NFR-01 | Consulta de candidatos: p95 ≤ 300 ms (nível 0–2); ≤ 800 ms com nível 4 |
| NFR-02 | Publicação no ICO: p95 ≤ 5 s da abertura à disponibilidade |
| NFR-03 | Disponibilidade do ICO ≥ 99,5 %; indisponibilidade **nunca** afeta cadastro ou despacho |
| NFR-04 | Toda chamada externa com timeout, *retry* com *backoff* e *circuit breaker* |
| NFR-05 | Auditoria imutável de vínculos, desvínculos, descartes e acessos a dados de outro órgão |
| NFR-06 | Minimização de dados e base legal LGPD documentada (RIPD); dados de saúde tratados sob art. 11 |
| NFR-07 | Autenticação por órgão + autorização por papel; segregação de visibilidade para RN-13 |
| NFR-08 | Feature flags por estratégia, com desligamento em tempo de execução |
| NFR-09 | Parâmetros (raios, janelas, limiares, pesos) configuráveis sem *deploy* |
| NFR-10 | Contrato ICO versionado; mudança incompatível exige nova versão em paralelo |

---

## 11. Roteiro por fatias verticais

| Fatia | Conteúdo | Valor entregue | Depende de IA? |
|---|---|---|---|
| **F1** | HU-01, 02, 04 (só órgãos da SSP) | Atendente enxerga ocorrências próximas dos outros órgãos | Não |
| **F2** | HU-07, 08, 09, 20 | Vínculo, auditoria e primeira medição real de duplicidade | Não |
| **F3** | HU-11, 12, 13, 14 | Sugestões ordenadas e confiáveis | Não |
| **F4** | HU-17, 18, 10 | SAMU entra no índice — fecha o escopo do GT | Não |
| **F5** | HU-19, 15 | Calibração e similaridade textual | Não |
| **F6** | HU-16 (shadow) | Avaliação semântica medida contra o baseline | Sim |
| **F7** | HU-16 (produção) | Promoção condicionada às métricas de F6 | Sim |

Duas leituras importantes deste roteiro:

1. **A IA aparece na sexta fatia.** Não porque seja dispensável, mas porque
   antes dela não existe *baseline* contra o qual medir ganho, nem rótulos
   humanos para calibrar. Começar pela IA é começar sem régua.
2. **Nenhuma fatia é pré-requisito da seguinte em termos de contrato.** A
   API do §6.1 é a mesma em F1 e em F7. É isso que impede o acoplamento.

---

## 12. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Falso positivo leva a não atendimento | Crítico | P1–P3; RN-08; métrica de desvínculo; sem ação automática sobre recursos |
| Instrumento jurídico SSP↔SES-DF atrasa | Alto | F1–F3 não dependem do SAMU; iniciar tratativa jurídica em paralelo à F1 |
| Excesso de sugestões irrelevantes → operador ignora o painel ("fadiga de alerta") | Alto | RN-07 (limiar de exibição); medir taxa de descarte; se > 40 %, subir limiar |
| Taxonomias divergentes inviabilizam o de-para | Médio | HU-03 como dado editável; começar com 5 tipos de maior volume |
| Painel aumenta tempo de atendimento | Alto | NFR-01; carregamento assíncrono; medir explicitamente |
| Motor vira dependência oculta | Médio | Contrato único do §6.1; teste automatizado que roda a suíte com motor desligado |

---

## 13. Decisões em aberto

1. **Onde o ICO é hospedado?** SSP é o natural (3 dos 4 órgãos já estão lá),
   mas cria assimetria política com a SES-DF. Alternativa: barramento
   neutro. Impacto jurídico maior que técnico.
2. **Quem é o dono do `id_evento`?** Sugestão: gerado pelo ICO, nunca por
   sistema de órgão — evita disputa de precedência.
3. **RN-13 (ocorrências reservadas):** o modelo proposto indexa mas suprime.
   Precisa de validação jurídica antes da F1.
4. **Vínculo automático em caso determinístico (RN-08/RN-09):** manter
   sempre humano, ou permitir automático após métricas de F5? Recomendação:
   decidir só com os dados na mão.
5. **A tela vive no Hefesto/SAU ou é aplicação própria embarcada?** Embarcar
   reduz atrito de adoção; aplicação própria acelera entrega. Trade-off de
   produto, não de arquitetura.
6. **Escopo do GT:** hoje está restrito a Hefesto ↔ SAU. Estender a
   PMDF/PCDF exige repactuação — mas o modelo já nasce preparado.

---

## 14. Definição de pronto (sugestão para o time)

Uma história está pronta quando:
- [ ] critérios de aceite automatizados e verdes
- [ ] a suíte de testes passa **com todas as estratégias de motor desligadas**
- [ ] métricas do §9 afetadas estão instrumentadas
- [ ] parâmetros novos estão em configuração, não em código
- [ ] auditoria registra a ação, quando aplicável
- [ ] nenhum caminho novo bloqueia cadastro ou despacho (revisão explícita de P1)
