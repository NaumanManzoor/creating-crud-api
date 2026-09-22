const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id    SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done  BOOLEAN NOT NULL DEFAULT false
    )
  `);

  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM tasks');
  if (Number(rows[0].count) === 0) {
    await pool.query(
      'INSERT INTO tasks (title, done) VALUES ($1, $2), ($3, $4), ($5, $6)',
      ['Read the assignment', false, 'Run Postgres in Docker', true, 'Swap storage to Postgres', false]
    );
    console.log('Seeded 3 example tasks');
  }
}

async function getAll() {
  const { rows } = await pool.query('SELECT * FROM tasks ORDER BY id');
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return rows[0];
}

async function create(title, done = false) {
  const { rows } = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *',
    [title, done]
  );
  return rows[0];
}

async function update(id, title, done) {
  const { rows } = await pool.query(
    'UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *',
    [title, done, id]
  );
  return rows[0];
}

async function remove(id) {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  return result.rowCount;
}

async function ping() {
  await pool.query('SELECT 1');
}

module.exports = { pool, init, getAll, getById, create, update, remove, ping };