import { Hono } from 'hono';

const monitor = new Hono();

// 1. Listar Turmas do Monitor
monitor.get('/turmas', async (c) => {
  try {
    const monitor_id = c.get('jwtPayload').id;
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM turmas WHERE monitor_id = ? ORDER BY id DESC'
    ).bind(monitor_id).all();
    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Erro ao buscar turmas: ' + error.message }, 500);
  }
});

// 2. Criar Nova Turma
monitor.post('/turmas', async (c) => {
  try {
    const monitor_id = c.get('jwtPayload').id;
    const { nome } = await c.req.json();

    if (!nome) return c.json({ error: 'O nome da turma é obrigatório.' }, 400);

    const codigo_acesso = Math.random().toString(36).substring(2, 8).toUpperCase();

    await c.env.DB.prepare(
      'INSERT INTO turmas (nome, codigo_acesso, monitor_id) VALUES (?, ?, ?)'
    ).bind(nome, codigo_acesso, monitor_id).run();

    return c.json({ message: 'Turma criada com sucesso!', codigo_acesso }, 201);
  } catch (error) {
    return c.json({ error: 'Erro ao criar turma: ' + error.message }, 500);
  }
});

// 3. Listar Alunos de uma Turma
monitor.get('/turmas/:id/alunos', async (c) => {
  try {
    const turma_id = c.req.param('id');

    const { results: alunos } = await c.env.DB.prepare(`
      SELECT u.id, u.nome, u.xp_total 
      FROM usuarios u
      INNER JOIN aluno_turmas at ON u.id = at.aluno_id
      WHERE at.turma_id = ?
    `).bind(turma_id).all();

    const alunosComRisco = await Promise.all(alunos.map(async (aluno) => {
      const stats = await c.env.DB.prepare(
        'SELECT COUNT(*) as total, SUM(acertou) as acertos FROM progresso_aluno WHERE aluno_id = ?'
      ).bind(aluno.id).first();

      const total = stats.total || 0;
      const acertos = stats.acertos || 0;
      const media = total > 0 ? (acertos / total) * 100 : 0;

      let status = 'VERDE';
      if (total === 0) status = 'CINZA';
      else if (media < 50) status = 'VERMELHO';
      else if (media < 70) status = 'AMARELO';

      return {
        id: aluno.id, nome: aluno.nome, xp_total: aluno.xp_total,
        total_respostas: total, media_acertos: media.toFixed(1), status: status
      };
    }));

    return c.json(alunosComRisco);
  } catch (error) {
    return c.json({ error: 'Erro ao carregar alunos: ' + error.message }, 500);
  }
});

// 4. Listar Trilhas de uma Turma
monitor.get('/turmas/:id/trilhas', async (c) => {
  try {
    const turma_id = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM trilhas WHERE turma_id = ? ORDER BY id DESC'
    ).bind(turma_id).all();
    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Erro ao buscar trilhas: ' + error.message }, 500);
  }
});

// 5. Criar Nova Trilha na Turma
monitor.post('/turmas/:id/trilhas', async (c) => {
  try {
    const turma_id = c.req.param('id');
    const monitor_id = c.get('jwtPayload').id;
    const { titulo, descricao } = await c.req.json();

    if (!titulo) return c.json({ error: 'O título da trilha é obrigatório.' }, 400);

    await c.env.DB.prepare(
      'INSERT INTO trilhas (titulo, descricao, monitor_id, turma_id) VALUES (?, ?, ?, ?)'
    ).bind(titulo, descricao, monitor_id, turma_id).run();

    return c.json({ message: 'Trilha criada com sucesso!' }, 201);
  } catch (error) {
    return c.json({ error: 'Erro ao criar trilha: ' + error.message }, 500);
  }
});

// 6. Listar Questões de um Módulo (Trilha)
monitor.get('/trilhas/:trilha_id/quizzes', async (c) => {
  try {
    const trilha_id = c.req.param('trilha_id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM quizzes WHERE trilha_id = ? ORDER BY id ASC'
    ).bind(trilha_id).all();
    
    // Formata as opções de JSON para Array
    const formatados = results.map(q => ({ ...q, opcoes: JSON.parse(q.opcoes) }));
    return c.json(formatados);
  } catch (error) {
    return c.json({ error: 'Erro ao buscar questões: ' + error.message }, 500);
  }
});

// 7. Criar Nova Questão no Módulo
monitor.post('/trilhas/:trilha_id/quizzes', async (c) => {
  try {
    const trilha_id = c.req.param('trilha_id');
    const { pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, xp_recompensa } = await c.req.json();

    if (!pergunta || !opcao_a || !opcao_b || !opcao_c || !opcao_d || !resposta_correta) {
      return c.json({ error: 'Preencha todos os campos da questão.' }, 400);
    }

    const opcoesArray = [opcao_a, opcao_b, opcao_c, opcao_d];
    
    // Verifica se a resposta correta está entre as opções
    if (!opcoesArray.includes(resposta_correta)) {
      return c.json({ error: 'A resposta correta deve ser uma das opções.' }, 400);
    }

    const opcoesJSON = JSON.stringify(opcoesArray);

    await c.env.DB.prepare(
      'INSERT INTO quizzes (pergunta, opcoes, resposta_correta, xp_recompensa, trilha_id) VALUES (?, ?, ?, ?, ?)'
    ).bind(pergunta, opcoesJSON, resposta_correta, xp_recompensa || 10, trilha_id).run();

    return c.json({ message: 'Questão adicionada com sucesso!' }, 201);
  } catch (error) {
    return c.json({ error: 'Erro ao criar questão: ' + error.message }, 500);
  }
});

export default monitor;
