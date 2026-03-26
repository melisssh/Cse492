-- AI soruları için question_id NULL olabilmeli.
-- Önce yedek:  cp test.db test.db.bak
--
-- Eğer "no such column: question_text" hatası alırsan, INSERT satırını şununla değiştir:
-- INSERT INTO interview_questions_new (id, interview_id, question_id, question_text, "order")
-- SELECT id, interview_id, question_id, NULL, "order" FROM interview_questions;

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE interview_questions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interview_id INTEGER NOT NULL,
    question_id INTEGER,
    question_text TEXT,
    "order" INTEGER NOT NULL,
    FOREIGN KEY (interview_id) REFERENCES interviews(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

INSERT INTO interview_questions_new (id, interview_id, question_id, question_text, "order")
SELECT id, interview_id, question_id, question_text, "order" FROM interview_questions;

DROP TABLE interview_questions;
ALTER TABLE interview_questions_new RENAME TO interview_questions;

COMMIT;
PRAGMA foreign_keys=ON;
