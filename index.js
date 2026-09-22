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

app.get('/health', async (req, res) => {
  try {
    await db.ping();
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

app.get('/tasks', async (req, res) => {
  const rows = await db.getAll();
  res.json(rows);
});

app.get('/tasks/:id', async (req, res) => {
  const row = await db.getById(Number(req.params.id));
  if (!row) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.json(row);
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' });
  }

  const created = await db.create(title, false);
  res.status(201).json(created);
});

app.put('/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.getById(id);
  if (!row) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  const { title, done } = req.body;
  if (title !== undefined && title.trim() === '') {
    return res.status(400).json({ error: 'title cannot be empty' });
  }

  // Fall back to the row's current values so a partial update never blanks a column.
  const newTitle = title !== undefined ? title : row.title;
  const newDone = done !== undefined ? Boolean(done) : row.done;

  const updated = await db.update(id, newTitle, newDone);
  res.json(updated);
});

app.delete('/tasks/:id', async (req, res) => {
  const changed = await db.remove(Number(req.params.id));
  if (changed === 0) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.status(204).send();
});

db.init()
  .then(() => {
    app.listen(3000, () => console.log('Server running on http://localhost:3000'));
  })
  .catch((err) => {
    console.error('Database failed to start:', err.message);
    process.exit(1);
  });
