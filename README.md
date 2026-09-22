# Task API — Containerized with Postgres

A small CRUD API for tasks, built across three assignments as an exercise in
swapping storage without changing the API:

| Assignment | Storage | Runs on |
|---|---|---|
| A1 | an array in memory | the process |
| A2 | a `tasks.db` file | SQLite |
| A3 | rows in Postgres | a container |

The endpoints have behaved identically throughout. Only the storage module changed.

## Run it

From a clean clone, one command:

```bash
copy .env.example .env     # cp .env.example .env on macOS/Linux
docker compose up
```

That builds the API image, starts Postgres 16 in a container, creates the
`tasks` table if it's missing, and seeds three example tasks on first run.
The API is then at http://localhost:3000.

Nothing is installed on your machine — no Node, no Postgres.

## Configuration

Copy `.env.example` to `.env`. One variable:

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Connection string: `postgres://user:password@host:port/dbname` |

`.env` is git-ignored and holds the real password; `.env.example` carries
placeholders so you know which keys to set.

Inside Compose the app reaches the database at the hostname `db` — the service
name — not `localhost`. From the API container, `localhost` would mean the API
container itself.

## Endpoints

| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/tasks` | 200 — all tasks | — |
| GET | `/tasks/:id` | 200 — one task | 404 unknown id |
| POST | `/tasks` | 201 — the created task | 400 missing/empty title |
| PUT | `/tasks/:id` | 200 — the updated task | 400 empty title, 404 unknown id |
| DELETE | `/tasks/:id` | 204 — no body | 404 unknown id |
| GET | `/health` | 200 — also pings the database | 503 if unreachable |

Interactive docs at `/docs` (Swagger UI).
Errors come back as JSON: `{"error":"Task 5 not found"}`

## Example

```
> curl -i http://localhost:3000/tasks
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 213

[{"id":1,"title":"Read the assignment","done":false},
 {"id":2,"title":"Run Postgres in Docker","done":true},
 {"id":3,"title":"Swap storage to Postgres","done":false},
 {"id":4,"title":"Survives restart","done":false}]
```

## The data in the database

```
> docker compose exec db psql -U postgres -d tasks -c "SELECT * FROM tasks;"
 id |          title           | done
----+--------------------------+------
  1 | Read the assignment      | f
  2 | Run Postgres in Docker   | t
  3 | Swap storage to Postgres | f
  4 | Survives restart         | f
(4 rows)
```

![Tasks table in Postgres](screenshots/postgres-data.png)

## Persistence

Task 4 above is the evidence. It was created through the API, then both
containers were destroyed and recreated:

```bash
docker compose down     # both containers removed entirely
docker compose up
curl localhost:3000/tasks   # the task is still there
```

The rows live in the named volume `taskdata`, which outlives the containers.
Without it, `docker compose down` would take the data with it.

## Notes

Postgres is pinned to **16** deliberately. Version 18 relocated its data
directory to `/var/lib/postgresql`, so the conventional
`-v …:/var/lib/postgresql/data` mount makes it refuse to start on `latest`.

The healthcheck on the `db` service, combined with
`depends_on: condition: service_healthy`, stops the API starting before
Postgres accepts connections. Plain `depends_on` only waits for the container
to start, not to be ready — without the healthcheck the app often crashes on
its first boot.

## Built with

Node.js · Express 5 · PostgreSQL 16 · node-postgres (`pg`) · Docker Compose