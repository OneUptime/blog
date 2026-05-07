# How to Use Podman for Database Administration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Database, PostgreSQL, MySQL, MongoDB, Container

Description: Learn how to deploy, manage, and administer databases using Podman containers with persistent storage, automated backups, replication, and monitoring.

---

> Podman makes database administration portable and reproducible by running database engines in isolated containers with persistent volumes, automated backups, and rootless security.

Database administration involves deployment, configuration, backup, monitoring, and scaling. Podman containers simplify every step by packaging database engines with their dependencies and providing consistent environments across development, staging, and production. You can run PostgreSQL, MySQL, MongoDB, and Redis side by side without version conflicts.

This guide covers practical database administration tasks using Podman, from basic setup to replication and backup automation.

---

## Why Podman for Database Administration

Running databases in containers gives you version isolation, easy upgrades, and reproducible environments. Podman adds rootless execution, reducing the risk of a database container compromise escalating to root access on the host. Named volumes ensure data persists across container lifecycles, and Quadlet integration lets databases run as systemd services.

## Deploying PostgreSQL

```bash
podman volume create pgdata

podman run -d \
  --name postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=securepass \
  -e POSTGRES_DB=appdb \
  -v pgdata:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16-alpine
```

Connect with psql:

```bash
podman exec -it postgres psql -U admin -d appdb
```

## Deploying MySQL

```bash
podman volume create mysqldata

podman run -d \
  --name mysql \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=appdb \
  -e MYSQL_USER=admin \
  -e MYSQL_PASSWORD=securepass \
  -v mysqldata:/var/lib/mysql:Z \
  docker.io/library/mysql:8.0
```

## Deploying MongoDB

```bash
podman volume create mongodata

podman run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=securepass \
  -v mongodata:/data/db:Z \
  docker.io/library/mongo:7
```

## Custom Database Configuration

Mount custom configuration files to tune database parameters:

```bash
# PostgreSQL custom config

mkdir -p ~/db-config
podman volume create pgtuneddata

cat > ~/db-config/postgresql.conf << 'EOF'
listen_addresses = '*'
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 4MB
maintenance_work_mem = 64MB
wal_buffers = 8MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1
log_min_duration_statement = 1000
EOF

podman run -d \
  --name postgres-tuned \
  -p 5440:5432 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=securepass \
  -e POSTGRES_DB=appdb \
  -v pgtuneddata:/var/lib/postgresql/data:Z \
  -v ~/db-config/postgresql.conf:/etc/postgresql/postgresql.conf:ro,Z \
  docker.io/library/postgres:16-alpine \
  -c 'config_file=/etc/postgresql/postgresql.conf'
```

## Automated Backups

Create a backup script for a PostgreSQL container running under Podman:

```bash
#!/bin/bash
# backup-postgres.sh
BACKUP_DIR=/srv/backups/postgres
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}"
podman exec postgres pg_dumpall -U admin > "${BACKUP_DIR}/full_backup_${DATE}.sql"

# Keep only last 7 days of backups
find "${BACKUP_DIR}" -name "*.sql" -mtime +7 -delete

echo "Backup completed: full_backup_${DATE}.sql"
```

For individual database backups with compression:

```bash
podman exec postgres pg_dump -U admin -Fc appdb > /srv/backups/appdb_$(date +%Y%m%d).dump
```

For MySQL:

```bash
podman exec mysql mysqldump -u root -prootpass --all-databases | gzip > /srv/backups/mysql_$(date +%Y%m%d).sql.gz
```

## Database Initialization Scripts

Both PostgreSQL and MySQL support initialization scripts that run on first startup:

```bash
mkdir -p ~/db-init
podman volume create pginitdata

cat > ~/db-init/01-schema.sql << 'EOF'
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
EOF

podman run -d \
  --name postgres-init \
  -p 5441:5432 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=securepass \
  -e POSTGRES_DB=appdb \
  -v pginitdata:/var/lib/postgresql/data:Z \
  -v ~/db-init:/docker-entrypoint-initdb.d:ro,Z \
  docker.io/library/postgres:16-alpine
```

## PostgreSQL Replication Setup

Set up streaming replication with a primary and replica:

```bash
podman network create db-network
podman volume create pg-primary-data
podman volume create pg-replica-data

# Primary
podman run -d \
  --name pg-primary \
  --network db-network \
  -p 5442:5432 \
  -e POSTGRES_PASSWORD=securepass \
  -v pg-primary-data:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16-alpine

# Create a replication role and allow replication connections
podman exec pg-primary psql -U postgres -c \
  "CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replpass';"
podman exec pg-primary sh -c \
  "echo 'host replication replicator all scram-sha-256' >> /var/lib/postgresql/data/pg_hba.conf"
podman exec pg-primary psql -U postgres -c \
  "SELECT pg_reload_conf();"

# Seed the replica with a base backup
podman run --rm \
  --network db-network \
  -e PGPASSWORD=replpass \
  -v pg-replica-data:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16-alpine \
  pg_basebackup -h pg-primary -D /var/lib/postgresql/data -U replicator -Fp -Xs -P -R

# Start the replica
podman run -d \
  --name pg-replica \
  --network db-network \
  -v pg-replica-data:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:16-alpine
```

## Database Monitoring

Run a monitoring container alongside your database on the same Podman network:

```bash
# pgAdmin for PostgreSQL
podman network exists db-network || podman network create db-network
podman network connect db-network postgres

podman run -d \
  --name pgadmin \
  --network db-network \
  -p 8080:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@example.com \
  -e PGADMIN_DEFAULT_PASSWORD=adminpass \
  docker.io/dpage/pgadmin4:latest
```

Monitor database performance metrics:

```bash
# Check container resource usage
podman stats postgres

# Check PostgreSQL active connections
podman exec postgres psql -U admin -d appdb -c \
  "SELECT count(*) as connections, state FROM pg_stat_activity GROUP BY state;"

# Check database sizes
podman exec postgres psql -U admin -d appdb -c \
  "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database ORDER BY pg_database_size(datname) DESC;"
```

## Version Upgrades

Upgrade a database by running the new version alongside the old one:

```bash
podman rename postgres postgres-old

# Export from old version
podman exec postgres-old pg_dumpall -U admin > /tmp/db_export.sql

# Start new version
podman run -d --name postgres-new \
  -p 5433:5432 \
  -e POSTGRES_PASSWORD=securepass \
  -v pg-new-data:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:17-alpine

# Import into new version
podman exec -i postgres-new psql -U postgres < /tmp/db_export.sql

# Verify and switch
podman stop postgres-old
podman rm postgres-old
podman stop postgres-new
podman run -d --name postgres -p 5432:5432 \
  -e POSTGRES_PASSWORD=securepass \
  -v pg-new-data:/var/lib/postgresql/data:Z \
  docker.io/library/postgres:17-alpine
```

## Running as a systemd Service

Create a Quadlet file for production database hosting:

```ini
# ~/.config/containers/systemd/postgres.container
[Container]
Image=docker.io/library/postgres:16-alpine
PublishPort=5432:5432
Environment=POSTGRES_PASSWORD=securepass
Volume=pgdata:/var/lib/postgresql/data:Z
AutoUpdate=registry

[Service]
Restart=always
TimeoutStartSec=60

[Install]
WantedBy=default.target
```

## Conclusion

Podman provides a solid foundation for database administration by combining container isolation with persistent storage, automated backups, and systemd integration. You get reproducible database environments, easy version management, and rootless security without sacrificing the tools and workflows you already know. Whether you run a single PostgreSQL instance or a replicated cluster, Podman keeps your databases portable and manageable.
