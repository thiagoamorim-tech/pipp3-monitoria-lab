const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');

if (!token || !usuarioStr) { window.location.replace('/'); }

let usuario = {};
try { usuario = JSON.parse(usuarioStr); } catch (e) { window.location.replace('/'); }

if (usuario.tipo !== 'MONITOR') window.location.replace('/');

let turmaAtualId = null;
let turmaAtualNome = '';
let trilhaAtualId = null;
let alunoIntervencaoId = null;
let graficoRiscoInstance = null;

function logout() {
  localStorage.removeItem('token'); localStorage.removeItem('usuario'); window.location.replace('/'); 
}

const getHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-username').textContent = usuario.nome;
  document.querySelector('.btn-logout').addEventListener('click', logout);
  carregarTurmas();
});

function mudarAbaMonitor(aba) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (aba === 'geral') {
    document.querySelector('.tab:nth-child(1)').classList.add('active');
    document.getElementById('aba-geral').style.display = 'block';
    document.getElementById('aba-ranking-monitor').style.display = 'none';
  } else {
    document.querySelector('.tab:nth-child(2)').classList.add('active');
    document.getElementById('aba-geral').style.display = 'none';
    document.getElementById('aba-ranking-monitor').style.display = 'block';
  }
}

// ==================== TURMAS ====================
async function carregarTurmas() {
  try {
    const response = await fetch('/api/monitor/turmas', { headers: getHeaders() });
    if (response.status === 401) return logout();
    const turmas = await response.json();
    const container = document.getElementById('turmas-list');
    container.innerHTML = '';

    if (turmas.length === 0) { container.innerHTML = '<p style="color: var(--text-muted);">Você ainda não criou nenhuma turma.</p>'; return; }

    turmas.forEach(turma => {
      const div = document.createElement('div');
      div.className = 'quiz-item';
      div.innerHTML = `
        <div class="quiz-info"><h4>${turma.nome}</h4><p>Código: ${turma.codigo_acesso}</p></div>
        <button class="btn btn-primary" style="width: auto; padding: 8px 16px;" onclick="verAlunos(${turma.id}, '${turma.nome}')">Ver Alunos</button>
      `;
      container.appendChild(div);
    });
  } catch (error) { console.error(error); }
}

function abrirModalTurma() { document.getElementById('modal-turma').classList.add('active'); document.getElementById('nome-turma').value = ''; }
function fecharModalTurma() { document.getElementById('modal-turma').classList.remove('active'); }

async function criarTurma() {
  const nome = document.getElementById('nome-turma').value;
  if (!nome) return;
  try {
    await fetch('/api/monitor/turmas', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ nome }) });
    fecharModalTurma(); carregarTurmas();
  } catch (error) { console.error(error); }
}

// ==================== ALUNOS E GRÁFICOS ====================
async function verAlunos(turmaId, turmaNome) {
  turmaAtualId = turmaId; 
  turmaAtualNome = turmaNome;
  
  document.getElementById('view-turmas').style.display = 'none';
  document.getElementById('view-alunos').style.display = 'block';
  document.getElementById('view-trilhas').style.display = 'none';
  document.getElementById('view-questoes').style.display = 'none';
  document.getElementById('view-loja').style.display = 'none';
  
  document.getElementById('turma-nome-title').textContent = `Turma: ${turmaNome}`;
  mudarAbaMonitor('geral');

  const tbody = document.getElementById('alunos-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Carregando...</td></tr>';

  try {
    const response = await fetch(`/api/monitor/turmas/${turmaId}/alunos`, { headers: getHeaders() });
    const alunos = await response.json();
    tbody.innerHTML = '';

    const totalAlunos = alunos.length;
    const somaXP = alunos.reduce((acc, a) => acc + a.xp_total, 0);
    const mediaXP = totalAlunos > 0 ? Math.round(somaXP / totalAlunos) : 0;
    const alunosRisco = alunos.filter(a => a.status === 'VERMELHO').length;

    document.getElementById('card-total-alunos').textContent = totalAlunos;
    document.getElementById('card-media-xp').textContent = `${mediaXP} XP`;
    document.getElementById('card-alunos-risco').textContent = alunosRisco;

    if (alunos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Nenhum aluno matriculado.</td></tr>';
    } else {
      alunos.forEach(aluno => {
        const seed = encodeURIComponent(aluno.nome);
        const avatarUrl = `https://api.dicebear.com/7.x/${aluno.avatar_estilo}/svg?seed=${seed}`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div style="display: flex; align-items: center;">
              <img src="${avatarUrl}" class="avatar-table">
              <span style="font-weight: 600;">${aluno.nome}</span>
            </div>
          </td>
          <td>${aluno.xp_total} XP</td>
          <td>${aluno.media_acertos}%</td>
          <td><span class="status-badge ${aluno.status.toLowerCase()}">${aluno.status}</span></td>
          <td><button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="abrirModalIntervencao(${aluno.id}, '${aluno.nome}')">Intervir</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    criarGraficoRisco(alunos);

  } catch (error) { console.error(error); }

  carregarRankingMonitor(turmaId);
}

function criarGraficoRisco(alunos) {
  const ctx = document.getElementById('graficoRisco').getContext('2d');
  
  const verdes = alunos.filter(a => a.status === 'VERDE').length;
  const amarelos = alunos.filter(a => a.status === 'AMARELO').length;
  const vermelhos = alunos.filter(a => a.status === 'VERMELHO').length;
  const cinzas = alunos.filter(a => a.status === 'CINZA').length;

  if (graficoRiscoInstance) {
    graficoRiscoInstance.destroy();
  }

  graficoRiscoInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['No Caminho', 'Atenção', 'Risco', 'Sem Dados'],
      datasets: [{
        data: [verdes, amarelos, vermelhos, cinzas],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#94A3B8'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, usePointStyle: true, padding: 20 } },
        title: { display: true, text: 'Saúde da Turma', font: { family: 'Inter', size: 14, weight: 'bold' }, color: '#0F172A', padding: { bottom: 15 } }
      }
    }
  });
}

async function carregarRankingMonitor(turmaId) {
  try {
    const response = await fetch(`/api/monitor/turmas/${turmaId}/ranking`, { headers: getHeaders() });
    const ranking = await response.json();
    const container = document.getElementById('ranking-list-monitor');
    container.innerHTML = '';

    if (!Array.isArray(ranking) || ranking.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">Nenhum dado de ranking ainda.</p>';
      return;
    }

    ranking.forEach((aluno, index) => {
      const pos = index + 1;
      const div = document.createElement('div');
      div.className = `ranking-item top-${pos}`;
      const seed = encodeURIComponent(aluno.nome);
      const avatarUrl = `https://api.dicebear.com/7.x/${aluno.avatar_estilo || 'bottts'}/svg?seed=${seed}`;

      div.innerHTML = `
        <div class="ranking-pos">#${pos}</div>
        <img src="${avatarUrl}" class="ranking-avatar" alt="Avatar">
        <div class="ranking-name">${aluno.nome}</div>
        <div class="ranking-xp">${aluno.xp_total} XP</div>
      `;
      container.appendChild(div);
    });
  } catch (error) { console.error(error); }
}

function voltarParaTurmas() {
  document.getElementById('view-alunos').style.display = 'none'; 
  document.getElementById('view-trilhas').style.display = 'none';
  document.getElementById('view-questoes').style.display = 'none'; 
  document.getElementById('view-loja').style.display = 'none';
  document.getElementById('view-turmas').style.display = 'block';
  carregarTurmas();
}

// ==================== MÓDULOS E QUESTÕES ====================
async function verTrilhas(turmaId, turmaNome) {
  document.getElementById('view-alunos').style.display = 'none';
  document.getElementById('view-trilhas').style.display = 'block';
  document.getElementById('view-questoes').style.display = 'none';
  document.getElementById('view-loja').style.display = 'none';
  document.getElementById('turma-trilhas-title').textContent = `Módulos: ${turmaNome}`;
  carregarTrilhas(turmaId);
}

async function carregarTrilhas(turmaId) {
  try {
    const response = await fetch(`/api/monitor/turmas/${turmaId}/trilhas`, { headers: getHeaders() });
    const trilhas = await response.json();
    const container = document.getElementById('trilhas-list');
    container.innerHTML = '';

    if (trilhas.length === 0) { container.innerHTML = '<p style="color: var(--text-muted);">Nenhum módulo criado ainda.</p>'; return; }

    trilhas.forEach(trilha => {
      let dataFormatada = "Sem prazo";
      if (trilha.data_entrega) { dataFormatada = new Date(trilha.data_entrega).toLocaleDateString('pt-BR', {timeZone: 'UTC'}); }

      const div = document.createElement('div');
      div.className = 'quiz-item';
      div.innerHTML = `
        <div class="quiz-info"><h4>${trilha.titulo}</h4><p>${trilha.descricao || 'Sem descrição'} | Entrega: ${dataFormatada}</p></div>
        <button class="btn btn-primary" style="width: auto; padding: 8px 16px;" onclick="verQuestoes(${trilha.id}, '${trilha.titulo}')">Gerenciar Questões</button>
      `;
      container.appendChild(div);
    });
  } catch (error) { console.error(error); }
}

function abrirModalTrilha() { document.getElementById('modal-trilha').classList.add('active'); document.getElementById('titulo-trilha').value = ''; document.getElementById('desc-trilha').value = ''; document.getElementById('data-trilha').value = ''; document.getElementById('erro-trilha').style.display = 'none'; }
function fecharModalTrilha() { document.getElementById('modal-trilha').classList.remove('active'); }

async function criarTrilha() {
  const titulo = document.getElementById('titulo-trilha').value;
  const descricao = document.getElementById('desc-trilha').value;
  const data_entrega = document.getElementById('data-trilha').value;
  const erroDiv = document.getElementById('erro-trilha');
  if (!titulo || !data_entrega) { erroDiv.textContent = "Preencha o título e a data."; erroDiv.style.display = 'block'; return; }

  try {
    const response = await fetch(`/api/monitor/turmas/${turmaAtualId}/trilhas`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ titulo, descricao, data_entrega })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro');
    fecharModalTrilha(); carregarTrilhas(turmaAtualId);
  } catch (error) { erroDiv.textContent = error.message; erroDiv.style.display = 'block'; }
}

function voltarParaAlunos() {
  document.getElementById('view-trilhas').style.display = 'none'; 
  document.getElementById('view-questoes').style.display = 'none';
  document.getElementById('view-loja').style.display = 'none';
  document.getElementById('view-alunos').style.display = 'block';
}

async function verQuestoes(trilhaId, trilhaNome) {
  trilhaAtualId = trilhaId;
  document.getElementById('view-trilhas').style.display = 'none';
  document.getElementById('view-questoes').style.display = 'block';
  document.getElementById('trilha-nome-title').textContent = `Questões: ${trilhaNome}`;
  carregarQuestoes(trilhaId);
}

async function carregarQuestoes(trilhaId) {
  try {
    const response = await fetch(`/api/monitor/trilhas/${trilhaId}/quizzes`, { headers: getHeaders() });
    const questoes = await response.json();
    const container = document.getElementById('questoes-list');
    container.innerHTML = '';

    if (questoes.length === 0) { container.innerHTML = '<p style="color: var(--text-muted);">Nenhuma questão cadastrada.</p>'; return; }

    questoes.forEach((q, index) => {
      const div = document.createElement('div');
      div.className = 'quiz-item';
      div.innerHTML = `<div class="quiz-info"><h4>${index + 1}. ${q.pergunta}</h4><p>Resp: <strong>${q.resposta_correta}</strong> | XP: ${q.xp_recompensa}</p></div>`;
      container.appendChild(div);
    });
  } catch (error) { console.error(error); }
}

function abrirModalQuestao() { document.getElementById('modal-questao').classList.add('active'); document.getElementById('q-pergunta').value = ''; document.getElementById('q-opcao-a').value = ''; document.getElementById('q-opcao-b').value = ''; document.getElementById('q-opcao-c').value = ''; document.getElementById('q-opcao-d').value = ''; document.getElementById('q-resposta').value = ''; document.getElementById('q-xp').value = '10'; document.getElementById('erro-questao').style.display = 'none'; }
function fecharModalQuestao() { document.getElementById('modal-questao').classList.remove('active'); }

async function criarQuestao() {
  const pergunta = document.getElementById('q-pergunta').value;
  const opcao_a = document.getElementById('q-opcao-a').value;
  const opcao_b = document.getElementById('q-opcao-b').value;
  const opcao_c = document.getElementById('q-opcao-c').value;
  const opcao_d = document.getElementById('q-opcao-d').value;
  const resposta_select = document.getElementById('q-resposta').value;
  const xp = document.getElementById('q-xp').value;
  const erroDiv = document.getElementById('erro-questao');

  if (!pergunta || !opcao_a || !opcao_b || !opcao_c || !opcao_d || !resposta_select) { erroDiv.textContent = 'Preencha todos os campos.'; erroDiv.style.display = 'block'; return; }

  const mapa = { 'A': opcao_a, 'B': opcao_b, 'C': opcao_c, 'D': opcao_d };
  const resposta_correta = mapa[resposta_select];

  try {
    const response = await fetch(`/api/monitor/trilhas/${trilhaAtualId}/quizzes`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, xp_recompensa: parseInt(xp) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    fecharModalQuestao(); carregarQuestoes(trilhaAtualId);
  } catch (error) { erroDiv.textContent = error.message; erroDiv.style.display = 'block'; }
}

function voltarParaTrilhasList() { document.getElementById('view-questoes').style.display = 'none'; document.getElementById('view-trilhas').style.display = 'block'; }

// ==================== INTERVENÇÃO ====================
function abrirModalIntervencao(alunoId, alunoNome) { alunoIntervencaoId = alunoId; document.getElementById('modal-intervencao').classList.add('active'); document.querySelector('#modal-intervencao h2').textContent = `Intervir: ${alunoNome}`; document.getElementById('int-tipo').value = 'MENSAGEM'; toggleCamposIntervencao(); document.getElementById('int-mensagem').value = ''; document.getElementById('int-data').value = ''; document.getElementById('int-link').value = ''; document.getElementById('erro-intervencao').style.display = 'none'; }
function fecharModalIntervencao() { document.getElementById('modal-intervencao').classList.remove('active'); }
function toggleCamposIntervencao() { const tipo = document.getElementById('int-tipo').value; if (tipo === 'MENSAGEM') { document.getElementById('div-mensagem').style.display = 'block'; document.getElementById('div-agendamento').style.display = 'none'; } else { document.getElementById('div-mensagem').style.display = 'none'; document.getElementById('div-agendamento').style.display = 'block'; } }

async function salvarIntervencao() {
  const tipo = document.getElementById('int-tipo').value;
  const mensagem = document.getElementById('int-mensagem').value;
  const data_agendamento = document.getElementById('int-data').value;
  let link_reuniao = document.getElementById('int-link').value;
  const erroDiv = document.getElementById('erro-intervencao');

  if (tipo === 'MENSAGEM' && !mensagem) { erroDiv.textContent = 'Escreva a mensagem.'; erroDiv.style.display = 'block'; return; }
  if (tipo === 'AGENDAMENTO' && (!data_agendamento || !link_reuniao)) { erroDiv.textContent = 'Preencha data e link.'; erroDiv.style.display = 'block'; return; }
  if (link_reuniao && !link_reuniao.startsWith('http://') && !link_reuniao.startsWith('https://')) link_reuniao = 'https://' + link_reuniao;

  try {
    const response = await fetch('/api/monitor/intervencoes', {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ aluno_id: alunoIntervencaoId, tipo, mensagem, data_agendamento, link_reuniao })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    alert('Ação registrada com sucesso!'); fecharModalIntervencao();
  } catch (error) { erroDiv.textContent = error.message; erroDiv.style.display = 'block'; }
}

// ==================== LOJA DO MONITOR ====================
async function verLoja(turmaId, turmaNome) {
  document.getElementById('view-alunos').style.display = 'none';
  document.getElementById('view-loja').style.display = 'block';
  document.getElementById('turma-loja-title').textContent = `Loja: ${turmaNome}`;
  carregarLojaMonitor(turmaId);
}

async function carregarLojaMonitor(turmaId) {
  try {
    const response = await fetch(`/api/monitor/turmas/${turmaId}/recompensas`, { headers: getHeaders() });
    const recompensas = await response.json();
    const container = document.getElementById('loja-list');
    container.innerHTML = '';

    if (recompensas.length === 0) { container.innerHTML = '<p style="color: var(--text-muted);">Nenhuma recompensa cadastrada ainda.</p>'; return; }

    recompensas.forEach(rec => {
      const div = document.createElement('div');
      div.className = 'quiz-item';
      div.innerHTML = `<div class="quiz-info"><h4>${rec.nome}</h4><p>${rec.descricao || 'Sem descrição'}</p></div><div class="quiz-reward" style="color: var(--warning); background: transparent; padding: 0;">${rec.custo_moedas} Moedas</div>`;
      container.appendChild(div);
    });
  } catch (error) { console.error(error); }
}

function abrirModalRecompensa() { document.getElementById('modal-recompensa').classList.add('active'); document.getElementById('rec-nome').value = ''; document.getElementById('rec-desc').value = ''; document.getElementById('rec-custo').value = '50'; document.getElementById('erro-recompensa').style.display = 'none'; }
function fecharModalRecompensa() { document.getElementById('modal-recompensa').classList.remove('active'); }

async function criarRecompensa() {
  const nome = document.getElementById('rec-nome').value;
  const descricao = document.getElementById('rec-desc').value;
  const custo_moedas = document.getElementById('rec-custo').value;
  const erroDiv = document.getElementById('erro-recompensa');
  if (!nome || !custo_moedas) { erroDiv.textContent = 'Preencha o nome e o custo.'; erroDiv.style.display = 'block'; return; }

  try {
    const response = await fetch(`/api/monitor/turmas/${turmaAtualId}/recompensas`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ nome, descricao, custo_moedas: parseInt(custo_moedas) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    fecharModalRecompensa(); carregarLojaMonitor(turmaAtualId);
  } catch (error) { erroDiv.textContent = error.message; erroDiv.style.display = 'block'; }
}
