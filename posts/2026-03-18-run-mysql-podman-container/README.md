# How to Run MySQL in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, MySQL, Database, SQL

Description: Learn how to run MySQL in a Podman container with persistent storage, custom configuration, and secure access.

---

> Running MySQL in Podman gives you an isolated, reproducible database environment with persistent data and rootless security.

MySQL is the world's most popular open-source relational database. Running it in a Podman container simplifies setup, ensures consistency across environments, and makes it easy to spin up disposable database instances for development and testing. This guide covers pulling the image, configuring persistence, setting up custom configurations, and connecting to your database.

---

## Pulling the MySQL Image

Download the official MySQL image.

```bash
# Pull the official MySQL 8.4 LTS image

podman pull docker.io/library/mysql:8.4

# Verify the image
podman images | grep mysql
```

## Running a Basic MySQL Container

Start MySQL with a root password and default settings.

```bash
# Run MySQL with a root password set via environment variable
podman run -d \
  --name my-mysql \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=my-secret-password \
  docker.io/library/mysql:8.4

# Check that the container is running
podman ps

# Wait a few seconds for MySQL to initialize, then test the connection
podman exec -it my-mysql mysql -uroot -pmy-secret-password -e "SELECT VERSION();"
```

## Using Persistent Storage

Ensure your database data survives container restarts and removal.

```bash
# Create a named volume for MySQL data
podman volume create mysql-data

# Run MySQL with the named volume mounted to the data directory
podman run -d \
  --name mysql-persistent \
  -p 3307:3306 \
  -e MYSQL_ROOT_PASSWORD=my-secret-password \
  -v mysql-data:/var/lib/mysql:Z \
  docker.io/library/mysql:8.4

# Verify the volume is in use
podman volume inspect mysql-data
```

## Creating a Database and User on Startup

Use environment variables to automatically create a database and user.

```bash
# Run MySQL with a pre-created database and user
podman volume create mysql-app-data

podman run -d \
  --name mysql-app \
  -p 3308:3306 \
  -e MYSQL_ROOT_PASSWORD=root-secret \
  -e MYSQL_DATABASE=myapp \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=app-secret \
  -v mysql-app-data:/var/lib/mysql:Z \
  docker.io/library/mysql:8.4

# Connect as the new user and verify the database exists
podman exec -it mysql-app mysql -uappuser -papp-secret myapp -e "SHOW TABLES;"
```

## Custom MySQL Configuration

Mount a custom configuration file to tune MySQL settings.

```bash
# Create a directory for custom MySQL config
mkdir -p ~/mysql-config

# Write a custom configuration file
cat > ~/mysql-config/custom.cnf <<'EOF'
[mysqld]
# Performance tuning
innodb_buffer_pool_size = 256M
max_connections = 200

# Character set and collation
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Logging
slow_query_log = 1
slow_query_log_file = /var/lib/mysql/slow.log
long_query_time = 2

# Binary logging for replication readiness
log-bin = mysql-bin
server-id = 1
EOF

# Run MySQL with the custom configuration
podman volume create mysql-tuned-data

podman run -d \
  --name mysql-tuned \
  -p 3309:3306 \
  -e MYSQL_ROOT_PASSWORD=my-secret-password \
  -v ~/mysql-config/custom.cnf:/etc/mysql/conf.d/custom.cnf:Z \
  -v mysql-tuned-data:/var/lib/mysql:Z \
  docker.io/library/mysql:8.4

# Verify the custom settings are loaded
podman exec -it mysql-tuned mysql -uroot -pmy-secret-password \
  -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"
```

## Running Initialization Scripts

Execute SQL scripts automatically when the container starts for the first time.

```bash
# Create an initialization script
mkdir -p ~/mysql-init

cat > ~/mysql-init/01-schema.sql <<'EOF'
-- Create the application schema
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, email) VALUES
    ('admin', 'admin@example.com'),
    ('testuser', 'test@example.com');
EOF

# Run MySQL with the init script mounted
podman run -d \
  --name mysql-init \
  -p 3310:3306 \
  -e MYSQL_ROOT_PASSWORD=my-secret-password \
  -e MYSQL_DATABASE=myapp \
  -v ~/mysql-init:/docker-entrypoint-initdb.d:Z \
  docker.io/library/mysql:8.4
```

## Backup and Restore

Create and restore database backups from a running container.

```bash
# Dump the entire database to a file on the host
podman exec my-mysql mysqldump -uroot -pmy-secret-password --all-databases > ~/mysql-backup.sql

# Restore a backup into a running container
podman exec -i my-mysql mysql -uroot -pmy-secret-password < ~/mysql-backup.sql
```

## Managing the MySQL Container

Common management operations.

```bash
# View MySQL logs
podman logs my-mysql

# Stop MySQL gracefully
podman stop my-mysql

# Start it again
podman start my-mysql

# Remove the container
podman rm -f my-mysql

# Clean up the volume if no longer needed
podman volume rm mysql-data mysql-app-data mysql-tuned-data
```

## Summary

Running MySQL in a Podman container gives you a portable, isolated database that is easy to configure and manage. Named volumes ensure your data persists across container lifecycle events, while custom configuration files let you tune performance for your workload. Initialization scripts automate schema creation, and backups are straightforward with mysqldump. Podman's rootless execution adds a layer of security, making this setup suitable for both development and staging environments.
