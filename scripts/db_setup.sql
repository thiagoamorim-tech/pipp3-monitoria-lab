-- Limpa as tabelas se elas já existirem
DROP TABLE IF EXISTS inventario;
DROP TABLE IF EXISTS recompensas;
DROP TABLE IF EXISTS intervencoes;
DROP TABLE IF EXISTS progresso_aluno;
DROP TABLE IF EXISTS quizzes;
DROP TABLE IF EXISTS trilhas;
DROP TABLE IF EXISTS aluno_turmas;
DROP TABLE IF EXISTS turmas;
DROP TABLE IF EXISTS usuarios;

-- Tabela de Usuários
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  tipo TEXT CHECK(tipo IN ('ALUNO', 'MONITOR', 'PROFESSOR')) NOT NULL,
  xp_total INTEGER DEFAULT 0,
  moedas INTEGER DEFAULT 0,
  avatar_estilo TEXT DEFAULT 'bottts',
  avatares_desbloqueados TEXT DEFAULT 'bottts',
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Turmas
CREATE TABLE turmas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  codigo_acesso TEXT UNIQUE NOT NULL,
  monitor_id INTEGER REFERENCES usuarios(id)
);

-- Vínculo N:N entre Alunos e Turmas
CREATE TABLE aluno_turmas (
  aluno_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  turma_id INTEGER REFERENCES turmas(id) ON DELETE CASCADE,
  PRIMARY KEY (aluno_id, turma_id)
);

-- Tabela de Trilhas (Módulos)
CREATE TABLE trilhas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  monitor_id INTEGER REFERENCES usuarios(id),
  turma_id INTEGER REFERENCES turmas(id),
  data_entrega DATETIME
);

-- Tabela de Quizzes (Questões)
CREATE TABLE quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pergunta TEXT NOT NULL,
  opcoes TEXT NOT NULL,
  resposta_correta TEXT NOT NULL,
  xp_recompensa INTEGER DEFAULT 10,
  trilha_id INTEGER REFERENCES trilhas(id),
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Progresso do Aluno
CREATE TABLE progresso_aluno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id INTEGER REFERENCES usuarios(id),
  quiz_id INTEGER REFERENCES quizzes(id),
  acertou BOOLEAN,
  data_resposta DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Intervenções (Mensagens e Agendamentos)
CREATE TABLE intervencoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id INTEGER REFERENCES usuarios(id),
  monitor_id INTEGER REFERENCES usuarios(id),
  tipo TEXT CHECK(tipo IN ('MENSAGEM', 'AGENDAMENTO')) NOT NULL,
  mensagem TEXT,
  data_agendamento DATETIME,
  link_reuniao TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Recompensas (Loja)
CREATE TABLE recompensas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turma_id INTEGER REFERENCES turmas(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  custo_moedas INTEGER NOT NULL
);

-- Tabela de Inventário (Compras dos alunos)
CREATE TABLE inventario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id INTEGER REFERENCES usuarios(id),
  recompensa_id INTEGER REFERENCES recompensas(id),
  data_compra DATETIME DEFAULT CURRENT_TIMESTAMP
);
