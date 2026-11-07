const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');

if (!token || !usuarioStr) { window.location.replace('/'); }

let usuario = {};
try { usuario = JSON.parse(usuarioStr); } catch (e) { window.location.replace('/'); }

if (usuario.tipo !== 'MONITOR') window.location.replace('/');

let turmaAtualId = null;
let turmaAtualNome = '';
let trilhaAtualId = null;
let trilhaAtualNome = '';

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.replace('/'); 
}

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nav-username').textContent = usuario.nome;
  document.querySelector('.btn-logout').addEventListener('click', logout);
  carregarTurmas();
});

// ==================== TURMAS ====================
async function carregarTurmas() {
  try {
    const response = await fetch('/api/monitor/turmas', { headers: getHeaders() });
    if (response.status === 401) return logout();
    
    const turmas = await response.json();
    const container = document.getElementById('turmas-list');
    container.innerHTML = '';

    if (turmas.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">Você ainda não criou nenhuma turma.</p>';
      return;
    }

    turmas.forEach(turma => {
      const div = document.createElement('div');
      div.className = 'turma-card';
      div.innerHTML = `
        <div class="turma-info">
          <h4>${turma.nome}</h4>
          <p>Código: <code>${turma.codigo_acesso}</code></p>
        </div>
        <button class="btn btn-primary" style="width: auto; padding: 8px 16px;" onclick="verAlunos(${turma.id}, '${turma.nome}')">Ver Alunos</button>
      `;
      container.appendChild(div);
    });
  } catch (error) { console.error(error); }
}

function abrirModalTurma() {
  document.getElementById('modal-turma').classList.add('active');
  document.getElementById('nome-turma').value = '';
  document.getElementById('erro-turma').style.display = 'none';
}

function fecharModalTurma() {
  document.getElementById('modal-turma').classList.remove('active');
}

async function criarTurma() {
  const nome = document.getElementById('nome-turma').value;
  const erroDiv = document.getElementById('erro-turma');
  
  if (!nome) {
    erroDiv.textContent = "O nome da turma é obrigatório.";
    erroDiv.style.display = 'block';
    return;
  }

  try {
    const response = await fetch('/api/monitor/turmas', {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ nome })
    });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error);
    
    fecharModalTurma();
    carregarTurmas();
  } catch (error) { 
    erroDiv.textContent = error.message;
    erroDiv.style.display = 'block';
  }
}

// ==================== ALUNOS ====================
async function verAlunos(turmaId, turmaNome) {
  turmaAtualId = turmaId;
  turmaAtualNome = turmaNome;
  
  document.getElementById('view-turmas').style.display = 'none';
  document.getElementById('view-alunos').style.display = 'block';
  document.getElementById('view-trilhas').style.display = 'none';
  document.getElementById('view-questoes').style.display = 'none';
  
  document.getElementById('turma-nome-title').textContent = `Alunos: ${turmaNome}`;

  const tbody = document.getElementById('alunos-tbody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Carregando...</td></tr>';

  try {
    const response = await fetch(`/api/monitor/turmas/${turmaId}/alunos`, { headers: getHeaders() });
    const alunos = await response.json();
    tbody.innerHTML = '';

    if (alunos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum aluno matriculado.</td></tr>';
      return;
    }

    alunos.forEach(aluno => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${aluno.nome}</td>
        <td>${aluno.xp_total} XP</td>
        <td>${aluno.total_respostas}</td>
        <td>${aluno.media_acertos}%</td>
        <td><span class="status-badge ${aluno.status.toLowerCase()}">${aluno.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) { console.error(error); }
}

function voltarParaTurmas() {
  document.getElementById('view-alunos').style.display = 'none';
  document.getElementById('view-trilhas').style.display = 'none';
  document.getElementById('view-questoes').style.display = 'none';
  document.getElementById('view-turmas').style.display = 'block';
  carregarTurmas();
}

// ==================== TRILHAS ====================
async function verTrilhas(turmaId, turmaNome) {
  document.getElementById('view-alunos').style.display = 'none';
  document.getElementById('view-trilhas').style.display = 'block';
  document.getElementById('view-questoes').style.display = 'none';
  document.getElementById('turma-trilhas-title').textContent = `Módulos: ${turmaNome}`;
  carregarTrilhas(turmaId);
}

async function carregarTrilhas(turmaId) {
  try {
    const response = await fetch(`/api/monitor/turmas/${turmaId}/trilhas`, { headers: getHeaders() });
    const trilhas = await response.json();
    const container = document.getElementById('trilhas-list');
    container.innerHTML = '';

    if (trilhas.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">Nenhum módulo criado ainda.</p>';
      return;
    }

    trilhas.forEach(trilha => {
      let dataFormatada = "Sem prazo";
      if (trilha.data_entrega) {
        const d = new Date(trilha.data_entrega);
        dataFormatada = d.toLocaleDateString('pt-BR', {timeZone: 'UTC'}); 
      }

      const div = document.createElement('div');
      div.className = 'turma-card';
      div.innerHTML = `
        <div class="turma-info">
          <h4>${trilha.titulo}</h4>
          <p>${trilha.descricao || 'Sem descrição'} | Entrega: ${dataFormatada}</p>
        </div>
        <button class="btn btn-primary" style="width: auto; padding: 8px 16px;" onclick="verQuestoes(${trilha.id}, '${trilha.titulo}')">Gerenciar Questões</button>
      `;
      container.appendChild(div);
    });
  } catch (error) { console.error(error); }
}

function abrirModalTrilha() {
  document.getElementById('modal-trilha').classList.add('active');
  document.getElementById('titulo-trilha').value = '';
  document.getElementById('desc-trilha').value = '';
  document.getElementById('data-trilha').value = '';
  document.getElementById('erro-trilha').style.display = 'none';
}

function fecharModalTrilha() {
  document.getElementById('modal-trilha').classList.remove('active');
}

async function criarTrilha() {
  const titulo = document.getElementById('titulo-trilha').value;
  const descricao = document.getElementById('desc-trilha').value;
  const data_entrega = document.getElementById('data-trilha').value;
  const erroDiv = document.getElementById('erro-trilha');

  if (!titulo || !data_entrega) {
    erroDiv.textContent = "Preencha o título e a data de entrega.";
    erroDiv.style.display = 'block';
    return;
  }

  try {
    const response = await fetch(`/api/monitor/turmas/${turmaAtualId}/trilhas`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ titulo, descricao, data_entrega })
    });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Erro ao criar módulo');

    fecharModalTrilha();
    carregarTrilhas(turmaAtualId);
  } catch (error) { 
    erroDiv.textContent = error.message;
    erroDiv.style.display = 'block';
  }
}

function voltarParaAlunos() {
  document.getElementById('view-trilhas').style.display = 'none';
  document.getElementById('view-questoes').style.display = 'none';
  document.getElementById('view-alunos').style.display = 'block';
}

// ==================== QUESTÕES ====================
async function verQuestoes(trilhaId, trilhaNome) {
  trilhaAtualId = trilhaId;
  trilhaAtualNome = trilhaNome;
  
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

    if (questoes.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">Nenhuma questão cadastrada neste módulo ainda.</p>';
      return;
    }

    questoes.forEach((q, index) => {
      const div = document.createElement('div');
      div.className = 'turma-card';
      div.innerHTML = `
        <div class="turma-info">
          <h4>${index + 1}. ${q.pergunta}</h4>
          <p>Resposta correta: <strong>${q.resposta_correta}</strong> | XP: ${q.xp_recompensa}</p>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) { console.error(error); }
}

function abrirModalQuestao() {
  document.getElementById('modal-questao').classList.add('active');
  document.getElementById('q-pergunta').value = '';
  document.getElementById('q-opcao-a').value = '';
  document.getElementById('q-opcao-b').value = '';
  document.getElementById('q-opcao-c').value = '';
  document.getElementById('q-opcao-d').value = '';
  document.getElementById('q-resposta').value = '';
  document.getElementById('q-xp').value = '10';
  document.getElementById('erro-questao').style.display = 'none';
}

function fecharModalQuestao() {
  document.getElementById('modal-questao').classList.remove('active');
}

async function criarQuestao() {
  const pergunta = document.getElementById('q-pergunta').value;
  const opcao_a = document.getElementById('q-opcao-a').value;
  const opcao_b = document.getElementById('q-opcao-b').value;
  const opcao_c = document.getElementById('q-opcao-c').value;
  const opcao_d = document.getElementById('q-opcao-d').value;
  const resposta_select = document.getElementById('q-resposta').value;
  const xp = document.getElementById('q-xp').value;
  const erroDiv = document.getElementById('erro-questao');

  if (!pergunta || !opcao_a || !opcao_b || !opcao_c || !opcao_d || !resposta_select) {
    erroDiv.textContent = 'Preencha todos os campos obrigatórios.';
    erroDiv.style.display = 'block';
    return;
  }

  const mapaRespostas = { 'A': opcao_a, 'B': opcao_b, 'C': opcao_c, 'D': opcao_d };
  const resposta_correta = mapaRespostas[resposta_select];

  try {
    const response = await fetch(`/api/monitor/trilhas/${trilhaAtualId}/quizzes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, xp_recompensa: parseInt(xp) })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    fecharModalQuestao();
    carregarQuestoes(trilhaAtualId);
  } catch (error) {
    erroDiv.textContent = error.message;
    erroDiv.style.display = 'block';
  }
}

function voltarParaTrilhasList() {
  document.getElementById('view-questoes').style.display = 'none';
  document.getElementById('view-trilhas').style.display = 'block';
}
