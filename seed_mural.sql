-- ──────────────────────────────────────────────────────────────
-- AFORA · seed do mural de recados
-- clube Corrida Sunrise  (11111111-1111-1111-1111-111111111105)
-- clube Café & Crônicas  (11111111-1111-1111-1111-111111111101)
-- ──────────────────────────────────────────────────────────────

-- limpa seed anterior (seguro rodar mais de uma vez)
delete from post_comments where post_id in (
  select id from club_posts where club_id in (
    '11111111-1111-1111-1111-111111111105',
    '11111111-1111-1111-1111-111111111101'
  )
);
delete from club_posts where club_id in (
  '11111111-1111-1111-1111-111111111105',
  '11111111-1111-1111-1111-111111111101'
);


-- ── CORRIDA SUNRISE ───────────────────────────────────────────

insert into club_posts (id, club_id, user_id, content, pinned, created_at) values

-- post fixado pela host
(
  'a1000001-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111105',
  'aaaaaaaa-0000-0000-0000-000000000001', -- julia (host)
  '📌 bem-vindas ao mural do Corrida Sunrise!

esse é o espaço pra galera trocar ideia, contar como foi o treino, postar foto, perguntar o que quiser. pode ser informal mesmo — a ideia é a comunidade falar.

próxima corrida: sábado 7h no portão 10 do ibirapuera 🏃‍♀️',
  true,
  now() - interval '5 days'
),

-- post de membro
(
  'a1000001-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111105',
  'aaaaaaaa-0000-0000-0000-000000000003', -- bia
  'gente, alguém usa tênis da ASICS? tô querendo trocar o meu nimbus e não sei se vale a pena ir pro gel-kayano. meu pé é neutro mas tenho sentido o joelho reclamar nos treinos mais longos 😮‍💨',
  false,
  now() - interval '4 days'
),

-- post de membro com foto (texto descritivo)
(
  'a1000001-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111105',
  'aaaaaaaa-0000-0000-0000-000000000005', -- fernanda
  'treino de ontem foi pesado mas valeu demais 🔥 fiz 12k com pace 5:40 — PR pra mim nessa distância! obrigada julia e camila por não me deixarem parar no km 9 hahaha

semana que vem tô dentro do longão de domingo também',
  false,
  now() - interval '3 days'
),

-- post de dúvida logística
(
  'a1000001-0000-0000-0000-000000000004',
  '11111111-1111-1111-1111-111111111105',
  'aaaaaaaa-0000-0000-0000-000000000007', -- renata
  'oi pessoal! sou nova no grupo, entrei semana passada. alguém pode me dizer qual é o pace médio do treino de sábado? não quero segurar o grupo mas também não quero morrer logo no começo 😅',
  false,
  now() - interval '2 days'
),

-- post mais recente
(
  'a1000001-0000-0000-0000-000000000005',
  '11111111-1111-1111-1111-111111111105',
  'aaaaaaaa-0000-0000-0000-000000000002', -- camila
  'lembrete: o parque vai estar fechado no feriado do dia 15! a gente vai deslocar o treino pra ciclovia do rio pinheiros. saída às 7h na ponte da cidade universitária. já confirma pra eu fechar a lista 🙌',
  false,
  now() - interval '6 hours'
);


-- ── COMENTÁRIOS · Corrida Sunrise ─────────────────────────────

insert into post_comments (id, post_id, user_id, content, created_at) values

-- comentários no post 2 (tênis)
(
  'b1000001-0000-0000-0000-000000000001',
  'a1000001-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000002', -- camila
  'eu uso o kayano há 2 anos e amo! mas é bem mais pesado que o nimbus. se o joelho tá doendo, vale checar primeiro se é pisada ou fraqueza de quadril — tênis resolve pouca coisa se o problema for muscular 👀',
  now() - interval '3 days' + interval '2 hours'
),
(
  'b1000001-0000-0000-0000-000000000002',
  'a1000001-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000004', -- larissa
  'fui na magasin semana passada e fiz análise de pisada — super recomendo antes de comprar qualquer coisa. descobri que meu "neutro" era na verdade supinado leve',
  now() - interval '3 days' + interval '4 hours'
),
(
  'b1000001-0000-0000-0000-000000000003',
  'a1000001-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000003', -- bia
  'obrigada gente!! vou fazer a análise antes de comprar. camila, boa dica sobre o quadril — vou marcar uma sessão de fisio também 🙏',
  now() - interval '3 days' + interval '5 hours'
),

-- comentários no post 3 (PR da fernanda)
(
  'b1000001-0000-0000-0000-000000000004',
  'a1000001-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000001', -- julia
  'ARRASOU fernanda!! 5:40 de pace em 12k tá incrível. domingo você vem no longão sim, sem desculpa 😂',
  now() - interval '2 days' + interval '1 hour'
),
(
  'b1000001-0000-0000-0000-000000000005',
  'a1000001-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000002', -- camila
  'que orgulho!! nós sabiamos que você tinha isso 💪',
  now() - interval '2 days' + interval '2 hours'
),
(
  'b1000001-0000-0000-0000-000000000006',
  'a1000001-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000006', -- carol
  'domingo no longão eu também vou! bora montar um grupo de pace parecido',
  now() - interval '2 days' + interval '3 hours'
),

-- comentários no post 4 (renata nova)
(
  'b1000001-0000-0000-0000-000000000007',
  'a1000001-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000001', -- julia
  'oi renata, seja bem-vinda!! o pace do sábado fica entre 6:00 e 6:30 — é bem tranquilo, a ideia é todo mundo chegar junto. não se preocupa 😊',
  now() - interval '1 day' + interval '30 minutes'
),
(
  'b1000001-0000-0000-0000-000000000008',
  'a1000001-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000008', -- bruna
  'eu era novata também há 3 meses e o grupo é super acolhedor! vai ser ótimo 🤗',
  now() - interval '1 day' + interval '1 hour'
),

-- comentários no post 5 (aviso ciclovia)
(
  'b1000001-0000-0000-0000-000000000009',
  'a1000001-0000-0000-0000-000000000005',
  'aaaaaaaa-0000-0000-0000-000000000003', -- bia
  'confirmada!',
  now() - interval '5 hours'
),
(
  'b1000001-0000-0000-0000-000000000010',
  'a1000001-0000-0000-0000-000000000005',
  'aaaaaaaa-0000-0000-0000-000000000005', -- fernanda
  'dentro!! vou de metrô até lá, alguém mais?',
  now() - interval '4 hours'
),
(
  'b1000001-0000-0000-0000-000000000011',
  'a1000001-0000-0000-0000-000000000005',
  'aaaaaaaa-0000-0000-0000-000000000004', -- larissa
  'eu vou de metrô também fernanda, combina a gente se encontra na estação butantã?',
  now() - interval '3 hours'
);


-- ── CAFÉ & CRÔNICAS ───────────────────────────────────────────

insert into club_posts (id, club_id, user_id, content, pinned, created_at) values

-- post fixado
(
  'a2000001-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111101',
  'aaaaaaaa-0000-0000-0000-000000000001', -- julia (host)
  '📌 leitura do mês: "Torto Arado" — Itamar Vieira Junior

discussão marcada pra 22/06, sábado às 15h, no Café Girondino (Pinheiros). confirma no evento pra eu reservar mesas 📚

quem ainda não começou: não se preocupa, o livro é curto e vai rápido.',
  true,
  now() - interval '7 days'
),

(
  'a2000001-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111101',
  'aaaaaaaa-0000-0000-0000-000000000009', -- tati
  'terminei o torto arado ontem de madrugada porque não consegui parar 😭 que livro. vim aqui só pra falar isso sem spoilar nada. a gente precisa conversar sobre o capítulo final',
  false,
  now() - interval '3 days'
),

(
  'a2000001-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111101',
  'aaaaaaaa-0000-0000-0000-000000000010', -- duda
  'sugestão pro próximo mês: "Quarto de Despejo" da Carolina Maria de Jesus. tem tudo a ver com o torto arado e a gente ia fazer uma leitura super rica em sequência. o que acham?',
  false,
  now() - interval '2 days'
),

(
  'a2000001-0000-0000-0000-000000000004',
  '11111111-1111-1111-1111-111111111101',
  'aaaaaaaa-0000-0000-0000-000000000002', -- camila
  'alguém tem dica de onde comprar livro usado em SP? tô querendo montar uma estante mas o bolso chora comprando tudo novo 😅',
  false,
  now() - interval '1 day'
);


-- ── COMENTÁRIOS · Café & Crônicas ─────────────────────────────

insert into post_comments (id, post_id, user_id, content, created_at) values

-- comentários no post sobre torto arado (tati)
(
  'b2000001-0000-0000-0000-000000000001',
  'a2000001-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000003', -- bia
  'EU TAMBÉM li de madrugada!! fiquei com o coração partido por dias. não vejo a hora da discussão',
  now() - interval '2 days' + interval '2 hours'
),
(
  'b2000001-0000-0000-0000-000000000002',
  'a2000001-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000001', -- julia
  'é isso aí, pra isso a gente existe hahaha. dia 22 vem com os pensamentos organizados!',
  now() - interval '2 days' + interval '3 hours'
),

-- comentários na sugestão da duda
(
  'b2000001-0000-0000-0000-000000000003',
  'a2000001-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000001', -- julia
  'amei a sugestão duda! vou colocar em votação no próximo encontro. faz muito sentido como sequência temática 👏',
  now() - interval '1 day' + interval '1 hour'
),
(
  'b2000001-0000-0000-0000-000000000004',
  'a2000001-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000009', -- tati
  '+1 no quarto de despejo, li faz uns anos e é impactante demais',
  now() - interval '1 day' + interval '2 hours'
),

-- comentários na pergunta da camila (livros usados)
(
  'b2000001-0000-0000-0000-000000000005',
  'a2000001-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000010', -- duda
  'Livraria Megale em Pinheiros tem ótimos usados! e a Estante Virtual online tem de tudo com frete barato',
  now() - interval '20 hours'
),
(
  'b2000001-0000-0000-0000-000000000006',
  'a2000001-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000003', -- bia
  'feirinha do livro no largo da batata acontece aos domingos às vezes! fica de olho no instagram deles',
  now() - interval '18 hours'
),
(
  'b2000001-0000-0000-0000-000000000007',
  'a2000001-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000002', -- camila
  'gente vocês são demais obrigadaaa 🥹 vou nessa feirinha domingo!',
  now() - interval '16 hours'
);
