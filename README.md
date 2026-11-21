# MonitorIA: Desenvolvimento de uma Plataforma Gamificada para Gestão de Monitorias Acadêmicas

Sistema de acompanhamento e gestão de monitorias acadêmicas com foco em gamificação, análise de dados e engajamento estudantil. Projeto desenvolvido para a disciplina de Projeto Integrador e Prática Profissional III (PIPP III) na UEPB.

Nota sobre o escopo: O motor de Inteligência Artificial preditiva foi mapeado como trabalho futuro para a fase de TCC. A versão atual foca na fundação do sistema, gamificação e análise de dados básica (Learning Analytics).

## Planejamento
Quadro do projeto no Trello:
https://trello.com/b/wP3Npcsq/pipp3-monitoria-lab

## Aplicação em Produção
https://pipp3-monitoria-lab.thiagoamorim.workers.dev

## Arquitetura
O projeto usa uma arquitetura serverless baseada na nuvem da Cloudflare.
- **Backend:** Cloudflare Workers
- **Framework:** Hono.js
- **Banco de dados:** Cloudflare D1 (SQLite distribuído na borda)
- **Frontend:** HTML, CSS e JavaScript Vanilla
- **Gráficos:** Chart.js
- **Avatares:** API DiceBear
- **Segurança:** Autenticação via Token JWT e senhas criptografadas com hash SHA-256

## Funcionalidades Implementadas (Iterações 1, 2 e 3)

### Módulo Geral e Segurança
- Cadastro e login com separação de acessos (Aluno e Monitor).
- Proteção de rotas da API usando Tokens JWT.

### Módulo do Monitor
- Criação de turmas com geração de código de acesso.
- Cadastro de Módulos (Trilhas) com data de entrega.
- Criação de Questões de múltipla escolha com definição de XP.
- Dashboard analítico com gráficos de saúde da turma (Chart.js).
- Painel de acompanhamento com cálculo de Indicador de Risco.
- Sistema de intervenção pedagógica (envio de mensagens e agendamento de monitorias).
- Ranking de alunos com base no XP acumulado.
- Gerenciamento da Loja de Recompensas da turma.

### Módulo do Aluno
- Entrada em turmas via código de acesso.
- Trilhas de estudo gamificadas com resolução de quizzes e bloqueio de tentativas duplas.
- Bloqueio automático de atividades após a data de entrega do módulo.
- Perfil gamificado com geração de avatares exclusivos (DiceBear).
- Acúmulo de XP e Moedas Virtuais.
- Ranking da turma e Loja de Recompensas (resgate de prêmios).
- Notificações e avisos de intervenções enviadas pelo monitor.

## Estrutura do Projeto
- `src/routes`: Rotas da API separadas por domínio (`auth.js`, `aluno.js`, `monitor.js`).
- `src/middlewares`: Middleware de verificação de segurança (`authMiddleware.js`).
- `src/utils`: Funções utilitárias de criptografia (`crypto.js`).
- `public/css`: Estilos globais e design system.
- `public/js`: Lógica do frontend separada por contexto.
- `public`: Arquivos HTML de interface (`index.html`, `aluno.html`, `monitor.html`).
- `scripts/db_setup.sql`: Script de criação e povoamento das tabelas do D1.

## Como Executar Localmente
Observação: Em ambientes Android com Termux e proot-distro, o comando `npm run dev` pode não funcionar devido a limitações de arquitetura do `workerd`. O desenvolvimento e testes podem ser feitos diretamente na nuvem.

1. Clone o repositório:
   `git clone https://github.com/thiagoamorim-tech/pipp3-monitoria-lab.git`

2. Instale as dependências:
   `npm install`

3. Autentique na Cloudflare:
   `wrangler login`

4. Crie o banco D1 e aplique o schema:
   `npm run d1:create`
   `npm run d1:setup:remote`

5. Faça o deploy:
   `npm run deploy`

## Rotas da API

### Autenticação (Públicas)
- `POST /api/auth/cadastro`
- `POST /api/auth/login`

### Aluno (Requer Token)
- `GET /api/aluno/turmas`
- `POST /api/aluno/entrar-turma`
- `GET /api/aluno/turmas/:turma_id/quizzes`
- `POST /api/aluno/responder`
- `GET /api/aluno/desempenho`
- `PUT /api/aluno/perfil/avatar`
- `GET /api/aluno/intervencoes`
- `GET /api/aluno/turmas/:id/ranking`
- `GET /api/aluno/turmas/:id/recompensas`
- `POST /api/aluno/recompensas/:id/comprar`

### Monitor (Requer Token)
- `GET /api/monitor/turmas`
- `POST /api/monitor/turmas`
- `GET /api/monitor/turmas/:id/alunos`
- `GET /api/monitor/turmas/:id/trilhas`
- `POST /api/monitor/turmas/:id/trilhas`
- `GET /api/monitor/trilhas/:trilha_id/quizzes`
- `POST /api/monitor/trilhas/:trilha_id/quizzes`
- `POST /api/monitor/intervencoes`
- `GET /api/monitor/turmas/:id/ranking`
- `GET /api/monitor/turmas/:id/recompensas`
- `POST /api/monitor/turmas/:id/recompensas`
