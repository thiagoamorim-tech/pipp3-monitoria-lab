
DROP TABLE IF EXISTS progresso_aluno;
DROP TABLE IF EXISTS quizzes;
DROP TABLE IF EXISTS usuarios;

-- Tabela de Usuários (Alunos)
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  tipo TEXT CHECK(tipo IN ('ALUNO', 'MONITOR', 'PROFESSOR')) NOT NULL,
  xp_total INTEGER DEFAULT 0,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Quizzes
CREATE TABLE quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pergunta TEXT NOT NULL,
  opcoes TEXT NOT NULL, -- Vamos salvar um JSON com as alternativas aqui
  resposta_correta TEXT NOT NULL,
  xp_recompensa INTEGER DEFAULT 10
);

-- Tabela de Progresso do Aluno
CREATE TABLE progresso_aluno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id INTEGER REFERENCES usuarios(id),
  quiz_id INTEGER REFERENCES quizzes(id),
  acertou BOOLEAN,
  data_resposta DATETIME DEFAULT CURRENT_TIMESTAMP
);
