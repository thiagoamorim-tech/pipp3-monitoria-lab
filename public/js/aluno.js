const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');

if (!token || !usuarioStr) { window.location.replace('/'); }

let usuario = {};
try { usuario = JSON.parse(usuarioStr); } catch (e) { window.location.replace('/'); }

let turmaAtual = null;
let trilhaAtual = null;
let estiloAtual = 'bottts';

const estilosDisponiveis = [
  { id: 'bottts', label: 'Robô' },
  { id: 'adventurer', label: 'Aventureiro' },
  { id: 'avataaars', label: 'Cartoon' },
  { id: 'pixel-art', label: 'Pixel' }
];

function logout() {
  localStorage.removeItem('token'); localStorage.removeItem('usuario'); window.location.replace('/'); 
}

const getHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });

document.addEventListener('DOMContentLoaded', () => {
  const navUser = document.getElementById('nav-username');
  if (navUser && usuario.nome) navUser.textContent = usuario.nome;

  const btnLogout = document.querySelector('.btn-logout');
  if (btnLogout) btnLogout.addEventListener('click', logout);

  atualizarImagemAvatar(estiloAtual);
  renderizarSeletorAvatar();

  carregarDashboard();
  carregarTurmasAluno();
  carregarIntervencoes();
});

// --- INTERFACE DE ABAS ---
function mudarAba(aba) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('aba-modulos').style.display = 'none';
  document.getElementById('aba-ranking').style.display = 'none';
  document.getElementById('aba-loja').style.display = 'none';

  if (aba === 'modulos') {
    document.querySelector('.tab:nth-child(1)').classList.add('active');
    document.getElementById('aba-modulos').style.display = 'block';
  } else if (aba === 'ranking') {
    document.querySelector('.tab:nth-child(2)').classList.add('active');
    document.getElementById('aba-ranking').style.display = 'block';
  } else if (aba === 'loja') {
    document.querySelector('.tab:nth-child(3)').classList.add('active');
    document.getElementById('aba-loja').style.display = 'block';
  }
}

// --- AVATARES (DICEBEAR) ---
function renderizarSeletorAvatar() {
  const container = document.getElementById('avatar-selector');
  container.innerHTML = '';
  estilosDisponiveis.forEach(estilo => {
    const div = document.createElement('div');
    div.className = `avatar-option ${estiloAtual === estilo.id ? 'selected' : ''}`;
    div.title = estilo.label;
    div.textContent = estilo.label.substring(0, 3).toUpperCase();
    div.onclick = () => trocarAvatar(estilo.id);
    container.appendChild(div);
  });
}

function atualizarImagemAvatar(estilo) {
  const img = document.getElementById('profile-avatar');
  const seed = encodeURIComponent(usuario.nome || 'aluno');
  img.src = `https://api.dicebear.com/7.x/${estilo}/svg?seed=${seed}`;
}

async function trocarAvatar(novoEstilo) {
  estiloAtual = novoEstilo;
  atualizarImagemAvatar(estiloAtual);
  renderizarSeletorAvatar();

  try {
    await fetch('/api/aluno/perfil/avatar', {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify({ avatar_estilo: novoEstilo })
    });
  } catch (error) { console.error('Erro ao salvar avatar', error); }
}

// --- DASHBOARD ---
async function carregarDashboard() {
  try {
    const response = await fetch('/api/aluno/desempenho', { headers: getHeaders() });
    if (response.status === 401) return logout(); 
    const data = await response.json();
    
    if (!response.ok) {
      console.error("Erro na API de desempenho:", data.error);
      document.getElementById('status-message').textContent = 'Erro ao carregar progresso.';
      return;
    }

    document.getElementById('xp-total').textContent = data.xp_total || 0;
    document.getElementById('nav-moedas').textContent = `${data.moedas || 0} Moedas`;
    document.getElementById('status-message').textContent = data.mensagem;
    document.getElementById('stat-total').textContent = data.total_respostas;
    document.getElementById('stat-media').textContent = `${data.media_acertos}%`;

    if (data.avatar_estilo) {
      estiloAtual = data.avatar_estilo;
      atualizarImagemAvatar(estiloAtual);
      renderizarSeletorAvatar();
    }

    const card = document.getElementById('performance-card');
    card.className = 'performance-card';
    if (data.status === 'VERDE') card.classList.add('status-verde');
    if (data.status === 'AMARELO') card.classList.add('status-amarelo');
    if (data.status === 'VERMELHO') card.classList.add('status-vermelho');
  } catch (error) { console.error(error); }
}

// --- INTERVENÇÕES ---
async function carregarIntervencoes() {
  try {
    const response = await fetch('/api/aluno/intervencoes', { headers: getHeaders() });
    const intervencoes = await response.json();
    const container = document.getElementById('avisos-monitor');
    
    if (!intervencoes || intervencoes.length === 0) { container.style.display = 'none'; return; }

    const int = intervencoes[0];
    const div = document.createElement('div');
    const corFundo = int.tipo === 'AGENDAMENTO' ? '#EFF6FF' : '#F0FDF4';
    const corBorda = int.tipo === 'AGENDAMENTO' ? '#3B82F6' : '#22C55E';
    
    let conteudo = `<strong>${int.monitor_nome}:</strong> `;
    if (int.tipo === 'MENSAGEM') {
      conteudo += int.mensagem;
    } else {
      const dataFormatada = new Date(int.data_agendamento).toLocaleString('pt-BR');
      let linkFormatado = int.link_reuniao;
      if (linkFormatado && !linkFormatado.startsWith('http')) linkFormatado = 'https://' + linkFormatado;
      conteudo += `Agendou uma monitoria para ${dataFormatada}. <a href="${linkFormatado}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-weight: bold; text-decoration: underline;">Entrar na Reunião</a>`;
    }

    div.style.background = corFundo; div.style.borderLeft = `4px solid ${corBorda}`;
    div.style.padding = '15px'; div.style.borderRadius = '8px'; div.style.color = 'var(--text-main)'; div.style.fontSize = '0.95rem';
    div.innerHTML = conteudo;
    container.innerHTML = ''; container.appendChild(div); container.style.display = 'flex';
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
  document.getElementById('menu-tabs').style.display = 'flex';
  
  document.getElementById('titulo-turma-atual').textContent = `Módulos: ${turma.nome}`;
  mudarAba('modulos'); // Reseta para a aba de módulos ao entrar
  
  carregarModulos(turma.id);
  carregarRanking(turma.id);
  carregarLojaAluno(turma.id);
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
  document.getElementById('trilha-view').style.display = 'none';
  document.getElementById('quiz-view').style.display = 'none';
  document.getElementById('view-turmas-aluno').style.display = 'block';
  document.getElementById('menu-tabs').style.display = 'none';
  turmaAtual = null;
}

// --- RANKING ---
async function carregarRanking(turmaId) {
  try {
    const response = await fetch(`/api/aluno/turmas/${turmaId}/ranking`, { headers: getHeaders() });
    const ranking = await response.json();
    const container = document.getElementById('ranking-list');
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
      
      const isMe = aluno.nome === usuario.nome;
      if (isMe) div.style.border = '2px solid var(--primary)';

      div.innerHTML = `
        <div class="ranking-pos">#${pos}</div>
        <img src="${avatarUrl}" class="ranking-avatar" alt="Avatar">
        <div class="ranking-name">${aluno.nome} ${isMe ? '(Você)' : ''}</div>
        <div class="ranking-xp">${aluno.xp_total} XP</div>
      `;
      container.appendChild(div);
    });
  } catch (error) { console.error(error); }
}

// --- LOJA DO ALUNO ---
async function carregarLojaAluno(turmaId) {
  try {
    const response = await fetch(`/api/aluno/turmas/${turmaId}/recompensas`, { headers: getHeaders() });
    const recompensas = await response.json();
    const container = document.getElementById('loja-aluno-list');
    container.innerHTML = '';

    if (!Array.isArray(recompensas) || recompensas.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted);">O monitor ainda não cadastrou prêmios para esta turma.</p>';
      return;
    }

    recompensas.forEach(rec => {
      const comprado = rec.inventario_id !== null;
      const div = document.createElement('div');
      div.className = 'quiz-item';
      if (comprado) div.style.opacity = '0.6';

      div.innerHTML = `
        <div class="quiz-info">
          <h4>${rec.nome}</h4>
          <p>${rec.descricao || 'Sem descrição'}</p>
        </div>
        <div style="text-align: right;">
          <div class="quiz-reward" style="color: var(--warning); background: transparent; padding: 0; margin-bottom: 8px;">${rec.custo_moedas} Moedas</div>
          ${comprado 
            ? '<span style="font-size: 0.75rem; color: var(--success); font-weight: bold;">RESGATADO</span>' 
            : `<button class="btn btn-primary" style="padding: 4px 12px; font-size: 0.8rem; width: auto;" onclick="comprarRecompensa(${rec.id})">Resgatar</button>`}
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) { console.error(error); }
}

async function comprarRecompensa(recompensaId) {
  if (!confirm('Deseja resgatar esta recompensa?')) return;

  try {
    const response = await fetch(`/api/aluno/recompensas/${recompensaId}/comprar`, {
      method: 'POST', headers: getHeaders()
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    alert(data.message);
    carregarDashboard(); // Atualiza o saldo de moedas no topo
    if (turmaAtual) carregarLojaAluno(turmaAtual.id); // Atualiza a lista da loja
  } catch (error) {
    alert(error.message);
  }
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
    if (turmaAtual) {
      carregarRanking(turmaAtual.id);
      carregarLojaAluno(turmaAtual.id);
    }
    
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
  if (turmaAtual) carregarModulos(turmaAtual.id); 
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
    carregarTurmasAluno(); 
  } catch (error) {
    erroDiv.textContent = error.message;
    erroDiv.style.display = 'block';
  }
}
