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
  } catch (error) {
    return c.json({ error: 'Erro ao buscar turmas: ' + error.message }, 500);
  }
});

// 2. Listar Módulos de uma Turma Específica
aluno.get('/turmas/:turma_id/quizzes', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id;
    const turma_id = c.req.param('turma_id');

    // Busca as trilhas apenas dessa turma
    const { results: trilhas } = await c.env.DB.prepare(
      'SELECT * FROM trilhas WHERE turma_id = ?'
    ).bind(turma_id).all();

    if (trilhas.length === 0) return c.json([]);

    const trilhaIds = trilhas.map(t => t.id);
    const placeholders = trilhaIds.map(() => '?').join(',');

    const { results: quizzes } = await c.env.DB.prepare(`
      SELECT q.*, p.acertou as aluno_acertou 
      FROM quizzes q
      LEFT JOIN progresso_aluno p ON q.id = p.quiz_id AND p.aluno_id = ?
      WHERE q.trilha_id IN (${placeholders})
    `).bind(aluno_id, ...trilhaIds).all();

    const trilhasFormatadas = trilhas.map(trilha => {
      const quizzesDaTrilha = quizzes
        .filter(q => q.trilha_id === trilha.id)
        .map(q => ({
          ...q, ja_respondeu: q.aluno_acertou !== null, opcoes: JSON.parse(q.opcoes)
        }));
      return { ...trilha, quizzes: quizzesDaTrilha };
    });

    return c.json(trilhasFormatadas);
  } catch (error) {
    return c.json({ error: 'Erro ao buscar módulos: ' + error.message }, 500);
  }
});

// 3. Responder Quiz
aluno.post('/responder', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id; 
    const { quiz_id, resposta } = await c.req.json();

    if (!quiz_id || !resposta) return c.json({ error: 'Dados incompletos' }, 400);

    const jaRespondeu = await c.env.DB.prepare(
      'SELECT id FROM progresso_aluno WHERE aluno_id = ? AND quiz_id = ?'
    ).bind(aluno_id, quiz_id).first();

    if (jaRespondeu) return c.json({ error: 'Você já respondeu este quiz.' }, 400);

    const quiz = await c.env.DB.prepare(`
      SELECT q.*, t.data_entrega as trilha_data_entrega 
      FROM quizzes q JOIN trilhas t ON q.trilha_id = t.id WHERE q.id = ?
    `).bind(quiz_id).first();
    
    if (!quiz) return c.json({ error: 'Quiz não encontrado' }, 404);

    if (quiz.trilha_data_entrega) {
      const dataEntrega = new Date(quiz.trilha_data_entrega);
      dataEntrega.setHours(23, 59, 59, 999);
      if (new Date() > dataEntrega) {
        return c.json({ error: 'O prazo para este módulo já expirou.' }, 403);
      }
    }

    const acertou = quiz.resposta_correta === resposta;
    const xpGanho = acertou ? quiz.xp_recompensa : 0;

    await c.env.DB.prepare(
      'INSERT INTO progresso_aluno (aluno_id, quiz_id, acertou) VALUES (?, ?, ?)'
    ).bind(aluno_id, quiz_id, acertou ? 1 : 0).run();

    if (acertou) {
      await c.env.DB.prepare(
        'UPDATE usuarios SET xp_total = xp_total + ? WHERE id = ?'
      ).bind(xpGanho, aluno_id).run();
    }

    return c.json({ acertou, xp_ganho: xpGanho, mensagem: acertou ? 'Parabéns!' : 'Incorreta.' });
  } catch (error) {
    return c.json({ error: 'Erro ao responder: ' + error.message }, 500);
  }
});

// 4. Desempenho
aluno.get('/desempenho', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id;
    const aluno = await c.env.DB.prepare('SELECT nome, xp_total FROM usuarios WHERE id = ?').bind(aluno_id).first();
    const stats = await c.env.DB.prepare(
      'SELECT COUNT(*) as total, SUM(acertou) as acertos FROM progresso_aluno WHERE aluno_id = ?'
    ).bind(aluno_id).first();

    const total = stats.total || 0;
    const acertos = stats.acertos || 0;
    const media = total > 0 ? (acertos / total) * 100 : 0;

    let status = 'VERDE', mensagem = 'No caminho certo!';
    if (total === 0) { status = 'CINZA'; mensagem = 'Faça quizzes para gerar seu diagnóstico.'; }
    else if (media < 50) { status = 'VERMELHO'; mensagem = 'Risco de reprovação.'; }
    else if (media < 70) { status = 'AMARELO'; mensagem = 'Cuidado: aproveitamento baixo.'; }

    return c.json({ nome: aluno.nome, xp_total: aluno.xp_total, total_respostas: total, media_acertos: media.toFixed(1), status, mensagem });
  } catch (error) {
    return c.json({ error: 'Erro ao buscar desempenho: ' + error.message }, 500);
  }
});

// 5. Entrar em Turma
aluno.post('/entrar-turma', async (c) => {
  try {
    const aluno_id = c.get('jwtPayload').id;
    const { codigo_acesso } = await c.req.json();
    if (!codigo_acesso) return c.json({ error: 'Código obrigatório.' }, 400);

    const turma = await c.env.DB.prepare('SELECT id, nome FROM turmas WHERE codigo_acesso = ?')
      .bind(codigo_acesso.toUpperCase()).first();
    if (!turma) return c.json({ error: 'Código inválido.' }, 404);

    const jaMatriculado = await c.env.DB.prepare('SELECT turma_id FROM aluno_turmas WHERE aluno_id = ? AND turma_id = ?')
      .bind(aluno_id, turma.id).first();
    if (jaMatriculado) return c.json({ error: 'Você já está nesta turma.' }, 400);

    await c.env.DB.prepare('INSERT INTO aluno_turmas (aluno_id, turma_id) VALUES (?, ?)')
      .bind(aluno_id, turma.id).run();

    return c.json({ message: `Você entrou na turma ${turma.nome}!` });
  } catch (error) {
    return c.json({ error: 'Erro ao entrar na turma: ' + error.message }, 500);
  }
});

export default aluno;
