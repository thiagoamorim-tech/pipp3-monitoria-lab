# MonitorIA: Desenvolvimento de uma Plataforma Gamificada para Gestão de Monitorias Acadêmicas

Sistema de acompanhamento e gestão de monitorias acadêmicas com foco em gamificação (trilhas de quiz, XP e engajamento) para retenção estudantil. 

*(Nota: O motor de IA preditiva foi mapeado como trabalho futuro, conforme evolução do projeto).*

## Planejamento

Quadro do projeto no Trello: https://trello.com/b/wP3Npcsq/pipp3-monitoria-lab

## Arquitetura

O projeto usa uma arquitetura serverless baseada na Cloudflare.

- Backend: Cloudflare Workers
- Framework: Hono.js
- Banco de dados: Cloudflare D1
- Frontend: HTML, CSS e JavaScript Vanilla

## Estrutura do projeto

- `src/index.js`: codigo do backend com Hono.js
- `public/index.html`: estrutura da interface do aluno
- `public/style.css`: estilos visuais da plataforma
- `public/app.js`: logica de consumo da API no frontend
- `scripts/db_setup.sql`: script de criacao das tabelas
- `package.json`: dependencias e scripts
- `wrangler.toml`: configuracao do Worker e do D1

## Aplicacao em producao

https://pipp3-monitoria-lab.thiagoamorim.workers.dev

## Como executar

### Pre-requisitos

- Node.js 20 ou superior
- npm
- Wrangler CLI (instalado globalmente com `npm install -g wrangler`)
- Conta na Cloudflare (gratuita)

### Configuracao inicial

1. Clone o repositorio:

   ```bash
   git clone https://github.com/thiagoamorim-tech/pipp3-monitoria-lab.git
   cd pipp3-monitoria-lab
```

2. Instale as dependencias:
   ```bash
   npm install
   ```
3. Autentique na Cloudflare:
   ```bash
   wrangler login
   ```
4. Crie o banco D1:
   ```bash
   npm run d1:create
   ```
   Copie o database_id retornado e cole no arquivo wrangler.toml, sempre entre aspas.
5. Aplique o schema no banco remoto:
   ```bash
   npm run d1:setup:remote
   ```
6. Faca o deploy do Worker:
   ```bash
   npm run deploy
   ```
   O terminal vai mostrar a URL publica da aplicacao.

Observacao sobre execucao local

O comando npm run dev nao funciona em ambientes Android com proot (Termux). O runtime workerd depende do tcmalloc, que exige 48 bits de espaco de enderecamento, e o Android limita a 39 bits.

Por isso, o desenvolvimento e feito direto na Cloudflare:

· Publicar alteracoes no Worker: npm run deploy
· Aplicar mudancas no banco: npm run d1:setup:remote
· Consultar dados: wrangler d1 execute pipp3-monitoria-db --remote --command "SUA QUERY"

Em computadores com Linux, macOS ou Windows, o npm run dev funciona normalmente.

Rotas da API

· GET /: healthcheck simples da API
· GET /api/status: testa a conexao com o banco D1 usando um SELECT 1
· GET /api/quizzes: lista os quizzes cadastrados no banco
· POST /api/responder: recebe a resposta do aluno, salva o progresso e soma o XP
· GET /api/desempenho/:aluno_id: retorna os dados do aluno, media de acertos e o indicador de risco (Verde, Amarelo ou Vermelho)

Proximos passos (Iteracao 2)

· Implementar autenticacao de usuarios (Login)
· Desenvolver o Painel do Monitor (listagem de alunos e acompanhamento)
· Criar sistema de turmas e codigos de acesso
· Refinar a interface (UI/UX)
