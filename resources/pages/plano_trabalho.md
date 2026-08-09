# Plano de Trabalho — Integração de Dados, Serviços e Sistemas CBMDF × SAMU

**Projeto:** Interoperabilidade do Atendimento Pré-Hospitalar (APH) — Centrais 193 (CBMDF) e 192 (SAMU/DF)
**Versão:** 1.0 (proposta inicial para validação do Comitê Técnico Misto)
**Classificação da informação:** Restrita — contém referência a tratamento de dados pessoais sensíveis de saúde (Art. 11, LGPD)
**Marcos legais e normativos de referência:** Lei 13.709/2018 (LGPD); Lei 14.129/2021 (Governo Digital); Decreto 10.046/2019 (governança e compartilhamento de dados no setor público); e-PING (Padrões de Interoperabilidade de Governo Eletrônico); HL7 FHIR R4 / RNDS (Rede Nacional de Dados em Saúde); Política Nacional de Atenção às Urgências (Portaria GM/MS 1.600/2011); ABNT NBR ISO/IEC 27001 e 27002; ABNT NBR ISO 22320 (gestão de emergências).

---

## Sumário Executivo

Este plano estrutura a integração operacional e tecnológica entre o **Corpo de Bombeiros Militar do Distrito Federal (CBMDF)** e o **Serviço de Atendimento Móvel de Urgência (SAMU/DF)**, com foco em três resultados de negócio:

1. **Eliminação de duplicidade de empenho de viaturas** — por meio de um serviço de deduplicação de ocorrências entre as centrais.
2. **Consciência situacional unificada** — visão compartilhada e em tempo real de ocorrências, recursos e telemetria de viaturas.
3. **Conformidade plena com a LGPD** — tratamento lícito, minimizado e auditável de dados sensíveis de saúde no fluxo interoperado.

O trabalho está organizado em **5 fases sequenciais com sobreposições controladas**, sustentadas por uma camada de governança (Comitê Técnico Misto) ativa desde o primeiro dia.

---

## 1. Insights do Mapeamento As-Is (análise do fluxo anexo)

A leitura do diagrama BPMN fornecido evidencia **dois fluxos de atendimento que correm em paralelo, hoje fracamente acoplados** — o do CBMDF (raias de atendimento da ligação, CIADE/despacho 193) e o do SAMU (telefonista/regulação médica, médico regulador, equipe de socorro, médico da USB/USA). Os pontos de contato já existentes ou previstos são exatamente as fronteiras onde a integração agrega mais valor:

| # | Ponto de interoperabilidade (As-Is) | Observação do fluxo atual | Oportunidade na integração |
|---|---|---|---|
| 1 | **Transferir Ligação CBMDF↔SAMU** | Hoje há transferência de chamada quando o atendente identifica natureza clínica (“É Saúde ou SAMU?”), com risco de queda de chamada e perda de contexto | Transferência *com contexto* (warm transfer): o cadastro já preenchido viaja junto, não o cidadão repetindo a história |
| 2 | **Regular Ocorrência** (Médico Regulador) | Decisão clínica concentrada no SAMU; CBMDF não enxerga o status da regulação | Expor *status de regulação* ao despacho 193 para sincronizar empenho |
| 3 | **Contra-regular Ocorrência** | Ajuste/reavaliação da regulação inicial | Notificação de mudança de gravidade/recurso para a outra central em tempo real |
| 4 | **Designar recursos para a ocorrência** (apoio adicional) | “Solicitar apoio adicional” e “Designar recursos” aparecem em ambas as raias, isoladamente | Despacho cruzado: pedido de apoio CBMDF→SAMU (e vice-versa) como serviço, com aceite/recusa rastreável |
| 5 | **Verificar se ocorrência foi cadastrada em outra agência** *(a inserir)* | **Não existe no As-Is** — é a principal lacuna geradora de duplicidade | Inserir *gateway* de deduplicação logo após “Cadastrar Ocorrência”, antes de “Designar recursos” |

> **Insight crítico:** a duplicidade de empenho nasce no intervalo entre **“Cadastrar Ocorrência”** e **“Designar recursos para a ocorrência”**. É nesse ponto que o novo controle de deduplicação (#5) deve ser inserido como tarefa de serviço automatizada, consultando a base unificada por chave de correlação (geolocalização + janela temporal + telefone de origem + natureza). Os demais marcos (#1–#4) são integrações de *evento* e *status*, não de processo único — preservando a autonomia decisória de cada corporação.

---

## 2. Escopo e Diretrizes Principais

### 2.1 Padronização e Nomenclatura Comum

| Item | Diretriz |
|---|---|
| **Dicionário de Dados Unificado** | Catálogo único de entidades (Ocorrência, Solicitante, Vítima, Recurso/Viatura, Despacho, Regulação, Desfecho) com nome, tipo, domínio, obrigatoriedade, sensibilidade LGPD e sistema-mestre (*system of record*) de cada atributo |
| **Taxonomia de Ocorrências** | Tabela de correspondência (*de-para*) entre os códigos do CBMDF e do SAMU, ancorada em padrões reconhecidos: CID-10 para condição clínica e, para classificação de incidente, alinhamento ao modelo do **NEMSIS** (referência internacional de dados de EMS) adaptado à realidade nacional |
| **Codificação de Gravidade** | Escala única (ex.: vermelho/laranja/amarelo/verde/azul) mapeada a protocolos clínicos validados — **Manchester / START / jumpSTART**, escore de Glasgow e AVPU — para que “grave” signifique a mesma coisa nas duas centrais |
| **Eventos sentinela** | Codificação padronizada e prioritária para PCR (parada cardiorrespiratória), trauma com risco iminente de vida, gestante em trabalho de parto, vítimas múltiplas (acionamento de plano de catástrofe) |
| **Protocolos de Triagem Integrados** | Roteiro de perguntas convergente nas duas centrais, de modo que a transferência de ligação não exija recomeço da triagem; a regulação médica permanece atribuição exclusiva do SAMU |

### 2.2 Integração de Sistemas

| Domínio | Sistema(s) | Estratégia de interoperação |
|---|---|---|
| **Despacho de ocorrências (CAD)** | Sistema de despacho do CIADE/CBMDF e sistema de regulação/despacho do SAMU | Integração por eventos (publish/subscribe): criação, atualização de status e fechamento de ocorrência publicados em barramento |
| **Telemetria de viaturas (AVL/GPS)** | Rastreamento das viaturas de ambas as frotas | *Feed* de posição georreferenciada compartilhado em camada de mapa comum, com atualização em tempo quase-real |
| **Prontuário / registro clínico** | Ficha de atendimento APH (SAMU) e registro de ocorrência (CBMDF) | Interoperação **HL7 FHIR R4**, com aderência à **RNDS** quando aplicável; CBMDF acessa apenas o subconjunto clínico estritamente necessário ao socorro |
| **Identidade e acesso** | Diretórios de cada corporação | Federação de identidade (SSO) com perfis por papel, evitando bases de usuários duplicadas |

### 2.3 Infraestrutura e Segurança

| Pilar | Diretriz arquitetural |
|---|---|
| **Padrão de integração** | Arquitetura orientada a eventos com **barramento de serviços / message broker** (ex.: fila de mensagens com entrega garantida) + **APIs REST** versionadas para consultas síncronas; contratos de API documentados em OpenAPI |
| **Alta disponibilidade** | Topologia ativo-ativo ou ativo-passivo com *failover* automático; meta de disponibilidade ≥ 99,9%; operação degradada offline prevista (a falha da integração nunca pode impedir o atendimento isolado de cada central) |
| **Segurança da informação** | Criptografia em trânsito (TLS 1.2+/mTLS entre serviços) e em repouso; segregação de rede; *gateway* de API com *rate limiting* e WAF |
| **Privacidade (LGPD)** | Minimização de dados por *design* (cada parte recebe só o necessário), pseudonimização onde possível, trilha de auditoria imutável de todo acesso a dado sensível, e definição formal dos papéis de **controlador / operador** entre as corporações |
| **Observabilidade** | Monitoramento de latência, taxa de erro e *dead-letter queues*; *dashboards* operacionais e alertas |

---

## 3. Estrutura do Plano de Trabalho — Fases, Entregáveis e Indicadores

### Fase 1 — Alinhamento Institucional e Diagnóstico

| Atividades | Produtos / Entregáveis | Indicadores de Sucesso |
|---|---|---|
| Instituir o **Comitê Técnico Misto** (representantes operacionais, de TI, jurídico/DPO e regulação médica de cada corporação) | Portaria/Termo de instituição do Comitê e regimento interno | Comitê instituído formalmente; quórum em ≥ 90% das reuniões |
| Mapear processos **As-Is** das duas corporações | Documento BPMN As-Is consolidado das centrais 193 e 192 | 100% dos macroprocessos de APH mapeados e validados pelas áreas |
| Selecionar os processos a interoperar: Transferir Ligação, Regular, Contra-regular, Designar recursos (apoio) e o novo *Verificar duplicidade* | Matriz de processos interoperáveis priorizada | 5 processos-âncora definidos e aprovados |
| Levantar gargalos tecnológicos e de legado | Relatório de diagnóstico técnico (inventário de sistemas, APIs existentes, dívida técnica) | Inventário completo dos sistemas críticos das duas pontas |
| Mapear bases legais e papéis LGPD | Parecer jurídico inicial e esboço de RIPD (Relatório de Impacto à Proteção de Dados) | Base legal definida para o compartilhamento |

### Fase 2 — Definição de Padrões e Governança

| Atividades | Produtos / Entregáveis | Indicadores de Sucesso |
|---|---|---|
| Elaborar o **dicionário de dados unificado** | Dicionário de dados versionado + tabelas *de-para* de taxonomia | 100% dos atributos do MVP catalogados com *system of record* definido |
| Definir **matriz de competências** (quem atende o quê, quando e quem assume a coordenação) | Matriz RACI operacional dos cenários integrados | Matriz validada pelas duas corporações sem pendências |
| Desenhar os novos fluxos **To-Be** integrados | Modelos BPMN To-Be dos 5 processos-âncora | Fluxos To-Be aprovados pelo Comitê |
| Especificar o controle de deduplicação | Regra de negócio da chave de correlação (geo + tempo + telefone + natureza) | Regra de *match* validada com casos históricos reais |
| Consolidar política de governança de dados | Política de governança, classificação da informação e plano de retenção | Política publicada e referenciada nos contratos de API |

### Fase 3 — Arquitetura Tecnológica e Desenvolvimento

| Atividades | Produtos / Entregáveis | Indicadores de Sucesso |
|---|---|---|
| Especificar **APIs** e contratos | Especificações OpenAPI dos serviços (ocorrência, status, recursos, deduplicação) | Contratos aprovados e publicados em portal de APIs |
| Implantar o **barramento de integração** | Barramento/broker configurado com tópicos e filas | Mensagens entregues com garantia *at-least-once* e *dead-letter* funcional |
| Desenvolver regras de **despacho cruzado** e deduplicação | Serviços de despacho cruzado e de verificação de duplicidade | Deduplicação operando com precisão/recall medidos em ambiente de teste |
| Implementar **segurança** (criptografia, IAM, auditoria) | Camada de segurança: mTLS, SSO federado, *log* de auditoria imutável | 100% das chamadas autenticadas e registradas; varredura de segurança sem achados críticos |
| Construir a **camada de consciência situacional** | Painel unificado de ocorrências + telemetria | Posição das viaturas atualizada em tempo quase-real no painel comum |

### Fase 4 — Projeto Piloto e Homologação

| Atividades | Produtos / Entregáveis | Indicadores de Sucesso |
|---|---|---|
| Provisionar **ambiente de testes (sandbox)** com dados sintéticos/anonimizados | Sandbox isolado e massa de dados de teste | Ambiente espelhado e segregado da produção |
| Executar **simulação de ocorrências em tempo real** (incl. cenário de vítimas múltiplas) | Roteiros de simulação e relatórios de execução | Cenários executados ponta a ponta sem perda de mensagem |
| Aplicar **critérios de validação técnica e operacional** | Plano e relatório de homologação (TAU — Termo de Aceite do Usuário) | Latência de transferência de ocorrência dentro da meta; 0 duplicidades não detectadas nos cenários |
| Piloto operacional assistido em região delimitada | Relatório de piloto com lições aprendidas | Redução mensurável de empenho duplicado vs. linha de base |

### Fase 5 — Capacitação e Implementação

| Atividades | Produtos / Entregáveis | Indicadores de Sucesso |
|---|---|---|
| Elaborar **plano de treinamento** para operadores das centrais 193 e 192 e equipes de rua | Material didático, POPs (procedimentos operacionais padrão) integrados | ≥ 95% dos operadores treinados e avaliados antes do Go-Live |
| Capacitação prática em sala e em estações de trabalho | Turmas realizadas + avaliação de aprendizagem | Nota mínima de aproveitamento atingida |
| Planejar a **virada de chave (Go-Live)** e o plano de *rollback* | Cronograma de Go-Live faseado e plano de contingência | Go-Live executado com plano de reversão testado |
| Estabilização e operação assistida | Relatório de pós-implantação e transição para sustentação | Indicadores operacionais estáveis por período de observação definido |

### Cronograma Macro (indicativo)

| Fase | Mês 1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 — Alinhamento e Diagnóstico | ██ | ██ | | | | | | | | | | |
| 2 — Padrões e Governança | | ░░ | ██ | ██ | | | | | | | | |
| 3 — Arquitetura e Desenvolvimento | | | | ░░ | ██ | ██ | ██ | ██ | | | | |
| 4 — Piloto e Homologação | | | | | | | ░░ | ██ | ██ | | | |
| 5 — Capacitação e Go-Live | | | | | | | | | ░░ | ██ | ██ | ██ |
| **Governança (Comitê Técnico Misto)** | ▓▓ | ▓▓ | ▓▓ | ▓▓ | ▓▓ | ▓▓ | ▓▓ | ▓▓ | ▓▓ | ▓▓ | ▓▓ | ▓▓ |

> Legenda: ██ execução · ░░ início com sobreposição à fase anterior · ▓▓ atividade contínua. Os prazos são referenciais e devem ser recalibrados pelo Comitê após a Fase 1.

---

## 4. Matriz de Riscos Inicial

| # | Risco | Categoria | Prob. | Impacto | Ação de Mitigação |
|---|---|---|:--:|:--:|---|
| R1 | **Resistência cultural / disputa de protagonismo** entre corporações (“quem comanda a cena?”) | Pessoas / Governança | Alta | Alto | Comitê Técnico Misto com decisão paritária; matriz RACI explícita por cenário; patrocínio formal do alto comando das duas instituições; comunicação de que a integração *preserva* a autonomia de cada corporação |
| R2 | **Indisponibilidade de sistemas** (a integração vira ponto único de falha) | Tecnologia / Operação | Média | Crítico | Arquitetura de alta disponibilidade com *failover*; **modo degradado**: cada central continua operando isoladamente se a integração cair; testes de caos e *runbooks* de contingência |
| R3 | **Incompatibilidade de legado** (sistemas antigos sem API, modelos de dados divergentes) | Tecnologia | Alta | Alto | Camada de *adapters*/anticorrupção isolando o legado; tabelas *de-para* na camada de integração, não nos sistemas-fonte; abordagem incremental por MVP antes de ampliar escopo |
| R4 | **Não conformidade com a LGPD** no compartilhamento de dado sensível de saúde | Jurídico / Privacidade | Média | Crítico | RIPD concluído antes do desenvolvimento; minimização e pseudonimização por *design*; trilha de auditoria imutável; definição formal de controlador/operador; revisão do DPO em cada *gate* de fase |
| R5 | **Inconsistência semântica** (mesmo termo, significados diferentes → gravidade traduzida errada) | Dados | Média | Alto | Dicionário de dados unificado como artefato de governança versionado; validação das tabelas *de-para* com casos clínicos reais; testes de regressão sobre a tradução de gravidade |
| R6 | **Falha humana na transição** (operadores não absorvem o novo fluxo) | Pessoas / Operação | Média | Médio | Treinamento obrigatório com avaliação; operação assistida no Go-Live; POPs integrados disponíveis na estação de trabalho |

---

## 5. Notas de Governança e Conformidade

- **Princípio reitor:** a integração é um *amplificador* da operação de cada corporação, nunca um substituto. Nenhuma indisponibilidade da camada integrada pode degradar o atendimento isolado de 193 ou 192.
- **LGPD — base legal:** o tratamento apoia-se na execução de políticas públicas e na tutela da saúde (Arts. 7º, 11 e 23 da Lei 13.709/2018), com o RIPD como pré-condição do desenvolvimento.
- **Interoperabilidade de governo:** aderência ao e-PING e, na dimensão de saúde, ao padrão HL7 FHIR/RNDS, favorecendo a replicabilidade do modelo por outros Corpos de Bombeiros e SAMUs estaduais.
- **Auditabilidade:** todo acesso a dado sensível é registrado em trilha imutável, com retenção definida em política e prestação de contas ao Comitê.

---

*Documento técnico de proposta. Sujeito a validação e recalibração pelo Comitê Técnico Misto CBMDF × SAMU.*
