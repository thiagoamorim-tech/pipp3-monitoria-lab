import { verify } from 'hono/jwt';

export const authMiddleware = async (c, next) => {
  // Pega o cabeçalho Authorization da requisição
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Acesso negado. Token não fornecido.' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const JWT_SECRET = "monitoria-uepb-tcc-2026-super-secreto"; // Mesma chave do auth.js

  try {
    // Verifica se o token é válido e não expirou
    const payload = await verify(token, JWT_SECRET,'HS256');
    
    // Salva os dados do usuário no contexto da requisição
    c.set('jwtPayload', payload); 
    
    // Deixa a requisição continuar para a rota final
    await next();
} catch (error) {
  console.log("Erro ao verificar token:", error.message);
  return c.json({ error: 'Sessão expirada.', detalhe: error.message }, 401);
}

};
