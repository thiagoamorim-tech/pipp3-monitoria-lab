const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');
if (!token || !usuarioStr) { window.location.replace('/'); }

let usuario = {};
try { usuario = JSON.parse(usuarioStr); } catch (e) { window.location.replace('/'); }

let turmaAtual = null;
let trilhaAtual = null;

function logout() {
  localStorage.removeItem('token'); localStorage.removeItem('usuario'); window.location.replace('/'); 
}

const getHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });

document.addEventListener('DOMContentLoaded', () => {
  const navUser = document.getElementById('nav-username');
  if (navUser && usuario.nome) navUser.textContent = usuario.nome;

  const btnLogout = document.querySelector('.btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', logout);

  carregarDashboard();
  carregarTurmasAluno();
});

// --- DASHBOARD ---
async function carregarDashboard() {
  try {
    const response = await fetch('/api/aluno/desempenho', { headers: getHeaders() });
    if (response.status === 401) return logout(); 
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    document.getElementById('xp-total').textContent = data.xp_total;
    document.getElementById('status-message').textContent = data.mensagem;
    document.getElementById('stat-total').textContent = data.total_respostas;
    document.getElementById('stat-media').textContent = `${data.media_acertos}%`;

    const card = document.getElementById('performance-card');
    card.className = 'performance-card';
    if (data.status === 'VERDE') card.classList.add('status-verde');
    if (data.status === 'AMARELO') card.classList.add('status-amarelo');
    if (data.status === 'VERMELHO') card.classList.add('status-vermelho');
  } catch (error) { console.error(error); }
}

// --- TURMAS ---
async function carregarTurmasAluno() {
  try {
    const response = await fetch('/api/aluno/turmas', { headers: getHeaders() });
    const turmas = await response.json();
    const container = document.getElementById('turmas-aluno-list');
    container.innerHTML = '';

    if (turmas.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">Você não está matriculado em nenhuma turma.</p>';
      return;
    }

    turmas.forEach(turma => {
      const item = document.createElement('div');
      item.className = 'quiz-item';
      item.innerHTML = `
        <div class="quiz-info">
          <h4>${turma.nome}</h4>
          <p>Código: ${turma.codigo_acesso}</p>
        </div>
        <div class="quiz-reward" style="background: transparent; color: var(--primary); padding: 0;">Acessar</div>
      `;
      item.onclick = () => abrirTurma(turma);
      container.appendChild(item);
    });
  } catch (error) { console.error(error); }
}

function abrirTurma(turma) {
  turmaAtual = turma;
  document.getElementById('view-turmas-aluno').style.display = 'none';
  document.getElementById('view-modulos').style.display = 'block';
  document.getElementById('trilha-view').style.display = 'none';
  document.getElementById('quiz-view').style.display = 'none';
  
  document.getElementById('titulo-turma-atual').textContent = `Módulos: ${turma.nome}`;
  carregarModulos(turma.id);
}

async function carregarModulos(turmaId) {
  try {
    const response = await fetch(`/api/aluno/turmas/${turmaId}/quizzes`, { headers: getHeaders() });
    const data = await response.json();
    const container = document.getElementById('modulos-list');
    container.innerHTML = '';

    if (data.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">O monitor ainda não criou módulos para esta turma.</p>';
      return;
    }

    data.forEach(trilha => {
      const total = trilha.quizzes.length;
      const respondidas = trilha.quizzes.filter(q => q.ja_respondeu).length;
      const concluida = total > 0 && total === respondidas;

      const item = document.createElement('div');
      item.className = 'quiz-item';
      if (concluida) item.style.borderLeft = '4px solid var(--success)';

      item.innerHTML = `
        <div class="quiz-info">
          <h4>${trilha.titulo} ${concluida ? '(Concluído)' : ''}</h4>
          <p>${respondidas} de ${total} atividades concluídas</p>
        </div>
        <div class="quiz-reward" style="background: transparent; color: var(--primary); padding: 0;">Acessar</div>
      `;
      item.onclick = () => abrirTrilha(trilha);
      container.appendChild(item);
    });
  } catch (error) { console.error(error); }
}

function voltarParaTurmasAluno() {
  document.getElementById('view-modulos').style.display = 'none';
  document.getElementById('view-turmas-aluno').style.display = 'block';
}

// --- MÓDULOS E QUIZZES ---
function abrirTrilha(trilha) {
  trilhaAtual = trilha;
  document.getElementById('view-modulos').style.display = 'none';
  document.getElementById('trilha-view').style.display = 'block';
  document.getElementById('quiz-view').style.display = 'none';
  
  document.getElementById('trilha-title-text').textContent = trilha.titulo;
  
  let dataStr = "Sem prazo";
  if (trilha.data_entrega) {
    const d = new Date(trilha.data_entrega);
    dataStr = `Prazo: ${d.toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`;
  }
  document.getElementById('trilha-desc-text').textContent = `${trilha.descricao || ''} • ${dataStr}`;

  renderizarQuizzesDaTrilha(trilha);
}

function renderizarQuizzesDaTrilha(trilha) {
  const container = document.getElementById('trilha-quizzes-container');
  container.innerHTML = '';

  if (trilha.quizzes.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">O monitor ainda não adicionou questões a este módulo.</p>';
      return;
  }

  let moduloExpirado = false;
  if (trilha.data_entrega) {
      const dataLimite = new Date(trilha.data_entrega);
      dataLimite.setHours(23, 59, 59, 999);
      if (new Date() > dataLimite) moduloExpirado = true;
  }

  trilha.quizzes.forEach((quiz, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    
    let statusIcon = '';
    if (quiz.ja_respondeu) {
      statusIcon = `<span style="color: ${quiz.aluno_acertou ? 'var(--success)' : 'var(--danger)'}; font-weight: bold; font-size: 0.8rem;">${quiz.aluno_acertou ? 'ACERTOU' : 'ERROU'}</span>`;
    } else if (moduloExpirado) {
      statusIcon = `<span style="color: var(--danger); font-weight: bold; font-size: 0.8rem;">EXPIRADO</span>`;
    } else {
      statusIcon = `<span style="color: var(--text-muted); font-size: 0.8rem;">PENDENTE</span>`;
    }

    btn.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <span style="font-weight: 500;">${index + 1}. ${quiz.pergunta}</span>
        ${statusIcon}
      </div>
    `;
    btn.onclick = () => abrirQuiz(quiz);
    container.appendChild(btn);
  });
}

function abrirQuiz(quiz) {
  document.getElementById('trilha-view').style.display = 'none';
  document.getElementById('quiz-view').style.display = 'block';
  document.getElementById('feedback-box').className = 'feedback-alert';
  document.getElementById('feedback-box').textContent = '';
  
  document.getElementById('question-text').textContent = quiz.pergunta;
  const optionsContainer = document.getElementById('options-container');
  optionsContainer.innerHTML = '';

  quiz.opcoes.forEach(opcao => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opcao;
    
    if (quiz.ja_respondeu) {
      btn.disabled = true;
      btn.style.cursor = 'not-allowed';
      if (opcao === quiz.resposta_correta) {
        btn.style.borderColor = 'var(--success)';
        btn.style.backgroundColor = '#ECFDF5';
        btn.style.fontWeight = 'bold';
      }
    } else {
      btn.onclick = () => enviarResposta(quiz, opcao, btn);
    }
    optionsContainer.appendChild(btn);
  });
}

async function enviarResposta(quiz, resposta, botaoClicado) {
  const botoes = document.querySelectorAll('.option-btn');
  botoes.forEach(btn => btn.disabled = true);

  try {
    const response = await fetch('/api/aluno/responder', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ quiz_id: quiz.id, resposta: resposta })
    });

    const data = await response.json();
    const feedbackBox = document.getElementById('feedback-box');

    if (!response.ok) {
      feedbackBox.className = 'feedback-alert error';
      feedbackBox.textContent = data.error;
      return;
    }

    if (data.acertou) {
      botaoClicado.style.borderColor = 'var(--success)';
      botaoClicado.style.backgroundColor = '#ECFDF5';
      feedbackBox.className = 'feedback-alert success';
      feedbackBox.textContent = `${data.mensagem} Você ganhou ${data.xp_ganho} XP.`;
    } else {
      botaoClicado.style.borderColor = 'var(--danger)';
      botaoClicado.style.backgroundColor = '#FEF2F2';
      botoes.forEach(b => {
        if (b.textContent === quiz.resposta_correta) {
          b.style.borderColor = 'var(--success)';
          b.style.backgroundColor = '#ECFDF5';
        }
      });
      feedbackBox.className = 'feedback-alert error';
      feedbackBox.textContent = `${data.mensagem}`;
    }

    carregarDashboard();
    quiz.ja_respondeu = true;
    quiz.aluno_acertou = data.acertou;
    
    const todasRespondidas = trilhaAtual.quizzes.every(q => q.ja_respondeu || q.id === quiz.id);
    if (todasRespondidas) {
      setTimeout(() => exibirModalConclusao(trilhaAtual), 1500);
    }
  } catch (error) { console.error(error); }
}

// --- MODAL DE CONCLUSÃO ---
function exibirModalConclusao(trilha) {
  const acertos = trilha.quizzes.filter(q => q.aluno_acertou).length;
  const pct = (acertos / trilha.quizzes.length) * 100;
  const modal = document.getElementById('modal-conclusao');
  const icon = document.getElementById('modal-icon');
  const title = document.getElementById('modal-title');
  const desc = document.getElementById('modal-desc');

  if (pct >= 70) {
    icon.className = 'modal-icon verde'; icon.innerHTML = '✓'; title.textContent = 'Excelente!'; desc.textContent = `Módulo concluído com ${pct.toFixed(0)}% de aproveitamento.`;
  } else if (pct >= 50) {
    icon.className = 'modal-icon amarelo'; icon.textContent = '!'; title.textContent = 'Módulo Concluído'; desc.textContent = `Aproveitamento de ${pct.toFixed(0)}%. Fique de olho nos conteúdos.`;
  } else {
    icon.className = 'modal-icon vermelho'; icon.textContent = 'X'; title.textContent = 'Atenção'; desc.textContent = `Aproveitamento de ${pct.toFixed(0)}%. Recomendamos revisar a matéria.`;
  }
  modal.classList.add('active');
}

function fecharModalConclusao() {
  document.getElementById('modal-conclusao').classList.remove('active');
  voltarParaModulos();
}

// --- NAVEGAÇÃO ---
function voltarParaTrilha() {
  document.getElementById('quiz-view').style.display = 'none';
  document.getElementById('trilha-view').style.display = 'block';
  renderizarQuizzesDaTrilha(trilhaAtual);
}

function voltarParaModulos() {
  document.getElementById('trilha-view').style.display = 'none';
  document.getElementById('quiz-view').style.display = 'none';
  document.getElementById('view-modulos').style.display = 'block';
  if (turmaAtual) carregarModulos(turmaAtual.id); // Recarrega para atualizar o status
}

// --- ENTRAR EM TURMA ---
function abrirModalTurma() {
  document.getElementById('modal-turma-aluno').classList.add('active');
  document.getElementById('codigo-turma').value = '';
  document.getElementById('erro-turma-aluno').style.display = 'none';
}

function fecharModalTurma() { document.getElementById('modal-turma-aluno').classList.remove('active'); }

async function entrarTurma() {
  const codigo = document.getElementById('codigo-turma').value;
  const erroDiv = document.getElementById('erro-turma-aluno');

  if (!codigo) { erroDiv.textContent = 'Digite o código.'; erroDiv.style.display = 'block'; return; }

  try {
    const response = await fetch('/api/aluno/entrar-turma', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ codigo_acesso: codigo })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Erro ao entrar na turma');
    alert(data.message);
    fecharModalTurma();
    carregarTurmasAluno(); // Recarrega a lista de turmas na tela inicial
  } catch (error) {
    erroDiv.textContent = error.message;
    erroDiv.style.display = 'block';
  }
}
