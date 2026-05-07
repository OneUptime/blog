# How to Run PostgreSQL in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, PostgreSQL, Database, SQL

Description: Learn how to run PostgreSQL in a Podman container with persistent data, custom configuration, and initialization scripts.

---

> PostgreSQL in Podman delivers an enterprise-grade database in a rootless container with full data persistence and easy configuration.

PostgreSQL is a powerful, open-source relational database known for its reliability, feature set, and standards compliance. Running it in a Podman container streamlines development workflows, ensures environment consistency, and makes it trivial to create and tear down database instances. This guide covers setup, persistence, tuning, and common administrative tasks.

---

## Pulling the PostgreSQL Image

Download the official PostgreSQL image.

```bash
# Pull the PostgreSQL 16 image

podman pull docker.io/library/postgres:16

# Verify the image
podman images | grep postgres
```

## Running a Basic PostgreSQL Container

Start PostgreSQL with a password and default settings.

```bash
# Run PostgreSQL with a superuser password
podman run -d \
  --name my-postgres \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=my-secret-password \
  docker.io/library/postgres:16

# Confirm the container is running
podman ps

# Connect and verify
podman exec -it my-postgres psql -U postgres -c "SELECT version();"
```

## Persistent Data with Named Volumes

Keep your data safe across container restarts.

```bash
# Create a volume for PostgreSQL data
podman volume create pg-data

# Run PostgreSQL with the persistent volume
podman run -d \
  --name pg-persistent \
  -p 5433:5432 \
  -e POSTGRES_PASSWORD=my-secret-password \
  -v pg-data:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16

# Verify the volume is attached
podman inspect pg-persistent --format '{{range .Mounts}}{{.Name}}{{end}}'
```

## Creating a Database and User

Set up a database and user automatically at startup.

```bash
# Run PostgreSQL with a pre-created database and user
podman volume create pg-app-data

podman run -d \
  --name pg-app \
  -p 5434:5432 \
  -e POSTGRES_PASSWORD=admin-secret \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_DB=myapp \
  -v pg-app-data:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16

# Connect as the application user
podman exec -it pg-app psql -U appuser -d myapp -c "\conninfo"
```

## Custom PostgreSQL Configuration

Tune PostgreSQL by mounting a custom configuration.

```bash
# Create a config directory
mkdir -p ~/pg-config

# Write custom PostgreSQL settings
cat > ~/pg-config/custom-postgresql.conf <<'EOF'
# Connection settings
listen_addresses = '*'
max_connections = 200

# Memory tuning
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 4MB
maintenance_work_mem = 64MB

# Write-ahead log
wal_level = replica
max_wal_senders = 3

# Logging
log_statement = 'mod'
log_duration = on
log_min_duration_statement = 1000
EOF

# Run PostgreSQL with a custom config file
podman volume create pg-tuned-data

podman run -d \
  --name pg-tuned \
  -p 5435:5432 \
  -e POSTGRES_PASSWORD=my-secret-password \
  -v ~/pg-config/custom-postgresql.conf:/etc/postgresql/custom.conf:Z \
  -v pg-tuned-data:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16 \
  -c 'config_file=/etc/postgresql/custom.conf'

# Verify a custom setting
podman exec -it pg-tuned psql -U postgres -c "SHOW shared_buffers;"
```

## Running Initialization Scripts

Automatically create schemas and seed data on first launch.

```bash
# Create init scripts directory
mkdir -p ~/pg-init

# Write an initialization SQL script
cat > ~/pg-init/01-init.sql <<'EOF'
-- Create a table for the application
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert seed data
INSERT INTO users (username, email) VALUES
    ('admin', 'admin@example.com'),
    ('demo', 'demo@example.com');
EOF

# Run PostgreSQL with init scripts
podman run -d \
  --name pg-init \
  -p 5436:5432 \
  -e POSTGRES_PASSWORD=my-secret-password \
  -e POSTGRES_DB=myapp \
  -v ~/pg-init:/docker-entrypoint-initdb.d:Z \
  docker.io/library/postgres:16
```

## Backup and Restore

Create and restore PostgreSQL backups.

```bash
# Dump the entire database
podman exec pg-app pg_dumpall -U appuser > ~/pg-backup.sql

# Dump a specific database in custom format
podman exec pg-app pg_dump -U appuser -Fc myapp > ~/myapp-backup.dump

# Restore from an SQL dump
podman exec -i pg-app psql -U appuser -X -d postgres < ~/pg-backup.sql
```

## Managing the Container

Day-to-day management commands.

```bash
# View PostgreSQL logs
podman logs my-postgres

# Stop the container
podman stop my-postgres

# Start it again
podman start my-postgres

# Remove the container
podman rm -f my-postgres

# Remove containers that use persistent volumes
podman rm -f pg-persistent pg-app pg-tuned

# Clean up the volumes
podman volume rm pg-data pg-app-data pg-tuned-data
```

## Summary

Running PostgreSQL in a Podman container provides a reliable, isolated database environment that is easy to set up and manage. Named volumes preserve your data through container restarts, custom configuration files let you tune performance, and initialization scripts automate schema creation. With Podman's rootless containers, you get added security without sacrificing any PostgreSQL functionality. This approach works well for local development, CI pipelines, and staging environments.
