import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { hashPassword } from '../utils/crypto.js';

const auth = new Hono();
// Em produção, isso deve ser uma variável de ambiente secreta
const JWT_SECRET = "monitoria-uepb-tcc-2026-super-secreto";

// Rota de Cadastro
auth.post('/cadastro', async (c) => {
  const body = await c.req.json();
  const { nome, email, senha, tipo } = body;

  if (!nome || !email || !senha || !tipo) {
    return c.json({ error: 'Preencha todos os campos' }, 400);
  }

  try {
    const senhaHash = await hashPassword(senha);
    
    await c.env.DB.prepare(
      'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)'
    ).bind(nome, email, senhaHash, tipo).run();

    return c.json({ message: 'Usuário cadastrado com sucesso!' }, 201);
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return c.json({ error: 'Este e-mail já está em uso.' }, 400);
    }
    return c.json({ error: 'Erro ao cadastrar usuário.' }, 500);
  }
});

// Rota de Login
auth.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, senha } = body;

  const usuario = await c.env.DB.prepare(
    'SELECT id, nome, tipo, senha FROM usuarios WHERE email = ?'
  ).bind(email).first();

  if (!usuario) {
    return c.json({ error: 'E-mail ou senha incorretos.' }, 401);
  }

  const senhaHash = await hashPassword(senha);
  if (senhaHash !== usuario.senha) {
    return c.json({ error: 'E-mail ou senha incorretos.' }, 401);
  }

  // Cria o token com validade de 24 horas
  const payload = {
    id: usuario.id,
    nome: usuario.nome,
    tipo: usuario.tipo,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) 
  };
  
  const token = await sign(payload, JWT_SECRET,'HS256');

  return c.json({ 
    message: 'Login realizado!', 
    token, 
    usuario: { id: usuario.id, nome: usuario.nome, tipo: usuario.tipo } 
  });
});

export default auth;
