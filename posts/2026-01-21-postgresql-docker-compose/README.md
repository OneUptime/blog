# How to Run PostgreSQL in Docker and Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Docker, Docker Compose, Containers, Database, DevOps

Description: A comprehensive guide to running PostgreSQL in Docker containers and Docker Compose, covering single-node setups, data persistence, networking, and production-ready configurations.

---

Running PostgreSQL in Docker provides consistency across development environments and simplifies deployment. This guide covers everything from basic Docker commands to production-ready Docker Compose configurations.

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose (version 2.0+)
- Basic understanding of Docker concepts

## Running PostgreSQL with Docker

### Quick Start

The simplest way to run PostgreSQL in Docker:

```bash
docker run --name postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -d postgres:16
```

This starts PostgreSQL 16 with the default user `postgres` and your specified password.

### Running with Port Mapping

To connect from your host machine:

```bash
docker run --name postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 \
  -d postgres:16
```

Connect using:

```bash
psql -h localhost -U postgres -d postgres
```

### Running with Data Persistence

Without volume mounting, data is lost when the container is removed. Use volumes for persistence:

```bash
docker run --name postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_USER=myuser \
  -e POSTGRES_DB=myapp \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  -d postgres:16
```

Or use a bind mount for easier access:

```bash
docker run --name postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -v $(pwd)/postgres-data:/var/lib/postgresql/data \
  -p 5432:5432 \
  -d postgres:16
```

## Environment Variables

PostgreSQL Docker image supports several environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Superuser password (required) | - |
| `POSTGRES_USER` | Superuser username | postgres |
| `POSTGRES_DB` | Default database | same as user |
| `PGDATA` | Data directory location | /var/lib/postgresql/data |
| `POSTGRES_INITDB_ARGS` | Arguments for initdb | - |
| `POSTGRES_HOST_AUTH_METHOD` | Host authentication method | scram-sha-256 |

## Docker Compose Setup

### Basic Configuration

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start with:

```bash
docker compose up -d
```

### Production-Ready Configuration

A more complete configuration for production use:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-myapp}
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-myapp}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

volumes:
  postgres_data:
    driver: local
```

### Custom Configuration File

Create a `postgresql.conf` for custom settings:

```conf
# Connection Settings
listen_addresses = '*'
max_connections = 200

# Memory Settings
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 32MB
maintenance_work_mem = 256MB

# Write-Ahead Log
wal_level = replica
max_wal_size = 2GB
min_wal_size = 512MB

# Query Planning
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'ddl'
log_min_duration_statement = 1000

# Checkpoints
checkpoint_completion_target = 0.9

# Parallel Queries
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
```

## Initialization Scripts

PostgreSQL Docker image automatically executes `.sql`, `.sql.gz`, and `.sh` files from `/docker-entrypoint-initdb.d/` on first startup.

### SQL Initialization

Create `init-scripts/01-schema.sql`:

```sql
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS app;

-- Create tables
CREATE TABLE IF NOT EXISTS app.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON app.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON app.users(created_at);
```

Create `init-scripts/02-users.sql`:

```sql
-- Create application user
CREATE USER app_user WITH PASSWORD 'app_password';

-- Grant privileges
GRANT USAGE ON SCHEMA app TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Create read-only user
CREATE USER readonly_user WITH PASSWORD 'readonly_password';
GRANT USAGE ON SCHEMA app TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT ON TABLES TO readonly_user;
```

### Shell Script Initialization

Create `init-scripts/03-setup.sh`:

```bash
#!/bin/bash
set -e

echo "Running custom initialization..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Additional setup commands
    ALTER SYSTEM SET log_statement = 'ddl';
    SELECT pg_reload_conf();
EOSQL

echo "Initialization complete!"
```

Make it executable:

```bash
chmod +x init-scripts/03-setup.sh
```

## PostgreSQL with Application Stack

### Full Stack Example

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  app:
    build: .
    container_name: app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://myuser:mypassword@postgres:5432/myapp
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000"
    networks:
      - backend

  adminer:
    image: adminer
    container_name: adminer
    restart: unless-stopped
    ports:
      - "8080:8080"
    networks:
      - backend
    depends_on:
      - postgres

volumes:
  postgres_data:

networks:
  backend:
    driver: bridge
```

## PostgreSQL with PgBouncer

For connection pooling, add PgBouncer:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - database

  pgbouncer:
    image: bitnami/pgbouncer:latest
    container_name: pgbouncer
    restart: unless-stopped
    environment:
      POSTGRESQL_HOST: postgres
      POSTGRESQL_PORT: 5432
      POSTGRESQL_USERNAME: myuser
      POSTGRESQL_PASSWORD: mypassword
      POSTGRESQL_DATABASE: myapp
      PGBOUNCER_DATABASE: myapp
      PGBOUNCER_PORT: 6432
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: 1000
      PGBOUNCER_DEFAULT_POOL_SIZE: 20
      PGBOUNCER_MIN_POOL_SIZE: 10
    ports:
      - "6432:6432"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - database

volumes:
  postgres_data:

networks:
  database:
    driver: bridge
```

## Backup and Restore

### Backup with pg_dump

```bash
# Backup database
docker exec postgres pg_dump -U myuser myapp > backup.sql

# Backup with compression
docker exec postgres pg_dump -U myuser -Fc myapp > backup.dump

# Backup all databases
docker exec postgres pg_dumpall -U postgres > all_databases.sql
```

### Restore from Backup

```bash
# Restore from SQL file
docker exec -i postgres psql -U myuser myapp < backup.sql

# Restore from compressed dump
docker exec -i postgres pg_restore -U myuser -d myapp < backup.dump

# Restore to new database
docker exec postgres createdb -U postgres newdb
docker exec -i postgres psql -U postgres newdb < backup.sql
```

### Automated Backups

Create a backup script `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/myapp_${TIMESTAMP}.dump"

# Create backup
docker exec postgres pg_dump -U myuser -Fc myapp > "${BACKUP_FILE}"

# Keep only last 7 days of backups
find "${BACKUP_DIR}" -name "*.dump" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

## Useful Docker Commands

### Container Management

```bash
# View logs
docker logs postgres
docker logs -f postgres  # Follow logs

# Execute commands in container
docker exec -it postgres psql -U myuser -d myapp

# View container stats
docker stats postgres

# Inspect container
docker inspect postgres
```

### Database Operations

```bash
# Create database
docker exec postgres createdb -U postgres newdb

# Drop database
docker exec postgres dropdb -U postgres olddb

# Create user
docker exec postgres psql -U postgres -c "CREATE USER newuser WITH PASSWORD 'password';"

# List databases
docker exec postgres psql -U postgres -c "\l"

# List tables
docker exec postgres psql -U myuser -d myapp -c "\dt"
```

## Troubleshooting

### Connection Refused

```bash
# Check if container is running
docker ps | grep postgres

# Check container logs
docker logs postgres

# Verify port mapping
docker port postgres

# Test connectivity
docker exec postgres pg_isready -U myuser
```

### Data Not Persisting

```bash
# Verify volume is mounted
docker inspect postgres | grep -A 10 Mounts

# Check volume
docker volume ls
docker volume inspect postgres_data
```

### Permission Issues

```bash
# Check data directory permissions
docker exec postgres ls -la /var/lib/postgresql/data

# Fix permissions (if using bind mount)
sudo chown -R 999:999 ./postgres-data
```

### Container Keeps Restarting

```bash
# Check logs for errors
docker logs postgres --tail 100

# Common causes:
# - Invalid configuration
# - Insufficient memory
# - Corrupted data directory
```

## Security Considerations

### Use Secrets for Passwords

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
```

### Network Isolation

```yaml
services:
  postgres:
    networks:
      - internal  # No external access

  app:
    networks:
      - internal
      - external

networks:
  internal:
    internal: true  # No internet access
  external:
```

## Conclusion

Running PostgreSQL in Docker and Docker Compose simplifies development and deployment workflows. Key takeaways:

1. Always use volumes for data persistence
2. Use health checks for proper service orchestration
3. Configure initialization scripts for reproducible setups
4. Consider PgBouncer for connection pooling in production
5. Implement regular backup procedures
6. Use secrets for sensitive credentials

This setup provides a foundation you can extend based on your specific requirements, whether for local development or production deployments.
