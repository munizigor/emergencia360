# Documento de Visão do Produto

## Painel de Ocorrências Correlatas — Verificação de Duplicidade de Ocorrências entre Órgãos de Emergência do DF

### Metadados
- **Versão:** 1.0
- **Status:** Rascunho
- **Data da última atualização:** 2026-08-06
- **Autor:** Igor Muniz — CBMDF
- **Revisor:** GT APH Móvel DF (revisor a designar)
- **Documento de referência:** `docs/dedup-ocorrencias-spec-po.md` — Documento de Product Owner, versão 0.1
- **Programa:** Emergência 360 — integração Hefesto (SSP) ↔ SAU (SES-DF/SAMU), com extensão prevista a PMDF e PCDF

---

## 1. Introdução

### 1.1 Propósito

Este documento define, em alto nível, o problema, a proposta de solução e o escopo do **Painel de Ocorrências Correlatas** — o componente do programa **Emergência 360** responsável por identificar que ocorrências registradas por órgãos diferentes tratam do mesmo fato do mundo real. Ele estabelece o entendimento comum entre o patrocínio institucional (SSP/DF), o GT APH Móvel DF, os órgãos participantes (CBMDF, SES-DF/SAMU, PMDF e PCDF), as áreas jurídica e de proteção de dados, e a equipe técnica responsável pela construção.

O documento orienta as decisões de escopo, de prioridade e de aceitação do produto. Ele **não** substitui o documento de Product Owner, que permanece como detalhamento executável das histórias, das regras de negócio e dos contratos técnicos; este documento é o artefato de alinhamento e aprovação institucional que antecede e enquadra aquele.

### 1.2 Escopo

O produto cobre o ciclo que vai **do momento em que uma central de emergência registra uma ocorrência** até **a consolidação estatística por evento**, atravessando os seguintes macrofluxos:

1. **Publicação** — cada sistema de origem (Hefesto, SAU e, futuramente, os sistemas de PMDF e PCDF) publica no Índice Canônico de Ocorrências (ICO) um registro mínimo de cada ocorrência aberta ou atualizada.
2. **Consulta de candidatos** — dada uma coordenada, um tipo e um instante, o produto devolve as ocorrências de qualquer órgão potencialmente relacionadas ao mesmo fato.
3. **Exibição ao operador** — o atendente vê essas ocorrências durante o cadastro, sem que isso interfira no preenchimento; o despachante as vê ao decidir sobre apoio externo.
4. **Decisão humana** — o operador declara "é o mesmo evento" (vínculo) ou "são eventos distintos" (descarte). Ambas as ações são registradas.
5. **Reversão e auditoria** — todo vínculo pode ser desfeito por supervisor, com justificativa, preservando o histórico.
6. **Calibração e observabilidade** — as decisões humanas alimentam a medição da qualidade das sugestões e a promoção controlada de novas estratégias de detecção.

#### Fora de escopo

Declaração explícita, para evitar expectativa divergente entre os órgãos:

- **Não funde, não mescla e não altera registros.** Cada órgão permanece dono e íntegro do seu próprio registro; a deduplicação apenas declara que dois registros falam do mesmo fato.
- **Não despacha, não empenha e não libera recursos.** Vincular ocorrências não produz nenhuma ação automática sobre viaturas ou ambulâncias — isso continua sendo decisão humana, tomada no sistema próprio de cada órgão.
- **Não é prontuário nem repositório clínico compartilhado.** Nenhum dado pessoal sensível de saúde trafega ou é armazenado no índice.
- **Não substitui a comunicação entre centrais** — a instrumenta, dando ao telefonema e à solicitação formal de apoio a informação que hoje eles não têm.
- **Não é sistema de despacho.** O produto é uma camada de consulta e vinculação sobre os sistemas de despacho existentes, não um substituto deles.

### 1.3 Definições, Acrônimos e Abreviações

| Sigla/Termo | Definição |
| --- | --- |
| **Evento** | O fato do mundo real (a colisão, o incêndio, a parada cardiorrespiratória). Existe uma única vez, independentemente de quantas centrais o registrem. |
| **Ocorrência** | O registro que **um** órgão faz sobre um evento. Um mesmo evento pode gerar várias ocorrências, uma por órgão acionado. |
| **ICO** | Índice Canônico de Ocorrências — base compartilhada que armazena o registro mínimo de cada ocorrência de cada órgão, suficiente para casar eventos e nada além disso. |
| **Vínculo** | Declaração de que duas ou mais ocorrências tratam do mesmo evento, materializada pela atribuição do mesmo `id_evento`. Sempre reversível. |
| **SSP/DF** | Secretaria de Estado de Segurança Pública do Distrito Federal. |
| **CBMDF** | Corpo de Bombeiros Militar do Distrito Federal. |
| **SES-DF** | Secretaria de Estado de Saúde do Distrito Federal. |
| **SAMU** | Serviço de Atendimento Móvel de Urgência (192), vinculado à SES-DF. |
| **PMDF / PCDF** | Polícia Militar do Distrito Federal (190) / Polícia Civil do Distrito Federal. |
| **Hefesto** | Sistema de atendimento e despacho de ocorrências utilizado no âmbito da SSP/DF (CBMDF). |
| **SAU** | Sistema de atendimento às urgências utilizado pelo SAMU/SES-DF. |
| **GT APH Móvel DF** | Grupo de Trabalho de Atendimento Pré-Hospitalar Móvel do DF, responsável pela condução do programa Emergência 360. |
| **APH** | Atendimento Pré-Hospitalar. |
| **RA** | Região Administrativa do Distrito Federal. |
| **Tipo canônico** | Classificação de ocorrência comum a todos os órgãos, para a qual as taxonomias próprias de cada sistema são mapeadas. |
| **Score** | Valor entre 0 e 1 que expressa a confiança de que duas ocorrências tratam do mesmo evento. |
| **Shadow mode** | Modo de operação em que uma estratégia de detecção avalia candidatos e grava resultados sem exibi-los a nenhum operador, para comparação com as decisões humanas reais. |
| **Feature flag** | Chave de configuração que liga ou desliga uma funcionalidade em tempo de execução, sem nova implantação. |
| **Modo degradado** | Estado em que uma ou mais estratégias de detecção estão indisponíveis e a resposta é produzida por uma estratégia de nível inferior, sem interrupção do serviço. |
| **LGPD** | Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais. |
| **RIPD** | Relatório de Impacto à Proteção de Dados Pessoais. |
| **DPO / Encarregado** | Encarregado pelo tratamento de dados pessoais, nos termos do art. 41 da LGPD. |
| **DLQ** | *Dead Letter Queue* — fila de mensagens que falharam no processamento e aguardam tratamento, sem bloquear o fluxo principal. |

---

## 2. Posicionamento

### 2.1 Oportunidade de Negócio

Uma colisão na EPTG gera três telefonemas: um passante liga 190, o motorista liga 193, um terceiro liga 192. Três centrais abrem três registros. **Nenhuma delas sabe da existência das outras duas.**

O resultado não é "dado sujo". É **recurso operacional deslocado em duplicidade** — uma viatura e uma ambulância indo ao mesmo local enquanto outra ocorrência, em outro ponto do DF, espera atendimento. O efeito primário do problema é operacional e mede-se em tempo-resposta; o efeito secundário é de gestão: os números do Distrito Federal somam **ocorrências**, não **eventos**, e por isso não há como responder com precisão quantos fatos o sistema de emergência do DF atendeu em um período.

Hoje a lacuna é preenchida informalmente. Quando um despachante desconfia que outro órgão já foi acionado, ele liga para a outra central ou pergunta em grupo de WhatsApp — sem rastreabilidade, sem base legal para o tratamento do dado e sem auditoria. A informação existe; o que não existe é canal institucional para ela.

Este é o momento de resolver porque o GT APH Móvel DF já mapeou os processos de interação entre as centrais e já negocia a integração Hefesto ↔ SAU. A deduplicação não é uma iniciativa paralela: é o que dá conteúdo útil a essa integração.

> **Mantra do projeto: "um evento, um quadro".** Não se trata de unificar sistemas, e sim de garantir que quem decide enxergue o fato inteiro.

### 2.2 Causa-Raiz Identificada

O pedido chegou como *"verificar se a ocorrência já foi registrada"*, o que sugere um problema de **registro duplicado em banco de dados** — algo que se resolveria com chave única. Não é esse o problema.

**Sintoma:** registros aparentemente redundantes espalhados por sistemas diferentes.

**Causa-raiz:** **não existe nenhum índice transversal às centrais.** Cada órgão enxerga apenas as próprias ocorrências, e o mesmo fato do mundo real produz N acionamentos independentes em N sistemas mutuamente cegos. O problema não está dentro de nenhum dos bancos — está no espaço entre eles, que hoje não é ocupado por sistema nenhum.

Os sintomas dessa lacuna, levantados junto às centrais:

| # | Dor | Consequência | Quem sofre |
| --- | --- | --- | --- |
| **D1** | Múltiplos acionamentos do mesmo evento em centrais distintas | Empenho redundante de viaturas e ambulâncias | População — o recurso fica indisponível para outro chamado |
| **D2** | O atendente não tem como saber se outro órgão já foi acionado | Retrabalho de coleta de dados com o solicitante | Solicitante e atendente |
| **D3** | Solicitação de apoio a outro órgão feita "no escuro" | O órgão apoiador já está a caminho — ou não está, e ninguém sabe | Despachante |
| **D4** | Consolidação estatística intersetorial impossível | Os números do DF somam ocorrências, não eventos | SSP/DF, gestão e BI |
| **D5** | Regulação e contrarregulação sem visão do que o outro órgão registrou | Decisão clínica e operacional tomada com informação parcial | Regulador médico |
| **D6** | A informação circula por WhatsApp para suprir a lacuna | Sem rastreabilidade, sem base legal, sem auditoria | Todos os órgãos |

**Consequência agregada:** o tempo-resposta do sistema de emergência do DF é pior do que a soma da eficiência de cada central, porque parte da capacidade instalada é consumida atendendo o mesmo fato mais de uma vez.

### 2.3 Declaração do Problema

| Campo | Preenchimento |
| --- | --- |
| **O problema de** | um mesmo evento real gerar acionamentos independentes em centrais que não enxergam umas às outras |
| **Afeta** | atendentes, despachantees e reguladores médicos das centrais 190, 192 e 193; a gestão da SSP/DF; e, em última instância, a população que aguarda atendimento |
| **Cujo impacto é** | empenho redundante de recursos operacionais, retrabalho na coleta de dados, decisão de apoio externo tomada sem informação e impossibilidade de consolidar estatística intersetorial por evento |
| **Uma solução bem-sucedida seria** | dar ao operador, no momento da decisão, a visão das ocorrências registradas por qualquer órgão nas proximidades e na janela temporal relevante — reduzindo o empenho redundante e tornando informada a decisão de solicitar apoio, sem jamais atrasar ou bloquear o atendimento |

**Hipótese de valor a ser verificada:** se o atendente e o despachante enxergarem, no momento do cadastro e do despacho, as ocorrências registradas por qualquer órgão nas proximidades e na janela temporal relevante, então a taxa de empenho redundante cairá e a decisão de solicitar apoio externo passará a ser informada. As métricas que verificam essa hipótese estão na §10.

### 2.4 Declaração de Posição do Produto

- **Para:** atendentes, despachantees e reguladores médicos das centrais de emergência do Distrito Federal (190, 192 e 193)
- **Que:** precisam saber, no momento em que decidem, se outro órgão já foi acionado para o mesmo fato
- **O Painel de Ocorrências Correlatas:** é uma camada de interoperabilidade operacional entre as centrais de emergência do DF
- **Que:** exibe as ocorrências de qualquer órgão próximas no espaço e no tempo, permite declarar que duas delas tratam do mesmo evento e mantém essa relação auditável e reversível
- **Diferente de:** telefonemas entre centrais e grupos de WhatsApp, que suprem a lacuna hoje sem rastreabilidade, sem base legal e sem memória institucional
- **Nosso produto:** **sugere sem bloquear, vincula sem fundir e funciona sem inteligência artificial** — nenhum órgão cede o controle sobre seus próprios dados, e nenhum atendimento depende do produto estar disponível.

### 2.5 Princípios de Produto

Esta seção antecede deliberadamente a descrição da solução. Ela contém a decisão estruturante do produto, e é sobre ela que se pede a aprovação consciente do patrocínio.

**Os dois erros possíveis não são simétricos:**

| Erro | O que acontece | Custo | Reversível? |
| --- | --- | --- | --- |
| **Falso negativo** — o sistema não detecta uma duplicidade real | Duas guarnições vão ao mesmo local | Desperdício de recurso. É exatamente o *status quo* de hoje. | **Sim** |
| **Falso positivo** — o sistema marca como duplicata algo que não é | Uma ocorrência real é tratada como já atendida e **ninguém vai** | Potencialmente uma vida | **Não** |

Um erro devolve o sistema ao estado atual. O outro é irreversível. Toda a arquitetura do produto decorre dessa assimetria:

> **P1 — A verificação de duplicidade jamais bloqueia, cancela ou atrasa o cadastro ou o despacho.**
> Ela sugere; o ser humano decide; o atendimento segue. Não há caminho no produto em que a indisponibilidade de um componente impeça alguém de ser socorrido.

> **P2 — Vincular, nunca fundir.**
> Nenhum registro é apagado, mesclado ou sobrescrito. Cada órgão continua dono e íntegro do seu próprio registro. A deduplicação apenas *declara* que dois registros falam do mesmo evento.

> **P3 — Todo vínculo é reversível**, por ação humana identificada, com justificativa obrigatória e trilha de auditoria imutável.

P1–P3 protegem o produto do pior cenário e, de quebra, resolvem a questão política: **nenhum órgão precisa ceder controle sobre seus dados para o produto funcionar.** É essa propriedade que torna a adesão da SES-DF viável.

---

## 3. Envolvidos e Usuários

### 3.1 Resumo dos Stakeholders

| Nome/Área | Função | Responsabilidade no Projeto |
| --- | --- | --- |
| **SSP/DF** | Patrocínio institucional | Aprovar a adoção, decidir sobre a hospedagem do ICO e sustentar a governança intersetorial do índice. |
| **GT APH Móvel DF** | Condução do programa Emergência 360 | Priorizar o roteiro, mediar a pactuação entre órgãos e aprovar a promoção de cada fatia. |
| **CBMDF / Hefesto** | Órgão participante e sistema de origem | Publicar ocorrências no ICO, consumir o painel nas salas de operação e validar o mapeamento da sua taxonomia. |
| **SES-DF / SAMU / SAU** | Órgão participante e sistema de origem | Publicar os campos mínimos das ocorrências do SAU e validar a suficiência do contrato quanto à proteção de dados de saúde. |
| **PMDF** | Órgão participante (extensão prevista) | Publicar e consumir; participar da matriz de compatibilidade de tipos. |
| **PCDF** | Órgão participante (extensão prevista) | Publicar e consumir, observadas as restrições de ocorrências sob sigilo. |
| **Encarregados de dados (DPO) dos órgãos** | Proteção de dados pessoais | Validar a minimização do contrato ICO, aprovar o RIPD e definir a base legal do compartilhamento — em especial para os dados sob o art. 11 da LGPD. |
| **Assessoria jurídica SSP/DF e SES-DF** | Instrumento jurídico | Celebrar o acordo de cooperação/convênio que autoriza o compartilhamento SSP ↔ SES-DF. **É o caminho crítico do projeto, e precisa de responsável nomeado desde a Fatia 1.** |
| **Supervisores de sala das centrais** | Operação e governança de dados | Manter a matriz de compatibilidade de tipos e arbitrar vínculos contestados. |
| **Equipe técnica do Emergência 360** | Construção | Implementar o ICO, o painel, o motor e a observabilidade, garantindo a independência do produto em relação ao motor. |

### 3.2 Perfil dos Usuários

| Usuário | Descrição | Principais Necessidades |
| --- | --- | --- |
| **Atendente (*call-taker* 190/192/193)** | Recebe a ligação, coleta os dados do solicitante, classifica e cadastra a ocorrência. Trabalha sob pressão de tempo e não pode ter o fluxo interrompido. | Perceber, **enquanto ainda digita**, que aquele fato já foi comunicado por outra pessoa a outra central — sem que a consulta acrescente um único segundo ao cadastro. |
| **Despachante** | Designa e acompanha os recursos empenhados; decide quando solicitar apoio de outro órgão. | Saber se o órgão que ele pretende acionar já está a caminho, e poder declarar formalmente que duas ocorrências são o mesmo evento. |
| **Regulador médico (SAMU)** | Decide a conduta clínica e o recurso adequado a cada caso. | Enxergar o que o CBMDF registrou sobre o mesmo evento — tipo, status e recursos empenhados — para regular com o quadro completo. |
| **Supervisor de sala** | Resolve conflitos entre operadores, audita decisões e mantém parâmetros operacionais. | Desfazer vínculos incorretos com justificativa, manter o de-para entre as taxonomias dos órgãos e acompanhar alertas de múltiplas ocorrências do próprio órgão em um mesmo evento. |
| **Analista SSP/BI** | Consolida a estatística intersetorial de emergências do DF. | Contar **eventos**, e não apenas ocorrências, e medir a taxa de duplicidade intersetorial por órgão, tipo, RA e período. |
| **Gestor do GT** | Mede o resultado do projeto e decide sobre a evolução do produto. | Acompanhar precisão das sugestões, taxa de desvínculo e saúde do serviço; promover ou reverter estratégias com base em dados, não em impressão. |

---

## 4. Visão Geral do Produto

### 4.1 Perspectiva do Produto

**Estado atual.** Cada central opera um sistema próprio e completo de atendimento e despacho, sem nenhuma consulta transversal entre eles. Entre "classificar" e "cadastrar" não existe hoje nenhum ponto em que o atendente possa verificar o que outra central registrou. A coordenação entre órgãos acontece por telefone e por mensageria informal, depois do fato.

**Evolução esperada.** O produto ocupa exatamente esse espaço vazio, sem entrar no caminho crítico de nenhum sistema existente. Ele introduz uma entidade nova, e é essa entidade que dissolve o problema:

```
        EVENTO (o fato no mundo real)
        id_evento (UUID)
              |
              | 1 : N
              v
        OCORRÊNCIA (o registro de UM órgão sobre o evento)
        id_ocorrencia + orgao  (chave natural)
```

- **Evento:** a colisão na EPTG. Existe uma vez.
- **Ocorrência:** o registro do CBMDF sobre a colisão. O registro do SAMU sobre a colisão. O registro da PMDF. Três ocorrências, um evento.

Deduplicar, nesse modelo, é **atribuir o mesmo `id_evento` a ocorrências de órgãos diferentes**. Nada é destruído; a operação é puramente aditiva. Uma ocorrência sem vínculo simplesmente tem um `id_evento` só dela — não existe o estado "não deduplicado", e com isso desaparece uma classe inteira de ambiguidade no modelo.

**O Índice Canônico de Ocorrências (ICO).** O produto **não** consulta os sistemas de origem. Cada órgão publica no ICO um registro mínimo — o suficiente para casar eventos e nada além disso:

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

Três propriedades do ICO merecem destaque para o patrocínio:

- **Minimização de dados (LGPD, art. 6º, III e art. 11).** Sem nome de vítima, sem dado clínico, sem CPF, sem cartão SUS; telefone apenas em *hash*. Isso não é formalidade jurídica — é a condição que torna politicamente viável o SAMU publicar dados em um índice hospedado fora da SES-DF.
- **Idempotência.** Republicar a mesma ocorrência atualiza o registro existente; nunca cria outro.
- **O ICO é derivado.** Se for corrompido ou perdido, reconstrói-se a partir dos sistemas de origem. Ele não é fonte da verdade de nada.

**Onde o produto se insere nos processos já mapeados pelo GT.** A verificação de duplicidade é transversal a três dos processos com interação de raias já identificados, e recomenda-se modelá-la como **subprocesso reutilizável** no BPMN, não como atividade replicada em cada raia:

| Processo mapeado pelo GT | Papel da deduplicação |
| --- | --- |
| Transferir Ligação | Antes de transferir, verificar se a central de destino já possui registro do mesmo evento. |
| Solicitar Recursos para Órgão Externo | Havendo ocorrência vinculada do outro órgão, a solicitação deixa de ser *acionamento* e passa a ser *confirmação*. |
| Regular / Contrarregular Ocorrência | O regulador enxerga o registro do CBMDF sobre o mesmo evento antes de decidir a conduta. |

**Interoperabilidade prevista:**

| Sistema Externo | Função na Solução | Tipo de Integração |
| --- | --- | --- |
| **Hefesto (CBMDF/SSP)** | Publica ocorrências no ICO e consome o painel de candidatos | Evento assíncrono (fila) para publicação + API REST para consulta |
| **SAU (SAMU/SES-DF)** | Publica ocorrências no ICO e consome o painel e os vínculos | Evento assíncrono + API REST, em canal cifrado com autenticação mútua |
| **Sistemas de despacho da PMDF e da PCDF** | Publicam e consomem (extensão prevista) | Evento assíncrono + API REST |
| **Serviço de geocodificação** | Converte endereço textual em coordenada com indicação de precisão | API REST, com degradação para busca por RA quando indisponível (HU05.2) |
| **Plataforma de observabilidade da SSP** | Recebe métricas de saúde, degradação e qualidade das sugestões | Exportação de métricas e *logs* |

### 4.2 Resumo dos Principais Recursos

Em ordem de valor entregue:

1. **Painel de Ocorrências Próximas durante o atendimento** — enquanto o atendente digita o endereço, uma lista lateral carrega as ocorrências de qualquer órgão próximas no espaço e no tempo, de forma assíncrona e sem interferir em nenhum campo do formulário. *Este recurso sozinho já resolve boa parte do problema, sem motor de similaridade nenhum.*
2. **Índice Canônico de Ocorrências (ICO)** — base compartilhada com o registro mínimo de cada ocorrência de cada órgão, minimizada por desenho e idempotente por natureza.
3. **Vinculação de ocorrências ao mesmo evento** — o operador declara que duas ocorrências tratam do mesmo fato; ambas as centrais passam a enxergar a relação, sem que nenhum registro de origem seja alterado.
4. **Desvinculação e descarte de sugestão** — toda decisão é reversível e toda recusa é registrada, virando insumo de calibração em vez de silêncio.
5. **Consulta de duplicidade sob demanda** — o despachante aciona a verificação a qualquer momento sobre uma ocorrência em andamento, tipicamente antes de solicitar apoio a outro órgão.
6. **Visão da ocorrência vinculada de outro órgão** — o regulador médico enxerga tipo, status e recursos empenhados do registro do outro órgão, respeitadas as restrições de sigilo, com acesso auditado.
7. **Motor de similaridade em cascata** — estratégias determinísticas, geo-temporais e textuais ordenam os candidatos por probabilidade e exibem o motivo em linguagem legível ("120 m, 3 min, tipo compatível").
8. **Painel de qualidade e estatística por evento** — métricas de duplicidade intersetorial, precisão das sugestões, taxa de desvínculo e contagem de **eventos** além de ocorrências.
9. **Avaliação semântica assistida por IA** *(atrás de feature flag, sujeita a comprovação em shadow mode)* — captura casos que regra e distância textual não pegam, produzindo score e justificativa em linguagem natural; a decisão permanece exclusivamente humana.

### 4.3 Estratégia de Desacoplamento do Motor

Requisito estruturante do projeto: **o produto não pode ficar refém do motor de similaridade.** A forma de garantir isso não é uma chave de configuração — é a forma do contrato.

**A tela é o produto; o motor apenas reordena a lista.** A intuição natural seria construir o motor e tratar a lista de ocorrências próximas como plano B se ele falhar. Isso produz acoplamento, porque a experiência passa a ser desenhada em torno do motor. A inversão é deliberada: a lista de ocorrências próximas é o produto, e o motor apenas melhora a ordem em que ela aparece.

O contrato é único e não muda entre as fatias do roteiro:

```
GET /eventos/candidatos?lat&lon&tipo&t0&raio&janela
→ 200 { "candidatos": [ { ...ocorrencia, "score": 0.0-1.0, "motivo": "...", "estrategia": "GEO_TEMPORAL" } ],
        "estrategia_efetiva": "DETERMINISTICO|FUZZY|SEMANTICO|CRONOLOGICO",
        "degradado": false }
```

Com motor: lista ordenada por score, com justificativa. Sem motor: **a mesma resposta**, com `score: null`, ordenação cronológica, `estrategia_efetiva: "CRONOLOGICO"` e `degradado: true`. O consumidor não muda uma linha de código.

**Cascata de estratégias.** Cada nível é independente, plugável e desligável por *feature flag*:

| Nível | Estratégia | Como funciona | Custo | Confiança |
| --- | --- | --- | --- | --- |
| **0** | Cronológica | Últimas N ocorrências no raio e na janela, sem ranqueamento | ~0 | Baixa — mas o humano ranqueia |
| **1** | Determinística | Mesmo *hash* de telefone; ou endereço normalizado idêntico | Baixo | Alta |
| **2** | Geo-temporal | Haversine + decaimento temporal + matriz de tipos | Baixo | Média-alta |
| **3** | Fuzzy textual | Jaro-Winkler / trigramas sobre endereço e resumo | Médio | Média |
| **4** | Semântica (IA) | *Embeddings* do relato, ou LLM avaliando pares candidatos | Alto | A medir |

Regra: **o nível N nunca é pré-requisito do nível N-1.** Se o 4 cair, o 3 responde. Se todos caírem, o 0 responde — e o nível 0 é uma consulta SQL. O nível 4 só entra em produção depois de provar, em *shadow mode*, que supera o nível 2 (HU06.1).

**Resiliência:**

- **Timeout agressivo:** 800 ms na chamada síncrona; estourou, cai para o nível imediatamente inferior.
- **Circuit breaker:** 5 falhas em 30 s abrem o circuito por 60 s; enquanto aberto, responde direto no nível 0, sem tentar.
- **O erro é invisível ao atendente.** Ele nunca vê "serviço indisponível" — vê uma lista menos inteligente. O estado degradado aparece discretamente na tela ("ordenação por horário") e com destaque no painel de observabilidade.
- **Teste automatizado obrigatório:** a suíte de testes roda por completo com **todas** as estratégias de motor desligadas. É esse teste que impede o acoplamento de voltar por descuido.

---

## 5. Épicos e Histórias de Usuário

As 21 histórias abaixo correspondem integralmente às histórias HU-01 a HU-21 do documento de Product Owner, onde estão detalhadas em Gherkin. Cada história é uma **fatia vertical** (banco → API → tela), entregável e demonstrável isoladamente. As referências entre parênteses nos critérios de aceite apontam para as regras de negócio da §8.

| Épico | Histórias | Origem na spec do PO |
| --- | --- | --- |
| 01 — Índice Canônico de Ocorrências | HU01.1 a HU01.3 | HU-01 a HU-03 |
| 02 — Painel de Ocorrências Correlatas (MVP) | HU02.1 a HU02.3 | HU-04 a HU-06 |
| 03 — Vinculação de Eventos | HU03.1 a HU03.4 | HU-07 a HU-10 |
| 04 — Motor de Similaridade | HU04.1 a HU04.6 | HU-11 a HU-16 |
| 05 — Integração SAMU | HU05.1 e HU05.2 | HU-17 e HU-18 |
| 06 — Calibração e Observabilidade | HU06.1 a HU06.3 | HU-19 a HU-21 |

---

### ÉPICO 01 — Índice Canônico de Ocorrências
> **Descrição:** Constituir a base compartilhada mínima que permite a qualquer órgão descobrir ocorrências de outros órgãos, sem que nenhum sistema de origem seja consultado diretamente e sem que dado pessoal sensível trafegue.

#### HU01.1 — Publicar ocorrência no ICO *(spec: HU-01)*
- **Como:** sistema de origem (Hefesto)
- **Eu quero:** publicar no ICO um registro mínimo de cada ocorrência aberta ou atualizada
- **Para que:** ela possa ser considerada na verificação de duplicidade pelos demais órgãos
- **Critérios de aceite:**
  - Aberta uma ocorrência no sistema de origem, existe registro correspondente no ICO em até 5 segundos (NFR-02).
  - O registro contém exatamente os campos do contrato ICO v1 e não contém nome, CPF, cartão SUS ou dado clínico (RN-12).
  - Atualizada uma ocorrência já publicada, o registro existente é atualizado pela chave (`orgao`, `id_ocorrencia`); nenhum registro novo é criado (RN-14).
  - Falha na publicação não propaga erro ao sistema de origem (RN-01).

  *Nota técnica: chave natural (`orgao`, `id_ocorrencia`); publicação assíncrona por fila; falhas vão para DLQ com alerta.*

#### HU01.2 — Consultar candidatos por geolocalização e tempo *(spec: HU-02)*
- **Como:** aplicação cliente (Hefesto, SAU ou painel embarcado)
- **Eu quero:** consultar o ICO por coordenada, tipo e janela temporal
- **Para que:** eu obtenha a lista de ocorrências potencialmente relacionadas ao mesmo evento
- **Critérios de aceite:**
  - A consulta retorna as ocorrências dentro do raio e da janela definidos para o tipo (RN-04, RN-05).
  - Apenas tipos compatíveis segundo a matriz de de-para são retornados (RN-06).
  - A resposta vem ordenada cronologicamente, com as ocorrências de **outros** órgãos antes das do próprio órgão (RN-16).
  - O campo `estrategia_efetiva` vale `CRONOLOGICO` e a resposta retorna em menos de 300 ms no percentil 95 (NFR-01).
  - Ocorrências já encerradas dentro da janela são retornadas, sinalizadas como encerradas (RN-10).

  *Nota técnica: índice geoespacial (PostGIS `ST_DWithin` ou equivalente) e índice em `abertura`. Sem nenhuma inteligência artificial nesta história — de propósito.*

#### HU01.3 — Manter a matriz de compatibilidade de tipos *(spec: HU-03)*
- **Como:** supervisor de sala
- **Eu quero:** manter o de-para entre as taxonomias dos órgãos
- **Para que:** a verificação não sugira ocorrências de natureza irrelevante
- **Critérios de aceite:**
  - Usuário autorizado altera o mapeamento de um tipo de origem para um tipo canônico.
  - A alteração passa a valer para novas consultas sem necessidade de nova implantação (NFR-09).
  - A versão anterior do mapeamento fica preservada, com data de vigência.

---

### ÉPICO 02 — Painel de Ocorrências Correlatas (MVP)
> **Descrição:** Entregar ao operador a visão das ocorrências de outros órgãos no momento em que ela é útil. Este épico entrega valor sozinho, **sem nenhum motor de similaridade**. Se o projeto parar aqui, ainda assim terá resolvido boa parte do problema.

#### HU02.1 — Ver ocorrências próximas durante o atendimento *(spec: HU-04)*
- **Como:** atendente
- **Eu quero:** ver as ocorrências registradas por qualquer órgão perto do endereço que estou digitando
- **Para que:** eu perceba que o evento já foi comunicado antes de concluir o cadastro
- **Critérios de aceite:**
  - Geocodificado o endereço com precisão melhor que 500 m, um painel lateral carrega os candidatos em paralelo.
  - O carregamento não trava, não bloqueia e não atrasa nenhum campo do formulário (RN-01).
  - Cada item exibe órgão, horário, tipo, distância e status.
  - Concluído o cadastro antes de o painel responder, o cadastro é finalizado normalmente.

#### HU02.2 — Ver ocorrências próximas sem endereço geocodificado *(spec: HU-05)*
- **Como:** atendente
- **Eu quero:** ver candidatos mesmo quando o endereço não geocodifica
- **Para que:** eu não perca a verificação justamente nos casos de endereço impreciso, que são os mais confusos
- **Critérios de aceite:**
  - Não havendo geocodificação, ou havendo precisão pior que 500 m, o painel exibe candidatos filtrados por RA, tipo e janela (RN-11).
  - Cada item traz marcação visual de "baixa confiança de localização".

#### HU02.3 — Consultar duplicidade sob demanda *(spec: HU-06)*
- **Como:** despachante
- **Eu quero:** acionar a verificação de duplicidade a qualquer momento sobre uma ocorrência já cadastrada
- **Para que:** eu possa checar antes de solicitar apoio a outro órgão
- **Critérios de aceite:**
  - A partir da visualização de uma ocorrência em andamento, a ação "Verificar duplicidade" exibe os candidatos atuais.
  - A tela informa se já existe vínculo estabelecido para aquela ocorrência.

---

### ÉPICO 03 — Vinculação de Eventos
> **Descrição:** Transformar a percepção do operador em informação institucional: declarar, desfazer e recusar relações entre ocorrências, sempre com auditoria e sem alterar nenhum registro de origem.

#### HU03.1 — Vincular ocorrências ao mesmo evento *(spec: HU-07)*
- **Como:** despachante
- **Eu quero:** declarar que duas ocorrências tratam do mesmo evento
- **Para que:** ambas as centrais passem a enxergar a relação
- **Critérios de aceite:**
  - Confirmada a ação "É o mesmo evento", as duas ocorrências passam a compartilhar o mesmo `id_evento`.
  - Nenhum campo de qualquer das ocorrências de origem é alterado (RN-02).
  - O vínculo fica visível para as duas centrais em até 5 segundos.
  - A auditoria grava usuário, órgão, data/hora, score e estratégia (RN-03, NFR-05).
  - Nenhum recurso é liberado ou empenhado automaticamente (RN-18).

#### HU03.2 — Desvincular ocorrências *(spec: HU-08)*
- **Como:** supervisor de sala
- **Eu quero:** desfazer um vínculo incorreto
- **Para que:** o erro seja corrigido sem perda de histórico
- **Critérios de aceite:**
  - Desfeito o vínculo, cada ocorrência volta a ter `id_evento` próprio (RN-03).
  - O vínculo anterior permanece no histórico com o estado "desfeito".
  - A justificativa é obrigatória e fica registrada na auditoria.

#### HU03.3 — Descartar sugestão *(spec: HU-09)*
- **Como:** despachante
- **Eu quero:** marcar uma sugestão como "eventos distintos"
- **Para que:** minha tela fique limpa e a recusa alimente a calibração do motor
- **Critérios de aceite:**
  - Marcada a sugestão como evento distinto, ela não reaparece para aquela ocorrência.
  - O descarte é registrado como rótulo negativo para calibração — não é um silêncio (RN-17).

#### HU03.4 — Ver ocorrência vinculada de outro órgão *(spec: HU-10)*
- **Como:** regulador médico
- **Eu quero:** ver as informações públicas da ocorrência vinculada do outro órgão
- **Para que:** eu regule com o quadro completo do evento
- **Critérios de aceite:**
  - Havendo evento com ocorrências de CBMDF e SAMU vinculadas, a tela exibe órgão, horário, tipo, status e recursos empenhados da ocorrência do outro órgão.
  - Campos classificados como reservados não são exibidos a órgão não competente (RN-13).
  - Todo acesso a dado de outro órgão é registrado em log de auditoria (NFR-05).

---

### ÉPICO 04 — Motor de Similaridade
> **Descrição:** Ordenar os candidatos por probabilidade de serem o mesmo evento, começando pelas estratégias determinísticas — as mais baratas e mais confiáveis — e chegando à avaliação semântica apenas depois de comprovado ganho medido. Nenhuma história deste épico é pré-requisito do Épico 02.

#### HU04.1 — Detecção determinística por telefone *(spec: HU-11)*
- **Como:** atendente
- **Eu quero:** que o sistema destaque ocorrências abertas a partir do mesmo telefone solicitante
- **Para que:** eu identifique imediatamente o rechamado
- **Critérios de aceite:**
  - Havendo ocorrência na janela com o mesmo *hash* de telefone e tipo compatível, ela aparece no topo com marcação de sugestão forte, independentemente da geolocalização (RN-09).
  - O motivo exibido é "mesmo telefone solicitante".

#### HU04.2 — Detecção determinística por endereço normalizado *(spec: HU-12)*
- **Como:** atendente
- **Eu quero:** que ocorrências com endereço normalizado idêntico sejam destacadas
- **Para que:** eu identifique o mesmo local mesmo quando a geocodificação diverge
- **Critérios de aceite:**
  - Endereço normalizado idêntico dentro da janela e com tipos compatíveis produz sugestão forte (RN-07).
  - O motivo exibido é "mesmo endereço".

#### HU04.3 — [Técnica] Normalizador de endereços do DF *(spec: HU-13)*
- **Como:** equipe de desenvolvimento
- **Eu quero:** um serviço de normalização de endereços do Distrito Federal
- **Para que:** as comparações textuais entre ocorrências sejam confiáveis
- **Critérios de aceite:**
  - "SHIS QI 15 CONJ 3 CASA 12" e "shis qi15 cj3 c12" produzem a mesma forma canônica.
  - "EPTG km 5" e "DF-095 km 5" produzem a mesma forma canônica, com o marco quilométrico extraído.
  - A normalização cobre quadras, conjuntos, entrequadras, rodovias DF-xxx e marcos quilométricos.

#### HU04.4 — Score geo-temporal *(spec: HU-14)*
- **Como:** despachante
- **Eu quero:** que os candidatos venham ordenados por probabilidade de serem o mesmo evento
- **Para que:** eu não precise ler uma lista longa sob pressão de tempo
- **Critérios de aceite:**
  - Entre um candidato a 50 m e 2 min e outro a 400 m e 25 min, o primeiro recebe score maior.
  - Cada candidato exibe motivo legível em linguagem natural (ex.: "120 m, 3 min, tipo compatível").
  - Candidatos com score abaixo de 0,60 não são exibidos (RN-07).

#### HU04.5 — Similaridade textual do relato *(spec: HU-15)*
- **Como:** despachante
- **Eu quero:** que a semelhança entre os relatos contribua para o ranqueamento
- **Para que:** relatos do mesmo fato escritos com palavras diferentes sejam aproximados
- **Critérios de aceite:**
  - A similaridade textual contribui para o score composto.
  - O peso dessa contribuição é configurável sem nova implantação (NFR-09).

#### HU04.6 — Avaliação semântica assistida por IA *(atrás de feature flag)* *(spec: HU-16)*
- **Como:** despachante
- **Eu quero:** uma avaliação semântica dos pares candidatos
- **Para que:** sejam capturados os casos que regra e distância textual não pegam
- **Critérios de aceite:**
  - Habilitada a estratégia semântica, o motor produz score e justificativa em linguagem natural, exibida ao operador junto da sugestão.
  - A decisão de vincular permanece exclusivamente humana (RN-08).
  - Falhando a estratégia ou estourando 800 ms, o resultado do nível inferior é usado e o operador não vê mensagem de erro (NFR-04).
  - A estratégia pode ser desligada em tempo de execução, sem implantação (NFR-08).

  *Nota técnica: prompt versionado como artefato; entrada restrita aos campos do contrato ICO, sem dado pessoal; resposta em JSON estrito com validação de schema — resposta inválida é tratada como falha e cai para o nível inferior.*

---

### ÉPICO 05 — Integração SAMU
> **Descrição:** Trazer o SAMU para o índice sem que dado de saúde saia do domínio da SES-DF, e garantir que a eventual indisponibilidade do SAU não degrade a experiência dos demais órgãos.

#### HU05.1 — Publicar ocorrências do SAU no ICO *(spec: HU-17)*
- **Como:** SES-DF/SAMU
- **Eu quero:** publicar no ICO apenas os campos mínimos das minhas ocorrências
- **Para que:** o SAMU participe da deduplicação sem expor dado de saúde
- **Critérios de aceite:**
  - Aberta uma ocorrência no SAU, trafegam apenas os campos do contrato ICO v1.
  - Nenhum dado pessoal sensível de saúde é transmitido (RN-12, NFR-06).
  - O tráfego ocorre em canal cifrado com autenticação mútua (NFR-07).
  - Há registro do tratamento para fins de RIPD/LGPD.

  *Nota de negócio: esta história depende de instrumento jurídico entre SSP e SES-DF. É o caminho crítico do projeto, e é jurídico, não técnico — deve ser iniciado em paralelo à Fatia 1.*

#### HU05.2 — Tolerância a indisponibilidade do SAMU *(spec: HU-18)*
- **Como:** atendente ou despachante de qualquer órgão
- **Eu quero:** continuar recebendo os candidatos dos demais órgãos quando o SAU estiver indisponível
- **Para que:** a falha de um participante não desabilite o produto para todos
- **Critérios de aceite:**
  - Indisponível a publicação do SAU, os candidatos dos demais órgãos são retornados normalmente.
  - O painel informa "dados do SAMU indisponíveis — última sincronização às HH:MM".
  - Nenhuma funcionalidade é bloqueada (RN-01).

---

### ÉPICO 06 — Calibração e Observabilidade
> **Descrição:** Garantir que toda evolução do motor seja decidida por medição, e não por impressão — e dar à SSP a estatística por evento que hoje não existe.

#### HU06.1 — Shadow mode *(spec: HU-19)*
- **Como:** gestor do GT
- **Eu quero:** rodar cada nova estratégia em modo sombra, comparando suas sugestões com as decisões humanas reais
- **Para que:** ela só seja promovida à produção quando os números justificarem
- **Critérios de aceite:**
  - Em modo sombra, os resultados da estratégia são gravados e não exibidos a nenhum operador.
  - O painel de calibração mostra precisão, revocação e sobreposição com a estratégia ativa.
  - A promoção para produção é uma ação explícita e reversível (NFR-08).

  *Observação: esta história precede qualquer discussão sobre qual modelo de inteligência artificial adotar. Sem ela não há como saber se a IA melhora ou piora o resultado — e o custo do erro (§2.5) não permite descobrir isso em produção.*

#### HU06.2 — Painel de qualidade da deduplicação *(spec: HU-20)*
- **Como:** analista SSP
- **Eu quero:** acompanhar as métricas de duplicidade e de qualidade das sugestões
- **Para que:** eu meça o efeito real do produto
- **Critérios de aceite:**
  - O painel exibe: eventos multi-órgão sobre o total, vínculos por estratégia, taxa de descarte de sugestões, taxa de desvínculo, tempo mediano até o vínculo e percentual de consultas em modo degradado.
  - É possível filtrar por órgão, tipo, RA e período.

#### HU06.3 — Estatística por evento, e não por ocorrência *(spec: HU-21)*
- **Como:** analista SSP
- **Eu quero:** contar eventos além de ocorrências
- **Para que:** eu reporte o volume real de fatos atendidos no Distrito Federal
- **Critérios de aceite:**
  - O relatório consolidado de um período exibe contagem de eventos e contagem de ocorrências separadamente.
  - A diferença entre as duas contagens é apresentada como taxa de duplicidade intersetorial.

---

## 6. Requisitos Não Funcionais

### 6.1 Usabilidade

- **Impacto zero no tempo de atendimento.** O painel carrega de forma assíncrona e nenhum campo do formulário de cadastro depende da resposta da consulta. O acréscimo medido no tempo de cadastro deve ser igual a zero (métrica não negociável, §10).
- **O operador nunca vê mensagem de erro do produto.** Em falha ou degradação, ele vê uma lista menos inteligente, não um alerta técnico. O estado degradado é indicado discretamente (ex.: "ordenação por horário") e reportado com destaque apenas ao painel de observabilidade.
- **Motivo legível em toda sugestão.** Nenhuma sugestão é exibida sem justificativa compreensível pelo operador ("120 m, 3 min, tipo compatível"; "mesmo telefone solicitante").
- **A nomenclatura da interface** deve seguir os termos já praticados nas salas de operação de cada órgão, evitando a introdução de vocabulário novo.

### 6.2 Desempenho

- **NFR-01 —** Consulta de candidatos: p95 ≤ 300 ms nas estratégias de nível 0 a 2; ≤ 800 ms com a estratégia de nível 4 habilitada.
- **NFR-02 —** Publicação no ICO: p95 ≤ 5 s entre a abertura da ocorrência no sistema de origem e sua disponibilidade no índice.
- **NFR-03 —** Disponibilidade do ICO ≥ 99,5 %. A indisponibilidade **nunca** afeta cadastro ou despacho em nenhum órgão.

### 6.3 Segurança e Conformidade

- **NFR-05 —** Auditoria imutável de vínculos, desvínculos, descartes de sugestão e acessos a dados de outro órgão, registrando usuário, órgão, data/hora, estratégia, score e justificativa.
- **NFR-06 —** Minimização de dados e base legal documentada em RIPD; dados relacionados à saúde tratados sob o art. 11 da LGPD. O contrato ICO não admite nome, CPF, cartão SUS ou dado clínico; o telefone do solicitante trafega apenas como *hash* (RN-12).
- **NFR-07 —** Autenticação por órgão e autorização por papel; segregação de visibilidade para ocorrências de natureza sigilosa (RN-13); comunicação entre domínios em canal cifrado com autenticação mútua.
- Ocorrências sob sigilo (violência sexual, tentativa de autoextermínio, casos sob segredo de justiça) participam do casamento geo-temporal com conteúdo suprimido, sem exibição a órgão não competente (RN-13). **Este desenho requer validação jurídica antes do início da Fatia 1** (§12).

### 6.4 Interoperabilidade e Resiliência

- **NFR-04 —** Toda chamada externa opera com *timeout*, *retry* com *backoff* e *circuit breaker*.
- **NFR-08 —** *Feature flags* por estratégia, com desligamento em tempo de execução, sem nova implantação.
- **NFR-09 —** Parâmetros operacionais (raios, janelas, limiares de score, pesos das estratégias e matriz de tipos) configuráveis sem nova implantação.
- **NFR-10 —** Contrato ICO versionado; mudança incompatível exige nova versão publicada em paralelo, com período de convivência.
- A suíte de testes automatizados deve passar integralmente **com todas as estratégias de motor desligadas** — verificação permanente do desacoplamento descrito na §4.3.

---

## 7. Restrições e Premissas

### 7.1 Restrições

- **Jurídica (caminho crítico).** O compartilhamento de dados entre SSP/DF e SES-DF depende de instrumento jurídico formal e de base legal documentada em RIPD. A tramitação é mais lenta que a construção técnica e precisa de responsável nomeado desde a Fatia 1.
- **Organizacional.** Cada órgão mantém taxonomia própria de tipos de ocorrência. A matriz de compatibilidade é artefato obrigatório e provavelmente o item de maior esforço não técnico do projeto.
- **Escopo do GT.** A pactuação atual cobre Hefesto ↔ SAU. A extensão a PMDF e PCDF exige repactuação — embora o modelo já nasça preparado para ela.
- **Autonomia dos sistemas de origem.** O produto não altera, não bloqueia e não substitui nenhum sistema existente. Nenhum órgão cede propriedade ou controle sobre seus registros (RN-02).
- **Nenhuma ação automática sobre recursos.** Vincular ocorrências não libera nem empenha viatura ou ambulância. A decisão sobre recursos permanece humana e no sistema próprio de cada órgão (RN-18).
- **IA como incremento não impeditivo.** As estratégias baseadas em inteligência artificial (HU04.6) ficam atrás de *feature flag* e só entram em produção após comprovação de ganho em *shadow mode*. Nenhuma entrega das Fatias 1 a 5 depende delas.
- **Fase 1 sem vínculo automático.** Todo vínculo exige ação humana explícita, a reavaliar somente após 90 dias de operação com medição (RN-08).

### 7.2 Premissas

- Cada sistema de origem consegue emitir evento de abertura e de atualização de ocorrência, de forma assíncrona, sem impacto no seu fluxo de atendimento.
- Existe serviço de geocodificação disponível às centrais, com indicação de precisão da coordenada; quando ele falha, a busca por RA supre a consulta (HU02.2).
- Os supervisores de sala assumem a manutenção da matriz de compatibilidade de tipos como atividade contínua, começando pelos cinco tipos de maior volume.
- A SSP/DF disponibiliza infraestrutura para hospedar o ICO e a plataforma de observabilidade, sujeita à decisão da §12, item 1.
- Os órgãos aceitam que o ICO é base **derivada** — reconstruível a partir dos sistemas de origem — e não fonte da verdade de nenhum registro.
- Haverá disponibilidade de operadores das três centrais para validação das telas e calibração dos parâmetros durante as Fatias 1 a 3.

---

## 8. Regras de Negócio

| ID | Regra |
| --- | --- |
| **RN-01** | A verificação de duplicidade nunca bloqueia, cancela ou atrasa cadastro ou despacho. |
| **RN-02** | Vincular, nunca fundir. Nenhum registro de origem é alterado pela deduplicação. |
| **RN-03** | Todo vínculo e todo desvínculo são reversíveis e auditados (quem, quando, estratégia, score, justificativa). |
| **RN-04** | Janela temporal padrão: 30 min antes e 15 min depois da abertura. Parametrizável por `tipo_canonico`. |
| **RN-05** | Raio geográfico por tipo (valores iniciais, a calibrar): acidente de trânsito 200 m; incêndio em edificação 100 m; incêndio florestal 1.500 m; afogamento 500 m; ocorrência em via expressa 400 m ao longo do eixo. |
| **RN-06** | Só são candidatas ocorrências de tipos compatíveis, conforme a matriz de de-para entre taxonomias (§8.1). |
| **RN-07** | Bandas de score: ≥ 0,85 → sugestão forte (destaque); 0,60 a 0,84 → sugestão fraca (lista); < 0,60 → não exibe. Limiares configuráveis sem nova implantação. |
| **RN-08** | Fase 1: nenhum vínculo automático. Todo vínculo exige ação humana explícita. Reavaliar após 90 dias de *shadow mode*. |
| **RN-09** | Exceção determinística: mesmo `hash_telefone_solicitante` + janela + tipos compatíveis → sugestão forte, independentemente da geolocalização. |
| **RN-10** | Ocorrências já encerradas dentro da janela entram na busca, sinalizadas como encerradas — são justamente as que indicam "já foi atendido". |
| **RN-11** | Geolocalização ausente ou de baixa precisão (> 500 m) → a estratégia geográfica é ignorada e usa-se a textual; o candidato recebe marcação de baixa confiança. |
| **RN-12** | O ICO armazena apenas os campos do contrato ICO v1 (§4.1). Dado pessoal sensível não trafega. |
| **RN-13** | Ocorrências de natureza sigilosa (violência sexual, tentativa de autoextermínio, casos sob segredo de justiça) são indexadas com `tipo_canonico: RESERVADO` e resumo suprimido; participam do casamento geo-temporal, mas o conteúdo não é exibido a órgão não competente. |
| **RN-14** | A publicação no ICO é idempotente pela chave (`orgao`, `id_ocorrencia`). |
| **RN-15** | Um evento pode ter mais de uma ocorrência do **mesmo** órgão (ex.: duas guarnições, dois trechos). Não é erro; gera alerta ao supervisor. |
| **RN-16** | Na exibição, ocorrências de **outros** órgãos têm precedência de ordenação sobre as do próprio órgão — é a informação que o operador não possui hoje. |
| **RN-17** | Descartar uma sugestão é ação registrada, não silêncio. É o rótulo negativo que calibra o motor. |
| **RN-18** | Vincular ocorrências não implica nenhuma ação automática sobre recursos empenhados. Liberar viatura é decisão humana, em sistema próprio. |

### 8.1 Matriz de Compatibilidade de Tipos

Artefato obrigatório do projeto. Cada órgão possui taxonomia própria, e o casamento de eventos depende de um de-para explícito. Formato previsto:

| Tipo canônico | CBMDF (Hefesto) | SAMU (SAU) | PMDF | Compatível entre si? |
| --- | --- | --- | --- | --- |
| ACIDENTE_TRANSITO | Colisão / Capotamento / Atropelamento | Trauma — acidente de trânsito | Acidente de trânsito | Sim |
| INCENDIO_EDIFICACAO | Incêndio em edificação | Queimadura / Intoxicação por fumaça | Apoio a incêndio | Sim |
| MAL_SUBITO | Atendimento pré-hospitalar clínico | Clínico | — | Sim |
| PARTO | Parto de emergência | Obstétrico | — | Sim |
| INCENDIO_FLORESTAL | Incêndio florestal | — | — | Raro cruzar |

> **Recomendação:** esta matriz é **dado**, não **código**. Deve ser tabela editável pela área de negócio, versionada e com data de vigência (HU01.3). Se virar `if/else` no código, o projeto trava na primeira mudança de taxonomia de qualquer órgão.

---

## 9. Roteiro por Fatias Verticais

| Fatia | Conteúdo | Valor entregue | Depende de IA? |
| --- | --- | --- | --- |
| **F1** | HU01.1, HU01.2, HU02.1 (apenas órgãos da SSP) | O atendente enxerga as ocorrências próximas dos outros órgãos | Não |
| **F2** | HU03.1, HU03.2, HU03.3, HU06.2 | Vínculo, auditoria e primeira medição real da duplicidade intersetorial | Não |
| **F3** | HU04.1, HU04.2, HU04.3, HU04.4 | Sugestões ordenadas e confiáveis, com motivo legível | Não |
| **F4** | HU05.1, HU05.2, HU03.4 | O SAMU entra no índice — fecha o escopo pactuado do GT | Não |
| **F5** | HU06.1, HU04.5 | Calibração por *shadow mode* e similaridade textual | Não |
| **F6** | HU04.6 em modo sombra | Avaliação semântica medida contra o *baseline* estabelecido | Sim |
| **F7** | HU04.6 em produção | Promoção condicionada às métricas apuradas na F6 | Sim |

Duas leituras importantes deste roteiro, para o patrocínio:

1. **A inteligência artificial aparece somente na sexta fatia.** Não por ser dispensável, mas porque antes dela não existe *baseline* contra o qual medir ganho, nem rótulos humanos com que calibrar. Começar pela IA seria começar sem régua — e, dado o custo do falso positivo (§2.5), sem régua não se pode avançar.
2. **Nenhuma fatia é pré-requisito da seguinte em termos de contrato.** A interface descrita na §4.3 é idêntica na F1 e na F7. É exatamente isso que impede o acoplamento ao motor.

---

## 10. Métricas de Sucesso (KPIs)

| Métrica / KPI | O que mede | Meta | Método de mensuração |
| --- | --- | --- | --- |
| **Taxa de duplicidade intersetorial** | Eventos multi-órgão sobre o total de eventos | *Baseline* a estabelecer na F2 | Painel de qualidade (HU06.2) e relatório por evento (HU06.3) |
| **Empenhos redundantes evitados** | Vínculos que levaram à liberação de recurso | Crescente | Registro da decisão do despachante após o vínculo |
| **Precisão das sugestões** | Vínculos aceitos sobre sugestões fortes exibidas | ≥ 0,80 | Painel de calibração, comparando sugestões e decisões humanas |
| **⚠️ Taxa de desvínculo** | *Proxy* de falso positivo — **a métrica mais crítica do produto** | **≤ 2 %** | Desvínculos sobre vínculos criados, por período e por estratégia |
| **Tempo até o vínculo** | Intervalo entre a segunda abertura e o vínculo | Decrescente | Auditoria de vínculos (HU03.1) |
| **⚠️ Impacto no tempo de cadastro** | Segundos acrescidos ao atendimento pela presença do painel | **= 0 (não negociável)** | Instrumentação do formulário, com e sem painel ativo |
| **Percentual de consultas degradadas** | Saúde operacional do motor | ≤ 5 % | Campo `degradado` da resposta, agregado na observabilidade |

**Critérios de aceitação institucional.** As duas métricas marcadas com ⚠️ não são indicadores de acompanhamento — são condições de continuidade:

- **Taxa de desvínculo acima de 2 %** indica que o produto está criando falsos positivos em volume relevante. Diante do custo irreversível desse erro (§2.5), a resposta é elevar os limiares de exibição ou desligar a estratégia responsável — não tolerar o número. Deve estar instrumentada desde a HU03.1, na Fatia 2.
- **Qualquer acréscimo mensurável no tempo de cadastro** descaracteriza o produto, porque transfere ao atendimento o custo de uma melhoria de coordenação. Deve ser medido explicitamente na Fatia 1, antes de qualquer expansão.

Como métrica de contexto, a **taxa de descarte de sugestões** deve ser acompanhada como sinal de fadiga de alerta: acima de 40 %, o limiar de exibição precisa ser elevado antes que o operador passe a ignorar o painel por hábito.

---

## 11. Riscos e Mitigações

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Falso positivo leva a não atendimento de ocorrência real | **Crítico** | Princípios P1–P3 (§2.5); RN-08 (nenhum vínculo automático); RN-18 (nenhuma ação automática sobre recursos); métrica de desvínculo como critério de continuidade |
| Instrumento jurídico SSP ↔ SES-DF atrasa | Alto | As Fatias 1 a 3 não dependem do SAMU; a tratativa jurídica deve ser iniciada em paralelo à F1, com responsável nomeado (§3.1) |
| Excesso de sugestões irrelevantes leva o operador a ignorar o painel (fadiga de alerta) | Alto | RN-07 (limiar de exibição configurável); acompanhamento da taxa de descarte; acima de 40 %, elevar o limiar |
| Taxonomias divergentes inviabilizam o de-para entre órgãos | Médio | HU01.3 trata a matriz como dado editável e versionado; começar pelos 5 tipos de maior volume |
| O painel aumenta o tempo de atendimento | Alto | NFR-01; carregamento assíncrono; medição explícita como métrica não negociável (§10) |
| O motor de similaridade vira dependência oculta do produto | Médio | Contrato único da §4.3; teste automatizado que roda a suíte inteira com o motor desligado |
| Baixa adoção por resistência das centrais à exposição de dados | Médio | P2 garante que nenhum órgão perde controle sobre seus registros; minimização de dados no contrato ICO; participação dos supervisores desde a F1 |

---

## 12. Decisões em Aberto

| # | Decisão | Alternativas | Momento-limite | Responsável sugerido |
| --- | --- | --- | --- | --- |
| 1 | **Onde o ICO será hospedado?** | SSP/DF é o natural (3 dos 4 órgãos já estão lá), mas cria assimetria política com a SES-DF; alternativa é um barramento neutro. Impacto maior jurídico que técnico. | Antes do início da F1 | SSP/DF com o GT APH Móvel DF |
| 2 | **Quem é o dono do `id_evento`?** | Recomendação: gerado pelo ICO, nunca por sistema de órgão — evita disputa de precedência entre centrais. | Antes do início da F1 | Equipe técnica com o GT |
| 3 | **Tratamento das ocorrências reservadas (RN-13).** | O modelo proposto indexa a ocorrência mas suprime o conteúdo. Precisa de validação jurídica e dos encarregados de dados. | Antes do início da F1 | Assessorias jurídicas e DPOs dos órgãos |
| 4 | **Vínculo automático em caso determinístico (RN-08/RN-09).** | Manter sempre humano, ou permitir automático após as métricas da F5? Recomendação: decidir apenas com os dados na mão. | Ao final da F5 | Gestor do GT |
| 5 | **A tela vive dentro do Hefesto/SAU ou é aplicação própria embarcada?** | Embarcar reduz atrito de adoção; aplicação própria acelera a entrega. É *trade-off* de produto, não de arquitetura. | Antes do início da F1 | GT APH Móvel DF com os órgãos |
| 6 | **Escopo dos órgãos participantes.** | Hoje a pactuação cobre Hefesto ↔ SAU. Estender a PMDF e PCDF exige repactuação, embora o modelo já nasça preparado. | Após a F4 | GT APH Móvel DF |

---

## 13. Definição de Pronto

Sugestão de critério comum a todas as histórias deste documento. Uma história está pronta quando:

- [ ] Os critérios de aceite estão automatizados e passando.
- [ ] A suíte de testes passa **com todas as estratégias de motor desligadas**.
- [ ] As métricas da §10 afetadas pela história estão instrumentadas.
- [ ] Os parâmetros novos estão em configuração, não em código.
- [ ] A auditoria registra a ação, quando aplicável.
- [ ] Houve revisão explícita de que nenhum caminho novo bloqueia cadastro ou despacho (verificação do princípio P1).

---

## Checklist de Revisão

- [x] Todos os campos do template foram preenchidos, sem placeholders remanescentes.
- [x] Problema, causa-raiz e proposta de solução estão encadeados e coerentes entre §2.2, §2.3 e §4.1.
- [x] Os épicos da §5 cobrem integralmente o escopo declarado na §1.2, e cada recurso da §4.2 tem épico correspondente.
- [x] Os requisitos não funcionais da §6 são verificáveis, com número e limiar explícitos.
- [ ] Restrições e premissas da §7 validadas com os stakeholders da §3.1 — **pendente**.
- [ ] Decisões em aberto da §12 encaminhadas aos responsáveis indicados — **pendente**.
- [ ] Documento aprovado pelo GT APH Móvel DF — **pendente**.
