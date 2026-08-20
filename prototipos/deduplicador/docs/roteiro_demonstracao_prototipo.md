# Roteiro de Demonstração — Protótipo do Painel de Ocorrências Correlatas

**Não é um documento de visão.** O escopo já está definido — é a Fatia F1+F2 do
[documento_de_visao.md](documento_de_visao.md) (§9). Este roteiro serve só para conduzir a
demonstração do protótipo em `prototipo/` e para deixar registrado o que ele prova e o que não prova.

**Protótipo:** dados 100 % sintéticos, sem backend, sem integração real com Hefesto/SAU. Ver
`prototipo/README.md` (seção "Reiniciar a demonstração") para reset de estado.

---

## Cenário

A colisão na EPTG descrita no documento de visão, §2.1: um mesmo acidente gera três ligações — 190,
192 e 193 — e três centrais abrem três registros, cada uma sem saber da existência das outras duas.

No protótipo, os três registros já estão pré-carregados (KM 5, sentido Plano Piloto, por volta das
14h22) para que a demonstração comece direto na experiência do operador, sem depender de digitar dados
na hora.

## Personas usadas na demo

Mapeadas ao documento de visão §3.2: **atendente** (`prototipo/index.html`), **despachante**
(`prototipo/despachante.html`) e **regulador médico** (`prototipo/evento.html`, com a central SAMU
selecionada no cabeçalho).

O seletor **"Estou na central"**, no cabeçalho de todas as telas, troca o órgão sob cuja ótica a tela é
exibida — inclusive para demonstrar segregação de visibilidade (RN-13), sem precisar simular login.

---

## Passo a passo

### 1 — O painel não atrapalha (P1)

Em `index.html`, com a central CBMDF selecionada, cadastre uma ocorrência nova (qualquer endereço). O painel
lateral leva ~800 ms para responder — o mesmo *timeout* do NFR-01/§4.3 do documento de visão. Clique em
**"Concluir cadastro"** antes de o painel terminar de carregar.

> **Pergunta que isso responde:** o cadastro é interrompido, atrasado ou bloqueado pela verificação de
> duplicidade? A resposta observável é não — é o princípio P1 na prática, não em prosa.

### 2 — O valor central: enxergar o outro órgão (§2.2)

Em `despachante.html`, localize a ocorrência **CBMDF-2026-0158234** (EPTG KM 5, 14:22) — **sem clicar em
nada**. Ela já chega marcada com "⚠ 2 possíveis duplicadas" e traz, logo abaixo, os candidatos do SAMU e
da PMDF, ambos marcados como **muito parecida**, acima de 85% de semelhança, e com motivo legível
("30 m, 2 min, mesmo tipo"). A verificação é da plataforma; o clique que resta é o da decisão.

> **Pergunta que isso responde:** um despachante do CBMDF, sem esta tela, saberia que o SAMU e a PMDF já
> foram acionados para o mesmo local? Hoje, não — é exatamente a dor D2/D3 do documento de visão §2.2.
> E saberia disso **sem precisar suspeitar primeiro**: a verificação não depende de o operador lembrar
> de pedi-la ocorrência por ocorrência.

### 3 — Vincular sem fundir (P2)

Ainda na mesma tela, clique em **"É o mesmo evento"** para o candidato do SAMU e depois para o da PMDF.
Abra `evento.html` e localize o evento — os três registros aparecem lado a lado, cada um com seu órgão,
status e campos originais **intactos**.

> **Pergunta que isso responde:** algum dado de origem foi alterado, apagado ou sobrescrito pelo
> vínculo? Não — cada órgão continua dono do seu registro. É P2.

### 4 — O produto sobrevive sem o motor (§4.3)

No cabeçalho, desligue o alternador **"Sugerir ocorrências parecidas"** e olhe a mesma ocorrência do
CBMDF. Os candidatos continuam aparecendo — os mesmos, sem o percentual de semelhança, ordenados
cronologicamente, com o aviso discreto "Sugestão automática desligada — as ocorrências próximas
continuam aparecendo, em ordem de horário".

> **Pergunta que isso responde:** o painel depende do motor de IA/scoring para ser útil? Não — é a
> forma do contrato descrita no documento de visão §4.3, não uma alegação.

Religue o motor antes de seguir para o próximo passo.

### 5 — A armadilha: nem toda sugestão é para vincular

Ainda em `despachante.html`, na mesma verificação de duplicidade da ocorrência CBMDF-2026-0158234,
repare no terceiro candidato: **PMDF-2026-021077**, "EPTG KM 5 **sentido Taguatinga**" (sentido oposto
ao da ocorrência original), aberto 18 minutos depois, marcado como **pouco parecida** (60% a 84% de
semelhança).
É um acidente real e distinto — colisão traseira, sem vítimas — que por proximidade geo-temporal ainda
aparece na lista.

Clique em **"São eventos distintos"** para descartá-lo.

> **Pergunta que isso responde:** o operador confia cegamente no percentual, ou lê o motivo, o endereço e o
> resumo antes de decidir? É o contraponto direto ao princípio P1–P3 (§2.5 do documento de visão): o
> custo de vincular errado é maior que o de não vincular, e por isso a decisão fica com o humano.

### 6 — Segredo que participa sem se expor (RN-13)

Troque a central para **PMDF** e abra a ocorrência **PMDF-2026-021204** (Recanto das Emas, 20h15) — o
conteúdo aparece completo, porque o PMDF é o órgão de origem. Troque a central para **CBMDF** e
verifique a mesma ocorrência aparecendo como candidata de **CBMDF-2026-0158299** (aberta por volta das
20h19, a ~40 m): o card aparece com cadeado, sem endereço nem resumo, marcado apenas como "RESERVADO".

> **Pergunta que isso responde:** uma ocorrência sigilosa desaparece da verificação de duplicidade, ou
> participa do casamento geo-temporal sem vazar conteúdo a quem não tem competência? É RN-13.

### Extra — outros dois casos plantados, se sobrar tempo

- **Ocorrência já encerrada** (RN-10): verificar duplicidade em **SAU-2026-004790** (SQN 208, 09h22)
  mostra **CBMDF-2026-0158201**, já **ENCERRADA**, 12 minutos antes — o sinal de "já foi atendido".
- **Geolocalização imprecisa** (RN-11): a ocorrência **PMDF-2026-021150** (Ceilândia, precisão 800 m)
  é buscada por região administrativa + tipo, não por raio geográfico, e o candidato retorna marcado
  "Localização imprecisa".

---

## O que este protótipo não prova

Repetindo a ressalva já dada ao patrocínio: ele **não** mede a taxa de duplicidade real nem estabelece
o *baseline* da métrica §10 do documento de visão — isso só existe com dado de produção. Ele também não
valida desempenho, escala, nem a integração real com Hefesto/SAU. O que ele prova é **interação**:
que P1–P3 e o desacoplamento do §4.3 funcionam como desenhados, e que os parâmetros de raio/janela/score
(RN-04, RN-05, RN-07) produzem resultado sensato — ou não — quando confrontados com casos plantados de
propósito para serem difíceis.

## Perguntas para os operadores (quando houver teste real, fora do escopo deste protótipo)

- Esse raio (RN-05) te traz candidato relevante, ou lixo?
- Esse percentual de semelhança, sozinho, seria suficiente para você vincular sem ler o motivo?
- No passo 5 (a armadilha), o que faria você vincular por engano, se fizesse?
- Falta alguma informação no card do candidato para você decidir com confiança?
