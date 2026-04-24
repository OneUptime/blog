# How to Deploy PostgreSQL via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, PostgreSQL, Database, Self-Hosted

Description: Deploy PostgreSQL via Portainer with persistent storage, pgAdmin web interface, custom configuration, and automated backup scheduling.

## Introduction

PostgreSQL is the world's most advanced open-source relational database, known for its ACID compliance, extensibility, and powerful feature set. Deploying it via Portainer takes minutes and provides a production-ready database backend for modern applications.

## Deploy as a Stack

On your Docker host, save `postgresql.conf` and the `init` directory under `/opt/postgresql`, then in Portainer create a stack named `postgresql`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp_user
      POSTGRES_PASSWORD: change_this_password
      # Encoding settings
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      # Persistent database storage
      - postgres_data:/var/lib/postgresql/data
      # Custom PostgreSQL configuration on the Docker host
      - /opt/postgresql/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      # Initialization scripts on the Docker host
      - /opt/postgresql/init:/docker-entrypoint-initdb.d:ro
    ports:
      - "5432:5432"
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp_user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  # pgAdmin - web-based PostgreSQL admin
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: pgadmin_password
      PGADMIN_LISTEN_PORT: 80
    ports:
      - "5050:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
  pgadmin_data:
```

## PostgreSQL Configuration

Create `/opt/postgresql/postgresql.conf`:

```ini
# postgresql.conf - custom configuration

# Connections

max_connections = 100
superuser_reserved_connections = 3

# Memory (adjust for your server's RAM)
shared_buffers = 256MB           # 25% of RAM
effective_cache_size = 768MB     # 75% of RAM
work_mem = 4MB                   # Per sort/hash operation
maintenance_work_mem = 64MB      # For VACUUM, CREATE INDEX

# Write-ahead log
wal_level = replica              # Enable replication
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 1GB
min_wal_size = 80MB

# Query planner
random_page_cost = 1.1           # Use 1.1 for SSD storage
effective_io_concurrency = 200   # For SSD storage

# Logging
log_destination = 'stderr'
logging_collector = off          # Docker captures stdout
log_min_duration_statement = 1000  # Log queries over 1 second
log_checkpoints = on
log_connections = off
log_disconnections = off
log_line_prefix = '%m [%p] %q%u@%d '

# Time zone
timezone = 'UTC'
```

## Initialization Scripts

Create `/opt/postgresql/init/01-extensions.sql`:

```sql
-- Create useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Trigram text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";   -- GIN index for B-tree types

-- Create additional schemas
CREATE SCHEMA IF NOT EXISTS api;
CREATE SCHEMA IF NOT EXISTS audit;

-- Grant permissions
GRANT USAGE ON SCHEMA api TO myapp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA api TO myapp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA api TO myapp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT ALL PRIVILEGES ON TABLES TO myapp_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT ALL PRIVILEGES ON SEQUENCES TO myapp_user;

-- Audit log table used by the trigger function
CREATE TABLE IF NOT EXISTS audit.changes (
    id BIGSERIAL PRIMARY KEY,
    table_name text NOT NULL,
    operation text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create audit function for tracking changes
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit.changes (table_name, operation, old_data, new_data, changed_at)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Backup with pg_dump

```bash
# Full database backup
docker exec postgres pg_dump \
  -U myapp_user \
  -d myapp \
  --format=custom \
  --compress=9 \
  -f /tmp/myapp-backup.dump

# Copy backup from container
mkdir -p ./backups
docker cp postgres:/tmp/myapp-backup.dump ./backups/

# Restore from backup
docker exec -i postgres pg_restore \
  -U myapp_user \
  -d myapp \
  --clean \
  --if-exists \
  < ./backups/myapp-backup.dump
```

## Scheduled Backup Script

```bash
#!/bin/bash
# Automated PostgreSQL backup via cron

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d-%H%M%S)
CONTAINER="postgres"
DB_USER="myapp_user"
DB_NAME="myapp"

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  > "$BACKUP_DIR/$DB_NAME-$DATE.dump"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "*.dump" -mtime +7 -delete
```

## Conclusion

PostgreSQL deployed via Portainer with pgAdmin provides a powerful database platform with excellent tooling. The custom configuration file allows fine-tuning for your hardware, and the initialization scripts ensure consistent database setup. PostgreSQL's robust feature set - including JSONB, full-text search, and window functions - makes it suitable for complex application requirements.
