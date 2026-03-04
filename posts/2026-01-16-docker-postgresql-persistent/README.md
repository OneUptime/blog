# How to Run PostgreSQL in Docker with Persistent Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, PostgreSQL, Database, Containers, DevOps

Description: Learn how to run PostgreSQL in Docker with proper data persistence, configuration, initialization scripts, backups, and production-ready settings.

---

PostgreSQL is one of the most popular databases for Docker deployments. Running it correctly requires understanding data persistence, proper configuration, and initialization. A misconfigured Postgres container can lead to data loss or security vulnerabilities.

## Quick Start

The simplest way to run PostgreSQL in Docker:

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15
```

This creates a container with:
- Password set via environment variable
- Data persisted in a named volume
- Port 5432 exposed to host

## Understanding the Official Image

The official `postgres` image provides several features:

| Environment Variable | Purpose |
|---------------------|---------|
| `POSTGRES_PASSWORD` | Required. Sets superuser password |
| `POSTGRES_USER` | Optional. Creates a user (default: postgres) |
| `POSTGRES_DB` | Optional. Creates a database (default: username) |
| `PGDATA` | Optional. Data directory (default: /var/lib/postgresql/data) |

## Data Persistence

### Named Volumes (Recommended)

```bash
# Create volume
docker volume create pgdata

# Run with volume
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15
```

Named volumes are managed by Docker and persist across container restarts and removals.

### Bind Mounts (For Direct Access)

```bash
mkdir -p ./postgres-data

docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -v $(pwd)/postgres-data:/var/lib/postgresql/data \
  postgres:15
```

Use bind mounts when you need direct filesystem access to the data directory.

### Checking Data Persistence

```bash
# Verify volume is used
docker inspect postgres --format '{{json .Mounts}}' | jq

# Check volume contents
docker run --rm -v pgdata:/data alpine ls -la /data
```

## Docker Compose Configuration

### Basic Setup

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: mysecretpassword
      POSTGRES_DB: myapp_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres-data:
```

### Production-Ready Configuration

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
      POSTGRES_DB: ${POSTGRES_DB}
    secrets:
      - postgres_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
    # Don't expose port in production - use internal network
    networks:
      - backend

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt

networks:
  backend:
    internal: true

volumes:
  postgres-data:
```

## Initialization Scripts

The image runs scripts in `/docker-entrypoint-initdb.d/` on first startup (when data directory is empty).

### SQL Scripts

```sql
-- init-scripts/01-create-tables.sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO myapp;
GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO myapp;
```

### Shell Scripts

```bash
#!/bin/bash
# init-scripts/02-seed-data.sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    INSERT INTO users (email) VALUES ('admin@example.com');
EOSQL
```

### Multiple Databases

```bash
#!/bin/bash
# init-scripts/00-create-databases.sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE app_production;
    CREATE DATABASE app_test;
    GRANT ALL PRIVILEGES ON DATABASE app_production TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE app_test TO $POSTGRES_USER;
EOSQL
```

**Note**: Scripts run in alphabetical order. Prefix with numbers to control order.

## Custom Configuration

### Using postgresql.conf

Create a custom configuration file.

```ini
# postgresql.conf

# Connection settings
listen_addresses = '*'
max_connections = 100

# Memory settings (adjust based on container memory)
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 4MB
maintenance_work_mem = 64MB

# Write-ahead log
wal_level = replica
max_wal_size = 1GB
min_wal_size = 80MB

# Query planning
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'all'
log_duration = on

# Locale
timezone = 'UTC'
```

Mount and use it:

```yaml
services:
  postgres:
    image: postgres:15
    volumes:
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

### Using Command-Line Options

Override settings without a config file:

```yaml
services:
  postgres:
    image: postgres:15
    command:
      - postgres
      - -c
      - max_connections=200
      - -c
      - shared_buffers=512MB
      - -c
      - log_statement=all
```

## Connecting to PostgreSQL

### From Host

```bash
# Using psql client
psql -h localhost -U myapp -d myapp_db

# Using connection string
psql "postgresql://myapp:password@localhost:5432/myapp_db"
```

### From Another Container

```yaml
services:
  postgres:
    image: postgres:15
    networks:
      - app-network

  app:
    image: my-app
    environment:
      DATABASE_URL: postgresql://myapp:password@postgres:5432/myapp_db
    networks:
      - app-network
    depends_on:
      postgres:
        condition: service_healthy

networks:
  app-network:
```

### Wait for PostgreSQL to be Ready

```bash
#!/bin/bash
# wait-for-postgres.sh

until pg_isready -h postgres -U "$POSTGRES_USER"; do
  echo "Waiting for postgres..."
  sleep 2
done

echo "PostgreSQL is ready"
exec "$@"
```

## Backup and Restore

### Create Backup

```bash
# Backup to SQL file
docker exec postgres pg_dump -U myapp myapp_db > backup.sql

# Backup with compression
docker exec postgres pg_dump -U myapp myapp_db | gzip > backup.sql.gz

# Custom format (recommended for large databases)
docker exec postgres pg_dump -U myapp -Fc myapp_db > backup.dump
```

### Restore Backup

```bash
# Restore from SQL file
docker exec -i postgres psql -U myapp myapp_db < backup.sql

# Restore compressed
gunzip -c backup.sql.gz | docker exec -i postgres psql -U myapp myapp_db

# Restore custom format
docker exec -i postgres pg_restore -U myapp -d myapp_db < backup.dump
```

### Automated Backups

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    volumes:
      - postgres-data:/var/lib/postgresql/data

  backup:
    image: postgres:15
    volumes:
      - ./backups:/backups
    environment:
      PGHOST: postgres
      PGUSER: myapp
      PGPASSWORD: password
      PGDATABASE: myapp_db
    entrypoint: |
      sh -c 'while true; do
        pg_dump -Fc > /backups/backup-$$(date +%Y%m%d-%H%M%S).dump
        find /backups -name "*.dump" -mtime +7 -delete
        sleep 86400
      done'
    depends_on:
      - postgres

volumes:
  postgres-data:
```

## Health Checks

```yaml
services:
  postgres:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp -d myapp_db"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

## Security Best Practices

### Use Secrets for Passwords

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Don't Expose Port in Production

```yaml
services:
  postgres:
    image: postgres:15
    # No ports: section - not accessible from host
    networks:
      - internal

  app:
    networks:
      - internal
      - public

networks:
  internal:
    internal: true  # No external access
  public:
```

### Restrict Network Access

```sql
-- Only allow specific hosts (set in pg_hba.conf)
-- For Docker, allow the container network range
host    all    all    172.16.0.0/12    scram-sha-256
```

## Troubleshooting

### Check Logs

```bash
docker logs postgres

# Follow logs
docker logs -f postgres

# Last 100 lines
docker logs --tail 100 postgres
```

### Connect and Debug

```bash
# Interactive psql session
docker exec -it postgres psql -U myapp -d myapp_db

# Check connections
docker exec postgres psql -U myapp -c "SELECT * FROM pg_stat_activity;"

# Check database sizes
docker exec postgres psql -U myapp -c "\l+"
```

### Common Issues

| Problem | Solution |
|---------|----------|
| "FATAL: password authentication failed" | Check POSTGRES_PASSWORD matches |
| "FATAL: database does not exist" | Check POSTGRES_DB or create manually |
| Data lost after restart | Ensure volume is configured correctly |
| Container exits immediately | Check logs, often missing POSTGRES_PASSWORD |
| Can't connect from host | Check port mapping and pg_hba.conf |

## Summary

| Aspect | Development | Production |
|--------|-------------|------------|
| Password | Environment variable | Docker secret |
| Ports | Exposed (5432:5432) | Internal network only |
| Volume | Named volume or bind mount | Named volume |
| Resources | Default | Memory limits set |
| Health check | Optional | Required |
| Backups | Manual | Automated |

PostgreSQL in Docker works well for both development and production when configured correctly. Always use volumes for persistence, secrets for passwords, and health checks for reliability.
