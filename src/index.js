import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth.js';
import alunoRoutes from './routes/aluno.js';
import monitorRoutes from './routes/monitor.js';
import { authMiddleware } from './middlewares/authMiddleware.js';

const app = new Hono();

app.use('/api/*', cors());

app.get('/', (c) => c.text('MonitorIA API esta no ar!'));
app.get('/api/status', (c) => c.json({ ok: true, message: 'API funcionando.' }));

// Rotas Públicas
app.route('/api/auth', authRoutes);

// Rotas Protegidas do Aluno
app.use('/api/aluno/*', authMiddleware); 
app.route('/api/aluno', alunoRoutes);

// Rotas Protegidas do Monitor
app.use('/api/monitor/*', authMiddleware); 
app.route('/api/monitor', monitorRoutes);

export default app;
