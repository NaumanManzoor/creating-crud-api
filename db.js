// db.js — the storage layer.
// Opens (and on first run, creates) tasks.db, makes sure the schema exists,
// and seeds three example tasks ONLY when the table is empty.

const Database = require('better-sqlite3');

// Opening a SQLite file that doesn't exist creates it. That's the whole "install".
const db = new Database('tasks.db');

// Create the table only if it isn't already there, so this is safe to run on every start.
// INTEGER PRIMARY KEY makes SQLite hand out the ids for us.
// SQLite has no real boolean type, so `done` is stored as 0 / 1.
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id    INTEGER PRIMARY KEY,
    title TEXT    NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0
  )
`);

// Seed guard: count the rows first, insert only when there are none.
// This is what stops the examples from multiplying on every restart.
const { count } = db.prepare('SELECT COUNT(*) AS count FROM tasks').get();

if (count === 0) {
  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');

  // Wrapping the three inserts in a transaction makes the seed all-or-nothing:
  // if the second insert failed, the first would be rolled back too.
  const seedTasks = db.transaction((tasks) => {
    for (const task of tasks) {
      insert.run(task.title, task.done ? 1 : 0);
    }
  });

  seedTasks([
    { title: 'Buy milk', done: false },
    { title: 'Walk the dog', done: false },
    { title: 'Finish assignment', done: true },
  ]);

  console.log('Database seeded with 3 example tasks');
}

module.exports = db;