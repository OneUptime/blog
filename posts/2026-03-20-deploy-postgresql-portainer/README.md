# How to Deploy PostgreSQL via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, PostgreSQL, Database, Docker, Deployment

Description: Learn how to deploy PostgreSQL via Portainer with persistent volumes, initialization scripts, pgAdmin for management, and backup strategies.

## PostgreSQL via Portainer Stack

**Stacks → Add Stack → postgresql**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      # Optional: additional initialization
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --locale=C
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - /path/to/init-scripts:/docker-entrypoint-initdb.d:ro
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    shm_size: 128mb    # Shared memory for parallel queries

  pgadmin:
    image: dpage/pgadmin4:latest
    restart: unless-stopped
    environment:
      - PGADMIN_DEFAULT_EMAIL=${PGADMIN_EMAIL}
      - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_PASSWORD}
    ports:
      - "5050:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  pgadmin_data:
```

## Portainer Environment Variables

```text
POSTGRES_DB = myapp
POSTGRES_USER = appuser
POSTGRES_PASSWORD = secure-database-password
PGADMIN_EMAIL = admin@example.com
PGADMIN_PASSWORD = pgadmin-password
```

## Initialization Scripts

```sql
-- init-scripts/01-create-extensions.sql
-- Runs on first database creation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application schema
CREATE SCHEMA IF NOT EXISTS app;

-- Create initial tables
CREATE TABLE IF NOT EXISTS app.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## PostgreSQL Configuration Tuning

```yaml
# Custom PostgreSQL settings (mount a custom config file or pass -c flags)

# Set under the postgres service in your Compose/Portainer stack:
command: >
  postgres
  -c max_connections=100
  -c shared_buffers=256MB
  -c effective_cache_size=768MB
  -c maintenance_work_mem=64MB
  -c checkpoint_completion_target=0.9
  -c wal_buffers=16MB
  -c default_statistics_target=100
  -c random_page_cost=1.1
```

## Connecting Application Services

```yaml
services:
  api:
    image: myapi:latest
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    depends_on:
      postgres:
        condition: service_healthy
```

## Backup and Restore

```bash
# Run from the Docker host; replace your-postgres-container with your container name or ID
docker exec your-postgres-container pg_dump \
  -U appuser \
  -d myapp \
  --format=custom \
  > /backup/myapp-$(date +%Y%m%d).pgdump

# Full cluster backup
docker exec your-postgres-container pg_dumpall \
  -U appuser \
  > /backup/cluster-$(date +%Y%m%d).sql

# Restore
docker exec -i your-postgres-container pg_restore \
  -U appuser \
  -d myapp \
  --clean \
  < /backup/myapp-20260320.pgdump
```

## Common Operations via Portainer Console

```sql
-- List all databases
\l

-- List tables in current database
\dt app.*

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, tablename)::regclass))
FROM pg_tables
WHERE schemaname = 'app'
ORDER BY pg_total_relation_size(format('%I.%I', schemaname, tablename)::regclass) DESC;

-- Active connections
SELECT pid, usename, application_name, state FROM pg_stat_activity;
```

## Conclusion

PostgreSQL via Portainer, with pgAdmin for browser-based SQL management, creates a complete database development and operations environment. When paired with `depends_on: condition: service_healthy`, the `pg_isready` healthcheck ensures dependent services wait for PostgreSQL to be fully ready, preventing race conditions on stack deployment.
