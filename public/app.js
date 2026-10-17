const ALUNO_ID = 1;
const API_BASE = '/api';

let quizzesGlobais = [];

// Função para carregar os dados do Dashboard
async function carregarDashboard() {
    try {
        const response = await fetch(`${API_BASE}/desempenho/${ALUNO_ID}`);
        if (!response.ok) throw new Error('Erro ao buscar dados');
        const data = await response.json();

        document.getElementById('aluno-nome').textContent = data.nome;
        document.getElementById('aluno-xp').textContent = data.xp_total;
        document.getElementById('aluno-status').textContent = data.mensagem;
        document.getElementById('stat-total').textContent = data.total_respostas;
        document.getElementById('stat-media').textContent = `${data.media_acertos}%`;

        const dash = document.getElementById('dashboard');
        dash.className = 'dashboard';
        if (data.status === 'VERDE') dash.classList.add('verde');
        if (data.status === 'AMARELO') dash.classList.add('amarelo');
        if (data.status === 'VERMELHO') dash.classList.add('vermelho');

    } catch (error) {
        console.error(error);
        document.getElementById('aluno-nome').textContent = 'Erro ao carregar';
    }
}

// Função para carregar os quizzes
async function carregarQuizzes() {
    try {
        const response = await fetch(`${API_BASE}/quizzes`);
        const data = await response.json();
        quizzesGlobais = data;
        
        const listContainer = document.getElementById('quiz-list');
        listContainer.innerHTML = '';

        data.forEach(quiz => {
            const card = document.createElement('div');
            card.className = 'quiz-card';
            card.innerHTML = `
                <div class="quiz-info">
                    <h4>${quiz.pergunta}</h4>
                    <p>Responder agora</p>
                </div>
                <div class="quiz-xp">+${quiz.xp_recompensa} XP</div>
            `;
            card.onclick = () => abrirQuiz(quiz);
            listContainer.appendChild(card);
        });

    } catch (error) {
        document.getElementById('quiz-list').innerHTML = '<div class="loading">Erro ao carregar quizzes.</div>';
    }
}

// Função para abrir a tela de um quiz específico
function abrirQuiz(quiz) {
    document.getElementById('list-view').style.display = 'none';
    document.getElementById('quiz-view').style.display = 'block';
    document.getElementById('feedback-box').className = 'feedback';
    document.getElementById('feedback-box').textContent = '';

    document.getElementById('question-text').textContent = quiz.pergunta;
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    quiz.opcoes.forEach(opcao => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opcao;
        btn.onclick = () => responderQuiz(quiz.id, opcao, btn);
        optionsContainer.appendChild(btn);
    });
}

// Função para enviar a resposta
async function responderQuiz(quizId, respostaSelecionada, botaoClicado) {
    const botoes = document.querySelectorAll('.option-btn');
    botoes.forEach(btn => btn.disabled = true);

    try {
        const response = await fetch(`${API_BASE}/responder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                aluno_id: ALUNO_ID,
                quiz_id: quizId,
                resposta: respostaSelecionada
            })
        });

        const data = await response.json();
        const feedbackBox = document.getElementById('feedback-box');

        // Tratamento de erro (ex: aluno tentando responder quiz já feito)
        if (!response.ok) {
            feedbackBox.className = 'feedback error';
            feedbackBox.textContent = data.error; 
            return;
        }

        if (data.acertou) {
            botaoClicado.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
            feedbackBox.className = 'feedback success';
            feedbackBox.textContent = `Parabens! ${data.mensagem} Voce ganhou ${data.xp_ganho} XP!`;
        } else {
            botaoClicado.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
            feedbackBox.className = 'feedback error';
            feedbackBox.textContent = `Que pena. ${data.mensagem}`;
        }

        carregarDashboard();

    } catch (error) {
        alert('Erro ao enviar resposta. Tente novamente.');
        botoes.forEach(btn => btn.disabled = false);
    }
}

// Função para voltar da tela do quiz para a lista
function voltarParaLista() {
    document.getElementById('quiz-view').style.display = 'none';
    document.getElementById('list-view').style.display = 'block';
}

// Inicialização
window.onload = () => {
    carregarDashboard();
    carregarQuizzes();
};
