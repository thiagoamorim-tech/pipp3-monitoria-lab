import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.text('MonitorIA API esta no ar!');
});

app.get('/api/status', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT 1 as status').all();

    if (results && results[0].status === 1) {
      return c.json({
        ok: true,
        message: 'Conexao com o banco de dados D1 estabelecida com sucesso.',
        timestamp: new Date().toISOString()
      });
    } else {
      return c.json({ ok: false, message: 'Falha na consulta de status do banco.' }, 500);
    }
  } catch (error) {
    console.error('Erro na rota /api/status:', error);
    return c.json({
      ok: false,
      message: 'Erro ao conectar com o banco de dados D1.',
      error: error.message
    }, 500);
  }
});

app.get('/api/quizzes', (c) => {
  const quizzes = [
    { id: 1, titulo: 'Desafio de Logica de Programacao', descricao: 'Algoritmos e estruturas de controle.', semana: 1, xp_recompensa: 100 },
    { id: 2, titulo: 'Quiz de Banco de Dados Relacionais', descricao: 'Modelagem, SQL e normalizacao.', semana: 1, xp_recompensa: 150 },
    { id: 3, titulo: 'Fundamentos de Git e GitHub', descricao: 'Controle de versao distribuido.', semana: 1, xp_recompensa: 120 }
  ];
  return c.json(quizzes);
});

export default app;
