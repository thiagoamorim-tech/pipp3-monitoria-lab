import { Hono } from 'hono';

const aluno = new Hono();

// 1. Listar Turmas do Aluno
aluno.get('/turmas', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id;
    const { results } = await c.env.DB.prepare(`
      SELECT t.id, t.nome, t.codigo_acesso 
      FROM turmas t
      INNER JOIN aluno_turmas at ON t.id = at.turma_id
      WHERE at.aluno_id = ?
    `).bind(aluno_id).all();
    return c.json(results);
  } catch (error) { return c.json({ error: 'Erro: ' + error.message }, 500); }
});

// 2. Listar Módulos de uma Turma
aluno.get('/turmas/:turma_id/quizzes', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id;
    const turma_id = c.req.param('turma_id');

    const { results: trilhas } = await c.env.DB.prepare('SELECT * FROM trilhas WHERE turma_id = ?').bind(turma_id).all();
    if (trilhas.length === 0) return c.json([]);

    const trilhaIds = trilhas.map(t => t.id);
    const placeholders = trilhaIds.map(() => '?').join(',');

    const { results: quizzes } = await c.env.DB.prepare(`
      SELECT q.*, p.acertou as aluno_acertou FROM quizzes q
      LEFT JOIN progresso_aluno p ON q.id = p.quiz_id AND p.aluno_id = ?
      WHERE q.trilha_id IN (${placeholders})
    `).bind(aluno_id, ...trilhaIds).all();

    const trilhasFormatadas = trilhas.map(trilha => {
      const quizzesDaTrilha = quizzes.filter(q => q.trilha_id === trilha.id).map(q => ({
        ...q, ja_respondeu: q.aluno_acertou !== null, opcoes: JSON.parse(q.opcoes)
      }));
      return { ...trilha, quizzes: quizzesDaTrilha };
    });

    return c.json(trilhasFormatadas);
  } catch (error) { return c.json({ error: 'Erro: ' + error.message }, 500); }
});

// 3. Responder Quiz
aluno.post('/responder', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id; 
    const { quiz_id, resposta } = await c.req.json();
    if (!quiz_id || !resposta) return c.json({ error: 'Dados incompletos' }, 400);

    const jaRespondeu = await c.env.DB.prepare('SELECT id FROM progresso_aluno WHERE aluno_id = ? AND quiz_id = ?').bind(aluno_id, quiz_id).first();
    if (jaRespondeu) return c.json({ error: 'Você já respondeu este quiz.' }, 400);

    const quiz = await c.env.DB.prepare(`SELECT q.*, t.data_entrega as trilha_data_entrega FROM quizzes q JOIN trilhas t ON q.trilha_id = t.id WHERE q.id = ?`).bind(quiz_id).first();
    if (!quiz) return c.json({ error: 'Quiz não encontrado' }, 404);

    if (quiz.trilha_data_entrega) {
      const dataEntrega = new Date(quiz.trilha_data_entrega);
      dataEntrega.setHours(23, 59, 59, 999);
      if (new Date() > dataEntrega) return c.json({ error: 'O prazo para este módulo já expirou.' }, 403);
    }

    const acertou = quiz.resposta_correta === resposta;
    const xpGanho = acertou ? quiz.xp_recompensa : 0;

    await c.env.DB.prepare('INSERT INTO progresso_aluno (aluno_id, quiz_id, acertou) VALUES (?, ?, ?)').bind(aluno_id, quiz_id, acertou ? 1 : 0).run();
    
    if (acertou) {
      await c.env.DB.prepare('UPDATE usuarios SET xp_total = xp_total + ?, moedas = moedas + ? WHERE id = ?')
        .bind(xpGanho, Math.floor(xpGanho / 10), aluno_id).run();
    }

    return c.json({ acertou, xp_ganho: xpGanho, mensagem: acertou ? 'Parabéns!' : 'Incorreta.' });
  } catch (error) { return c.json({ error: 'Erro ao responder: ' + error.message }, 500); }
});

// 4. Desempenho (Agora com Avatar)
aluno.get('/desempenho', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id;
    const aluno = await c.env.DB.prepare('SELECT nome, xp_total, moedas, avatar_estilo FROM usuarios WHERE id = ?').bind(aluno_id).first();
    const stats = await c.env.DB.prepare('SELECT COUNT(*) as total, SUM(acertou) as acertos FROM progresso_aluno WHERE aluno_id = ?').bind(aluno_id).first();
    
    const total = stats.total || 0;
    const acertos = stats.acertos || 0;
    const media = total > 0 ? (acertos / total) * 100 : 0;

    let status = 'VERDE', mensagem = 'No caminho certo!';
    if (total === 0) { status = 'CINZA'; mensagem = 'Faça quizzes para gerar seu diagnóstico.'; }
    else if (media < 50) { status = 'VERMELHO'; mensagem = 'Risco de reprovação.'; }
    else if (media < 70) { status = 'AMARELO'; mensagem = 'Cuidado: aproveitamento baixo.'; }

    return c.json({ 
      nome: aluno.nome, 
      xp_total: aluno.xp_total, 
      moedas: aluno.moedas, 
      avatar_estilo: aluno.avatar_estilo || 'bottts',
      total_respostas: total, 
      media_acertos: media.toFixed(1), 
      status, 
      mensagem 
    });
  } catch (error) { return c.json({ error: 'Erro: ' + error.message }, 500); }
});

// 5. Entrar em Turma
aluno.post('/entrar-turma', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id;
    const { codigo_acesso } = await c.req.json();
    if (!codigo_acesso) return c.json({ error: 'Código obrigatório.' }, 400);
    const turma = await c.env.DB.prepare('SELECT id, nome FROM turmas WHERE codigo_acesso = ?').bind(codigo_acesso.toUpperCase()).first();
    if (!turma) return c.json({ error: 'Código inválido.' }, 404);
    const jaMatriculado = await c.env.DB.prepare('SELECT turma_id FROM aluno_turmas WHERE aluno_id = ? AND turma_id = ?').bind(aluno_id, turma.id).first();
    if (jaMatriculado) return c.json({ error: 'Você já está nesta turma.' }, 400);
    await c.env.DB.prepare('INSERT INTO aluno_turmas (aluno_id, turma_id) VALUES (?, ?)').bind(aluno_id, turma.id).run();
    return c.json({ message: `Você entrou na turma ${turma.nome}!` });
  } catch (error) { return c.json({ error: 'Erro: ' + error.message }, 500); }
});

// 6. Listar Intervenções Recebidas
aluno.get('/intervencoes', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id;
    const { results } = await c.env.DB.prepare(`
      SELECT i.*, u.nome as monitor_nome 
      FROM intervencoes i
      JOIN usuarios u ON i.monitor_id = u.id
      WHERE i.aluno_id = ? 
      ORDER BY i.criado_em DESC LIMIT 1
    `).bind(aluno_id).all();
    return c.json(results);
  } catch (error) { return c.json({ error: 'Erro: ' + error.message }, 500); }
});

// 7. Atualizar Avatar
aluno.put('/perfil/avatar', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id;
    const { avatar_estilo } = await c.req.json();
    if (!avatar_estilo) return c.json({ error: 'Estilo inválido.' }, 400);

    await c.env.DB.prepare('UPDATE usuarios SET avatar_estilo = ? WHERE id = ?')
      .bind(avatar_estilo, aluno_id).run();

    return c.json({ message: 'Avatar atualizado!' });
  } catch (error) { return c.json({ error: 'Erro ao atualizar avatar: ' + error.message }, 500); }
});

// 8. Ranking da Turma
aluno.get('/turmas/:id/ranking', async (c) => {
  try {
    const turma_id = c.req.param('id');
    const { results } = await c.env.DB.prepare(`
      SELECT u.id, u.nome, u.xp_total, u.avatar_estilo 
      FROM usuarios u
      INNER JOIN aluno_turmas at ON u.id = at.aluno_id
      WHERE at.turma_id = ?
      ORDER BY u.xp_total DESC LIMIT 10
    `).bind(turma_id).all();
    return c.json(results);
  } catch (error) { return c.json({ error: 'Erro ao buscar ranking: ' + error.message }, 500); }
});

// 9. Listar Loja de Recompensas (Com status de já comprado)
aluno.get('/turmas/:id/recompensas', async (c) => {
  try {
    const turma_id = c.req.param('id');
    const aluno_id = c.get('jwtPayload').id;

    const { results } = await c.env.DB.prepare(`
      SELECT r.*, i.id as inventario_id 
      FROM recompensas r
      LEFT JOIN inventario i ON r.id = i.recompensa_id AND i.aluno_id = ?
      WHERE r.turma_id = ?
    `).bind(aluno_id, turma_id).all();
    
    return c.json(results);
  } catch (error) { return c.json({ error: 'Erro: ' + error.message }, 500); }
});

// 10. Comprar Recompensa
aluno.post('/recompensas/:id/comprar', async (c) => {
  try {
    const recompensa_id = c.req.param('id');
    const aluno_id = c.get('jwtPayload').id;

    // Busca os dados da recompensa e do aluno
    const recompensa = await c.env.DB.prepare('SELECT * FROM recompensas WHERE id = ?').bind(recompensa_id).first();
    const aluno = await c.env.DB.prepare('SELECT moedas FROM usuarios WHERE id = ?').bind(aluno_id).first();

    if (!recompensa) return c.json({ error: 'Recompensa não encontrada.' }, 404);
    if (aluno.moedas < recompensa.custo_moedas) return c.json({ error: 'Saldo de moedas insuficiente.' }, 400);

    // Verifica se já comprou
    const jaComprou = await c.env.DB.prepare('SELECT id FROM inventario WHERE aluno_id = ? AND recompensa_id = ?')
      .bind(aluno_id, recompensa_id).first();
    if (jaComprou) return c.json({ error: 'Você já resgatou esta recompensa.' }, 400);

    // Desconta as moedas e insere no inventário
    await c.env.DB.prepare('UPDATE usuarios SET moedas = moedas - ? WHERE id = ?').bind(recompensa.custo_moedas, aluno_id).run();
    await c.env.DB.prepare('INSERT INTO inventario (aluno_id, recompensa_id) VALUES (?, ?)').bind(aluno_id, recompensa_id).run();

    return c.json({ message: 'Recompensa resgatada com sucesso!' });
  } catch (error) { return c.json({ error: 'Erro ao comprar: ' + error.message }, 500); }
});

export default aluno;
