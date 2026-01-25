# How to Run PostgreSQL in Docker with Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Docker, Containers, DevOps, Database, Persistence

Description: A complete guide to running PostgreSQL in Docker containers with persistent data, proper configuration, backups, and production-ready settings.

---

Running PostgreSQL in Docker is convenient for development and works well for production with the right setup. The key is persistence. Without it, your data disappears when the container stops. This guide covers everything from basic setup to production-ready configurations.

## Quick Start for Development

The simplest way to run PostgreSQL:

```bash
# Run PostgreSQL with a named volume for persistence
docker run -d \
  --name postgres-dev \
  -e POSTGRES_USER=devuser \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16

# Connect to the database
docker exec -it postgres-dev psql -U devuser -d myapp
```

The `-v pgdata:/var/lib/postgresql/data` creates a named volume that persists data between container restarts.

## Understanding Docker Volumes

Docker offers three storage options:

```mermaid
flowchart TB
    subgraph Container
        PG[PostgreSQL]
        DataDir[/var/lib/postgresql/data]
    end

    subgraph Storage Options
        Named[Named Volume<br/>docker volume create]
        Bind[Bind Mount<br/>/host/path:/container/path]
        Tmpfs[tmpfs<br/>RAM only, no persistence]
    end

    DataDir --> Named
    DataDir --> Bind
    DataDir --> Tmpfs
```

### Named Volumes (Recommended)

Docker manages the storage location:

```bash
# Create a named volume
docker volume create pgdata

# Use it with PostgreSQL
docker run -d \
  --name postgres \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16

# Inspect the volume
docker volume inspect pgdata
```

### Bind Mounts

Map to a specific host directory:

```bash
# Create host directory
mkdir -p /data/postgres

# Use bind mount
docker run -d \
  --name postgres \
  -v /data/postgres:/var/lib/postgresql/data \
  postgres:16
```

Bind mounts are useful when you need direct access to files or specific storage locations.

## Docker Compose Setup

For a complete development environment:

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secretpassword}
      POSTGRES_DB: appdb
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Start the stack:

```bash
# Start in background
docker compose up -d

# View logs
docker compose logs -f postgres

# Stop and preserve data
docker compose down

# Stop and remove volumes (data loss!)
docker compose down -v
```

## Initialization Scripts

Scripts in `/docker-entrypoint-initdb.d` run once when the data directory is empty:

```bash
# Create init-scripts directory
mkdir init-scripts
```

```sql
-- init-scripts/01-schema.sql
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.users (
    id serial PRIMARY KEY,
    email varchar(255) UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE app.events (
    id serial PRIMARY KEY,
    user_id integer REFERENCES app.users(id),
    event_type varchar(50),
    payload jsonb,
    created_at timestamptz DEFAULT now()
);
```

```bash
#!/bin/bash
# init-scripts/02-seed.sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    INSERT INTO app.users (email) VALUES
        ('admin@example.com'),
        ('user@example.com');
EOSQL
```

Make the script executable:

```bash
chmod +x init-scripts/02-seed.sh
```

## Custom PostgreSQL Configuration

Override default settings with a custom configuration:

```ini
# custom-postgresql.conf
# Memory settings
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 16MB
maintenance_work_mem = 128MB

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 1GB

# Query planning
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_statement = 'all'
log_duration = on
log_min_duration_statement = 100
```

Mount the configuration:

```yaml
services:
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./custom-postgresql.conf:/etc/postgresql/postgresql.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

Or use environment variables for simple settings:

```yaml
services:
  postgres:
    image: postgres:16
    command:
      - "postgres"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "log_statement=all"
```

## Backup Strategies

### Manual Backup with pg_dump

```bash
# Backup to SQL file
docker exec postgres pg_dump -U appuser -d appdb > backup.sql

# Backup to compressed custom format
docker exec postgres pg_dump -U appuser -Fc appdb > backup.dump

# Restore from SQL
docker exec -i postgres psql -U appuser -d appdb < backup.sql

# Restore from custom format
docker exec -i postgres pg_restore -U appuser -d appdb < backup.dump
```

### Automated Backups with a Sidecar

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: appdb

  backup:
    image: postgres:16
    volumes:
      - ./backups:/backups
    environment:
      PGHOST: postgres
      PGUSER: appuser
      PGPASSWORD: secretpassword
      PGDATABASE: appdb
    entrypoint: >
      bash -c "
        while true; do
          pg_dump -Fc > /backups/backup_$$(date +%Y%m%d_%H%M%S).dump
          find /backups -name '*.dump' -mtime +7 -delete
          sleep 86400
        done
      "
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Volume Backup

Back up the entire data volume:

```bash
# Stop the container first for consistency
docker stop postgres

# Create a backup of the volume
docker run --rm \
  -v pgdata:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/pgdata-backup.tar.gz -C /data .

# Restore the volume
docker run --rm \
  -v pgdata:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/pgdata-backup.tar.gz -C /data

# Start the container
docker start postgres
```

## Production Considerations

### Resource Limits

```yaml
services:
  postgres:
    image: postgres:16
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Security Hardening

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD_FILE: /run/secrets/pg_password
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256"
    secrets:
      - pg_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./pg_hba.conf:/etc/postgresql/pg_hba.conf
    command: postgres -c hba_file=/etc/postgresql/pg_hba.conf

secrets:
  pg_password:
    file: ./secrets/pg_password.txt
```

```conf
# pg_hba.conf
# TYPE  DATABASE  USER      ADDRESS        METHOD
local   all       all                      scram-sha-256
host    all       all       127.0.0.1/32   scram-sha-256
host    all       all       ::1/128        scram-sha-256
host    appdb     appuser   10.0.0.0/8     scram-sha-256
host    all       all       0.0.0.0/0      reject
```

### Health Checks and Restart Policies

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

## Monitoring

Add monitoring with Prometheus:

```yaml
services:
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://appuser:secretpassword@postgres:5432/appdb?sslmode=disable"
    ports:
      - "9187:9187"
    depends_on:
      - postgres
```

## Upgrading PostgreSQL

To upgrade between major versions:

```bash
# Backup current data
docker exec postgres pg_dumpall -U appuser > full_backup.sql

# Stop and rename old container
docker stop postgres
docker rename postgres postgres-old

# Start new version
docker run -d \
  --name postgres \
  -v pgdata-new:/var/lib/postgresql/data \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=secretpassword \
  postgres:17

# Restore data
docker exec -i postgres psql -U appuser < full_backup.sql

# Verify and remove old container
docker rm postgres-old
docker volume rm pgdata
```

---

Docker makes PostgreSQL portable and reproducible. The critical piece is persistence through volumes. Use named volumes for simplicity, bind mounts when you need host access, and always test your backup and restore procedures. With proper configuration, PostgreSQL in Docker works well for both development and production environments.
