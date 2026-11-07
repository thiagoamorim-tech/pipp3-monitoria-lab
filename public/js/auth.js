const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toggleBtn = document.getElementById('toggle-btn');
const toggleText = document.getElementById('toggle-text');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const errorMsg = document.getElementById('error-message');

// Lógica para alternar entre Login e Cadastro
let isLogin = true;
toggleBtn.addEventListener('click', () => {
  isLogin = !isLogin;
  errorMsg.style.display = 'none';
  
  if (isLogin) {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    formTitle.textContent = 'Acesse sua conta';
    formSubtitle.textContent = 'Bem-vindo ao MonitorIA';
    toggleText.textContent = 'Ainda não tem conta?';
    toggleBtn.textContent = 'Cadastre-se';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    formTitle.textContent = 'Crie sua conta';
    formSubtitle.textContent = 'Junte-se à plataforma';
    toggleText.textContent = 'Já tem uma conta?';
    toggleBtn.textContent = 'Faça login';
  }
});

// Função para lidar com o Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    // Salva o token no navegador
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));

    // Redireciona baseado no tipo de usuário
    if (data.usuario.tipo === 'MONITOR') {
      window.location.href = '/monitor.html';
    } else {
      window.location.href = '/aluno.html';
    }
  } catch (error) {
    errorMsg.textContent = error.message;
    errorMsg.style.display = 'block';
  }
});

// Função para lidar com o Cadastro
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('reg-nome').value;
  const email = document.getElementById('reg-email').value;
  const senha = document.getElementById('reg-senha').value;
  const tipo = document.getElementById('reg-tipo').value;

  try {
    const response = await fetch('/api/auth/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, tipo })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    alert('Conta criada com sucesso! Faça login para continuar.');
    toggleBtn.click(); // Volta para a tela de login
  } catch (error) {
    errorMsg.textContent = error.message;
    errorMsg.style.display = 'block';
  }
});
