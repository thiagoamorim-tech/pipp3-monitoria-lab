import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Permite que o frontend acesse a API
app.use('/api/*', cors());

// Rota de Healthcheck
app.get('/', (c) => {
  return c.text('MonitorIA API esta no ar!');
});

// Rota de status do banco
app.get('/api/status', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT 1 as status').all();
    if (results && results[0].status === 1) {
      return c.json({ ok: true, message: 'Conexao com o D1 funcionando.' });
    }
    return c.json({ ok: false, message: 'Falha no banco.' }, 500);
  } catch (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }
});

// 1. Listar todos os quizzes
app.get('/api/quizzes', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM quizzes').all();
    const quizzesFormatados = results.map(quiz => ({
      ...quiz,
      opcoes: JSON.parse(quiz.opcoes)
    }));
    return c.json(quizzesFormatados);
  } catch (error) {
    return c.json({ error: 'Erro ao buscar quizzes: ' + error.message }, 500);
  }
});

// 2. Responder um quiz
app.post('/api/responder', async (c) => {
  try {
    const body = await c.req.json();
    const { aluno_id, quiz_id, resposta } = body;

    if (!aluno_id || !quiz_id || !resposta) {
      return c.json({ error: 'Dados incompletos' }, 400);
    }

    // NOVO: Verifica se o aluno já respondeu este quiz
    const jaRespondeu = await c.env.DB.prepare(
      'SELECT id FROM progresso_aluno WHERE aluno_id = ? AND quiz_id = ?'
    ).bind(aluno_id, quiz_id).first();

    if (jaRespondeu) {
      return c.json({ error: 'Voce ja respondeu este quiz.' }, 400);
    }

    // Busca o quiz para saber a resposta correta e o XP
    const quiz = await c.env.DB.prepare('SELECT * FROM quizzes WHERE id = ?').bind(quiz_id).first();
    
    if (!quiz) {
      return c.json({ error: 'Quiz nao encontrado' }, 404);
    }

    const acertou = quiz.resposta_correta === resposta;
    const xpGanho = acertou ? quiz.xp_recompensa : 0;

    // Salva o progresso
    await c.env.DB.prepare(
      'INSERT INTO progresso_aluno (aluno_id, quiz_id, acertou) VALUES (?, ?, ?)'
    ).bind(aluno_id, quiz_id, acertou ? 1 : 0).run();

    // Se acertou, atualiza o XP do aluno
    if (acertou) {
      await c.env.DB.prepare(
        'UPDATE usuarios SET xp_total = xp_total + ? WHERE id = ?'
      ).bind(xpGanho, aluno_id).run();
    }

    return c.json({
      acertou: acertou,
      xp_ganho: xpGanho,
      mensagem: acertou ? 'Parabens! Voce acertou.' : 'Que pena, resposta incorreta.'
    });

  } catch (error) {
    return c.json({ error: 'Erro ao responder: ' + error.message }, 500);
  }
});

// 3. Painel de Desempenho (Indicador de Risco)
app.get('/api/desempenho/:aluno_id', async (c) => {
  try {
    const aluno_id = c.req.param('aluno_id');

    const aluno = await c.env.DB.prepare('SELECT nome, xp_total FROM usuarios WHERE id = ?').bind(aluno_id).first();
    
    if (!aluno) return c.json({ error: 'Aluno nao encontrado' }, 404);

    const stats = await c.env.DB.prepare(
      'SELECT COUNT(*) as total, SUM(acertou) as acertos FROM progresso_aluno WHERE aluno_id = ?'
    ).bind(aluno_id).first();

    const total = stats.total || 0;
    const acertos = stats.acertos || 0;
    const media = total > 0 ? (acertos / total) * 100 : 0;

    let status = 'VERDE';
    let mensagem = 'No caminho certo! Continue assim.';

    if (total === 0) {
      status = 'CINZA';
      mensagem = 'Responda aos quizzes para gerar seu diagnostico.';
    } else if (media < 50) {
      status = 'VERMELHO';
      mensagem = 'Atencao: risco de reprovacao. Sugerimos revisar o conteudo.';
    } else if (media < 70) {
      status = 'AMARELO';
      mensagem = 'Cuidado: seu aproveitamento pode melhorar.';
    }

    return c.json({
      nome: aluno.nome,
      xp_total: aluno.xp_total,
      total_respostas: total,
      media_acertos: media.toFixed(1),
      status: status,
      mensagem: mensagem
    });

  } catch (error) {
    return c.json({ error: 'Erro ao buscar desempenho: ' + error.message }, 500);
  }
});

export default app;
