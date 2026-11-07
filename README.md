# MonitorIA: Desenvolvimento de uma Plataforma Gamificada para Gestão de Monitorias Acadêmicas

Sistema de acompanhamento e gestão de monitorias acadêmicas com foco em gamificação, trilhas de estudo, acúmulo de XP e engajamento para retenção estudantil. Projeto desenvolvido para a disciplina de Projeto Integrador e Prática Profissional III (PIPP III) na UEPB.

Nota sobre o escopo: O motor de Inteligência Artificial preditiva foi mapeado como trabalho futuro para a fase de TCC. A versão atual foca na fundação do sistema e na gamificação.

## Planejamento

Quadro do projeto no Trello:
https://trello.com/b/wP3Npcsq/pipp3-monitoria-lab

## Aplicação em Produção

https://pipp3-monitoria-lab.thiagoamorim.workers.dev

## Arquitetura

O projeto usa uma arquitetura serverless baseada na nuvem da Cloudflare.

- Backend: Cloudflare Workers
- Framework: Hono.js
- Banco de dados: Cloudflare D1 (SQLite distribuído na borda)
- Frontend: HTML, CSS e JavaScript Vanilla
- Segurança: Autenticação via Token JWT e senhas criptografadas com hash SHA-256

## Funcionalidades Implementadas (Iterações 1 e 2)

- Autenticação Segura: Cadastro e login de Alunos e Monitores com separação de acessos e rotas protegidas.
- Módulo do Monitor:
  - Criação de turmas com geração de código de acesso único.
  - Painel de acompanhamento de alunos com cálculo de Indicador de Risco baseado em desempenho.
  - Criação de módulos de estudo com definição de data de entrega.
  - Cadastro de questões de múltipla escolha com definição de recompensa em XP.
- Módulo do Aluno:
  - Entrada em turmas através do código gerado pelo monitor.
  - Visualização de módulos e resolução de quizzes.
  - Bloqueio de tentativas duplas e expiração de atividades após a data de entrega.
  - Modo de revisão para visualização da resposta correta após a conclusão.
  - Acompanhamento de progresso e indicador de desempenho em tempo real.

## Estrutura do Projeto

- src/routes: Rotas da API divididas por domínio (auth.js, aluno.js, monitor.js).
- src/middlewares: Middleware de verificação de token (authMiddleware.js).
- src/utils: Funções utilitárias de criptografia (crypto.js).
- public/css: Estilos globais e design system.
- public/js: Lógica de integração do frontend (auth.js, aluno.js, monitor.js).
- public: Arquivos HTML de interface (index.html, aluno.html, monitor.html).
- scripts: Script de criação do banco de dados (db_setup.sql).
- wrangler.toml: Arquivo de configuração do Worker e do banco D1.

## Como Executar Localmente

Observação: Em ambientes Android com Termux e proot-distro, o comando de desenvolvimento local (npm run dev) não funciona devido a limitações do workerd com o tcmalloc. O desenvolvimento deve ser feito diretamente na nuvem.

1. Clone o repositório:
   git clone https://github.com/thiagoamorim-tech/pipp3-monitoria-lab.git
   cd pipp3-monitoria-lab

2. Instale as dependências:
   npm install

3. Autentique na Cloudflare:
   wrangler login

4. Crie o banco D1 (caso ainda não exista):
   npm run d1:create
   Copie o database_id retornado e cole no arquivo wrangler.toml.

5. Aplique o schema no banco:
   npm run d1:setup:remote

6. Faça o deploy:
   npm run deploy

## Rotas da API

Públicas:
- POST /api/auth/cadastro
- POST /api/auth/login

Aluno (Requer Token):
- GET /api/aluno/turmas
- POST /api/aluno/entrar-turma
- GET /api/aluno/turmas/:id/quizzes
- POST /api/aluno/responder
- GET /api/aluno/desempenho

Monitor (Requer Token):
- GET /api/monitor/turmas
- POST /api/monitor/turmas
- GET /api/monitor/turmas/:id/alunos
- GET /api/monitor/turmas/:id/trilhas
- POST /api/monitor/turmas/:id/trilhas
- GET /api/monitor/trilhas/:id/quizzes
- POST /api/monitor/trilhas/:id/quizzes

## Próximos Passos (Iteração 3)

- Implementação de ações de intervenção do monitor como envio de mensagens e agendamento.
- Criação de ranking de alunos por XP.
- Desenvolvimento de loja virtual para troca de XP por recompensas.
