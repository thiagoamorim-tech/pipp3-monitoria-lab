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
  } catch (error) { return c.json({ error: 'Erro: ' + error.message }, 500); }
});

// 2. Criar Nova Turma
monitor.post('/turmas', async (c) => {
  try {
    const monitor_id = c.get('jwtPayload').id;
    const { nome } = await c.req.json();
    if (!nome) return c.json({ error: 'O nome é obrigatório.' }, 400);
    const codigo_acesso = Math.random().toString(36).substring(2, 8).toUpperCase();
    await c.env.DB.prepare('INSERT INTO turmas (nome, codigo_acesso, monitor_id) VALUES (?, ?, ?)')
      .bind(nome, codigo_acesso, monitor_id).run();
    return c.json({ message: 'Turma criada!', codigo_acesso }, 201);
  } catch (error) { return c.json({ error: 'Erro ao criar turma: ' + error.message }, 500); }
});

// 3. Listar Alunos de uma Turma (Agora com avatar)
monitor.get('/turmas/:id/alunos', async (c) => {
  try {
    const turma_id = c.req.param('id');
    const { results: alunos } = await c.env.DB.prepare(`
      SELECT u.id, u.nome, u.xp_total, u.avatar_estilo 
      FROM usuarios u
      INNER JOIN aluno_turmas at ON u.id = at.aluno_id WHERE at.turma_id = ?
    `).bind(turma_id).all();

    const alunosComRisco = await Promise.all(alunos.map(async (aluno) => {
      const stats = await c.env.DB.prepare('SELECT COUNT(*) as total, SUM(acertou) as acertos FROM progresso_aluno WHERE aluno_id = ?')
        .bind(aluno.id).first();
      const total = stats.total || 0;
      const acertos = stats.acertos || 0;
      const media = total > 0 ? (acertos / total) * 100 : 0;
      let status = 'VERDE';
      if (total === 0) status = 'CINZA';
      else if (media < 50) status = 'VERMELHO';
      else if (media < 70) status = 'AMARELO';
      
      return { 
        id: aluno.id, 
        nome: aluno.nome, 
        xp_total: aluno.xp_total, 
        avatar_estilo: aluno.avatar_estilo || 'bottts',
        total_respostas: total, 
        media_acertos: media.toFixed(1), 
        status: status 
      };
    }));
    return c.json(alunosComRisco);
  } catch (error) { return c.json({ error: 'Erro: ' + error.message }, 500); }
});

// 4. Listar Trilhas de uma Turma
monitor.get('/turmas/:id/trilhas', async (c) => {
  try {
    const turma_id = c.req.param('id');
    const { results } = await c.env.DB.prepare('SELECT * FROM trilhas WHERE turma_id = ? ORDER BY id DESC')
      .bind(turma_id).all();
    return c.json(results);
  } catch (error) { return c.json({ error: 'Erro: ' + error.message }, 500); }
});

// 5. Criar Nova Trilha na Turma
monitor.post('/turmas/:id/trilhas', async (c) => {
  try {
    const turma_id = c.req.param('id');
    const monitor_id = c.get('jwtPayload').id;
    const { titulo, descricao, data_entrega } = await c.req.json();
    if (!titulo) return c.json({ error: 'O título é obrigatório.' }, 400);
    await c.env.DB.prepare(
      'INSERT INTO trilhas (titulo, descricao, monitor_id, turma_id, data_entrega) VALUES (?, ?, ?, ?, ?)'
    ).bind(titulo, descricao, monitor_id, turma_id, data_entrega || null).run();
    return c.json({ message: 'Módulo criado!' }, 201);
  } catch (error) { return c.json({ error: 'Erro ao criar módulo: ' + error.message }, 500); }
});

// 6. Listar Questões de um Módulo (Trilha)
monitor.get('/trilhas/:trilha_id/quizzes', async (c) => {
  try {
    const trilha_id = c.req.param('trilha_id');
    const { results } = await c.env.DB.prepare('SELECT * FROM quizzes WHERE trilha_id = ? ORDER BY id ASC')
      .bind(trilha_id).all();
    const formatados = results.map(q => ({ ...q, opcoes: JSON.parse(q.opcoes) }));
    return c.json(formatados);
  } catch (error) { return c.json({ error: 'Erro ao buscar questões: ' + error.message }, 500); }
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
    if (!opcoesArray.includes(resposta_correta)) {
      return c.json({ error: 'A resposta correta deve ser uma das opções.' }, 400);
    }
    const opcoesJSON = JSON.stringify(opcoesArray);
    await c.env.DB.prepare(
      'INSERT INTO quizzes (pergunta, opcoes, resposta_correta, xp_recompensa, trilha_id) VALUES (?, ?, ?, ?, ?)'
    ).bind(pergunta, opcoesJSON, resposta_correta, xp_recompensa || 10, trilha_id).run();
    return c.json({ message: 'Questão adicionada com sucesso!' }, 201);
  } catch (error) { return c.json({ error: 'Erro ao criar questão: ' + error.message }, 500); }
});

// 8. Criar Intervenção para um Aluno
monitor.post('/intervencoes', async (c) => {
  try {
    const monitor_id = c.get('jwtPayload').id;
    const { aluno_id, tipo, mensagem, data_agendamento, link_reuniao } = await c.req.json();
    if (!aluno_id || !tipo) return c.json({ error: 'Aluno e tipo são obrigatórios.' }, 400);
    await c.env.DB.prepare(
      'INSERT INTO intervencoes (aluno_id, monitor_id, tipo, mensagem, data_agendamento, link_reuniao) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(aluno_id, monitor_id, tipo, mensagem || null, data_agendamento || null, link_reuniao || null).run();
    return c.json({ message: 'Intervenção registrada com sucesso!' }, 201);
  } catch (error) { return c.json({ error: 'Erro ao registrar intervenção: ' + error.message }, 500); }
});

// 9. Ranking da Turma
monitor.get('/turmas/:id/ranking', async (c) => {
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

// 10. Listar Recompensas da Turma
monitor.get('/turmas/:id/recompensas', async (c) => {
  try {
    const turma_id = c.req.param('id');
    const { results } = await c.env.DB.prepare('SELECT * FROM recompensas WHERE turma_id = ? ORDER BY id DESC')
      .bind(turma_id).all();
    return c.json(results);
  } catch (error) { return c.json({ error: 'Erro: ' + error.message }, 500); }
});

// 11. Criar Nova Recompensa
monitor.post('/turmas/:id/recompensas', async (c) => {
  try {
    const turma_id = c.req.param('id');
    const { nome, descricao, custo_moedas } = await c.req.json();
    if (!nome || !custo_moedas) return c.json({ error: 'Nome e custo são obrigatórios.' }, 400);
    await c.env.DB.prepare(
      'INSERT INTO recompensas (turma_id, nome, descricao, custo_moedas) VALUES (?, ?, ?, ?)'
    ).bind(turma_id, nome, descricao || null, custo_moedas).run();
    return c.json({ message: 'Recompensa criada!' }, 201);
  } catch (error) { return c.json({ error: 'Erro ao criar: ' + error.message }, 500); }
});

export default monitor;
