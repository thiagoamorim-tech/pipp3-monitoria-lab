-- Limpa as tabelas se elas já existirem
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
