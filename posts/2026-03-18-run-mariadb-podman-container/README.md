# How to Run MariaDB in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, MariaDB, Database, SQL

Description: Learn how to run MariaDB in a Podman container with persistent storage, custom tuning, and automated initialization.

---

> MariaDB in Podman provides a MySQL-compatible database engine that can run securely in a rootless container with full data persistence.

MariaDB is a community-developed fork of MySQL that offers improved performance, additional storage engines, and broad MySQL compatibility. Running it inside a Podman container gives you a portable, consistent database that is quick to set up and easy to manage. This guide covers basic usage, persistence, custom configuration, and initialization scripts.

---

## Pulling the MariaDB Image

Download the official MariaDB image.

```bash
# Pull the MariaDB 11 image

podman pull docker.io/library/mariadb:11

# Verify the image is available
podman images | grep mariadb
```

## Running a Basic MariaDB Container

Launch MariaDB with a root password.

```bash
# Start MariaDB with a root password
podman run -d \
  --name my-mariadb \
  -p 3306:3306 \
  -e MARIADB_ROOT_PASSWORD=my-secret-password \
  mariadb:11

# Check the container is running
podman ps

# Test the connection
podman exec -it my-mariadb mariadb -uroot -pmy-secret-password -e "SELECT VERSION();"
```

## Persistent Data Storage

Use a named volume to keep data across container lifecycle.

```bash
# Create a named volume for MariaDB data
podman volume create mariadb-data

# Run MariaDB with persistent storage
podman run -d \
  --name mariadb-persistent \
  -p 3307:3306 \
  -e MARIADB_ROOT_PASSWORD=my-secret-password \
  -v mariadb-data:/var/lib/mysql:Z \
  mariadb:11

# Verify the volume is attached
podman volume inspect mariadb-data
```

## Creating a Database and User Automatically

Use environment variables to set up application credentials.

```bash
# Run MariaDB with a pre-created database and user
podman volume create mariadb-app-data

podman run -d \
  --name mariadb-app \
  -p 3308:3306 \
  -e MARIADB_ROOT_PASSWORD=root-secret \
  -e MARIADB_DATABASE=myapp \
  -e MARIADB_USER=appuser \
  -e MARIADB_PASSWORD=app-secret \
  -v mariadb-app-data:/var/lib/mysql:Z \
  mariadb:11

# Connect as the application user
podman exec -it mariadb-app mariadb -uappuser -papp-secret myapp -e "SHOW TABLES;"
```

## Custom MariaDB Configuration

Mount a custom configuration file for performance tuning.

```bash
# Create a config directory
mkdir -p ~/mariadb-config

# Write a custom MariaDB configuration
cat > ~/mariadb-config/custom.cnf <<'EOF'
[mariadb]
# Performance settings
innodb_buffer_pool_size = 256M
max_connections = 200
thread_cache_size = 16

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Logging
slow_query_log = 1
slow_query_log_file = /var/lib/mysql/slow.log
long_query_time = 2

# InnoDB settings
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 2
EOF

# Run MariaDB with custom config
podman volume create mariadb-tuned-data

podman run -d \
  --name mariadb-tuned \
  -p 3309:3306 \
  -e MARIADB_ROOT_PASSWORD=my-secret-password \
  -v ~/mariadb-config/custom.cnf:/etc/mysql/conf.d/custom.cnf:Z \
  -v mariadb-tuned-data:/var/lib/mysql:Z \
  mariadb:11

# Verify custom settings
podman exec -it mariadb-tuned mariadb -uroot -pmy-secret-password \
  -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"
```

## Initialization Scripts

Run SQL scripts automatically on first container startup.

```bash
# Create an init directory
mkdir -p ~/mariadb-init

# Write an initialization script
cat > ~/mariadb-init/01-schema.sql <<'EOF'
-- Create application tables
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email) VALUES
    ('admin', 'admin@example.com'),
    ('testuser', 'test@example.com');
EOF

# Run MariaDB with init scripts
podman run -d \
  --name mariadb-init \
  -p 3310:3306 \
  -e MARIADB_ROOT_PASSWORD=my-secret-password \
  -e MARIADB_DATABASE=myapp \
  -v ~/mariadb-init:/docker-entrypoint-initdb.d:Z \
  mariadb:11
```

## Backup and Restore

Create and restore MariaDB backups.

```bash
# Dump all databases to a SQL file
podman exec my-mariadb mariadb-dump -uroot -pmy-secret-password --all-databases > ~/mariadb-backup.sql

# Restore from backup
podman exec -i my-mariadb mariadb -uroot -pmy-secret-password < ~/mariadb-backup.sql
```

## Managing the Container

Common management commands.

```bash
# View MariaDB logs
podman logs my-mariadb

# Stop and start
podman stop my-mariadb
podman start my-mariadb

# Remove containers and volumes
podman rm -f my-mariadb mariadb-persistent mariadb-app mariadb-tuned mariadb-init
podman volume rm mariadb-data mariadb-app-data mariadb-tuned-data
```

## Summary

Running MariaDB in a Podman container delivers a MySQL-compatible database engine with easy setup and management. Named volumes ensure data persistence, custom configuration files let you tune performance, and initialization scripts automate schema setup. MariaDB's additional features like Aria storage engine and thread pool are all available inside the container. When you run Podman rootless, it provides extra security, making this a solid choice for development databases and staging environments.
