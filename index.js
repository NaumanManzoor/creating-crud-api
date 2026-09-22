const express = require('express');
const app = express();
app.use(express.json());
const db = require('./db');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi.json');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));


app.get('/', (req, res) => {
  res.json({
    name: 'Task API',
    version: '1.0',
    endpoints: ['/tasks']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// SQLite stores booleans as 0/1 — convert back so the API's JSON shape is unchanged.
function toTask(row) {
  return { id: row.id, title: row.title, done: row.done === 1 };
}

app.get('/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks').all();
  res.json(rows.map(toTask));
});

app.get('/tasks/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(req.params.id));
  if (!row) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.json(toTask(row));
});

app.post('/tasks', (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' });
  }

  const result = db
    .prepare('INSERT INTO tasks (title, done) VALUES (?, ?)')
    .run(title, 0);

  res.status(201).json({ id: result.lastInsertRowid, title, done: false });
});

app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  const { title, done } = req.body;
  if (title !== undefined && title.trim() === '') {
    return res.status(400).json({ error: 'title cannot be empty' });
  }

  // Fall back to the row's current values so a partial update never blanks a column.
  const newTitle = title !== undefined ? title : row.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : row.done;

  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(newTitle, newDone, id);

  res.json({ id, title: newTitle, done: newDone === 1 });
});

app.delete('/tasks/:id', (req, res) => {
  // .run() reports how many rows it touched — 0 means that id doesn't exist.
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(Number(req.params.id));
  if (result.changes === 0) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.status(204).send();
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});