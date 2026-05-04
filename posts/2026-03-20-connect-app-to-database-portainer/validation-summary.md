# Validation Summary: How to Connect Application Containers to Database Containers in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Docker management UI)
- Docker / Docker Compose
- PostgreSQL (postgres:15-alpine image)
- Redis (redis:7-alpine image)
- MongoDB (mongo:7.0 image)
- Nginx (reverse proxy)
- Python (asyncpg, FastAPI)
- Node.js (node-postgres / pg)
- Docker secrets

## Sources Consulted
- Docker Compose Specification — networks, depends_on, healthcheck, secrets: https://docs.docker.com/compose/compose-file/
- Docker Compose `depends_on` with `condition: service_healthy`: https://docs.docker.com/compose/compose-file/05-services/#depends_on
- Docker secrets in Compose: https://docs.docker.com/compose/use-secrets/
- asyncpg API reference (`create_pool`, `connect`, `Pool.acquire`, `Connection.fetch`): https://magicstack.github.io/asyncpg/current/api/index.html
- node-postgres Pool documentation (`max`, `min`, `idleTimeoutMillis`, `connectionTimeoutMillis`): https://node-postgres.com/apis/pool
- PostgreSQL `pg_isready` utility: https://www.postgresql.org/docs/current/app-pg-isready.html
- Postgres Docker image environment variables (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`): https://hub.docker.com/_/postgres
- Docker CLI reference (`docker network inspect`, `docker exec`, `docker logs`): https://docs.docker.com/engine/reference/commandline/cli/
- Portainer Secrets documentation: https://docs.portainer.io/

## Issues Found
- **Step 6 — Python snippet used `await` outside an `async` function.** The original snippet had `conn = await asyncpg.connect(...)` at module top level, which is a `SyntaxError` in Python. I wrapped the call inside an `async def connect_db():` function and added the missing `import os` / `import asyncpg` lines so the snippet is now syntactically valid and copy-paste runnable.

## Review Notes
- The `version: "3.8"` field in the Compose files is technically obsolete in the modern Compose Specification (the version key is ignored by Docker Compose v2). It still works for backward compatibility, so I left it as-is, but future revisions could drop it.
- `depends_on` with `condition: service_healthy` was removed from the v3 schema for a period but is fully supported again in the current Compose Specification and modern Docker Compose v2 — the example is correct.
- The comment near `# expose: ["5432"]` could be misread: the `expose` keyword never publishes ports to the host (only `ports:` does); `expose` simply documents inter-container ports. The follow-on comment "Only accessible within app_network" is accurate. Wording could be tightened in a future pass.
- The MongoDB service in Step 2 connects with `mongodb://app:pass@mongodb:27017/myapp` but the service definition doesn't set `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD`. The connection string illustrates the URL pattern but won't actually authenticate against a freshly-started MongoDB instance without those env vars. This is a minor incompleteness rather than a technical error in what's shown.
- Troubleshooting commands (`nslookup`, `ping`, `nc`) assume the application image has those utilities installed. Slim/distroless and `*-alpine` images often don't — readers may need to install them or use `docker run --rm --network app_network busybox` for diagnostics. Not incorrect, but worth flagging.
