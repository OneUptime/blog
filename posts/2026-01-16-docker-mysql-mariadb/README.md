# How to Run MySQL and MariaDB in Docker with Proper Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, MySQL, MariaDB, Database, Containers

Description: Learn how to run MySQL and MariaDB in Docker with persistent storage, custom configuration, initialization scripts, and production-ready settings.

---

MySQL and MariaDB are among the most widely deployed databases. Running them in Docker requires understanding their configuration options, data persistence, and initialization mechanisms. This guide covers both databases as they share similar Docker image patterns.

## Quick Start

### MySQL

```bash
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=myapp \
  -e MYSQL_USER=myapp \
  -e MYSQL_PASSWORD=mypassword \
  -v mysql-data:/var/lib/mysql \
  -p 3306:3306 \
  mysql:8
```

### MariaDB

```bash
docker run -d \
  --name mariadb \
  -e MARIADB_ROOT_PASSWORD=rootpassword \
  -e MARIADB_DATABASE=myapp \
  -e MARIADB_USER=myapp \
  -e MARIADB_PASSWORD=mypassword \
  -v mariadb-data:/var/lib/mysql \
  -p 3306:3306 \
  mariadb:11
```

## Environment Variables

Both images use similar environment variables:

| MySQL Variable | MariaDB Variable | Purpose |
|---------------|------------------|---------|
| `MYSQL_ROOT_PASSWORD` | `MARIADB_ROOT_PASSWORD` | Root user password (required) |
| `MYSQL_DATABASE` | `MARIADB_DATABASE` | Create database on startup |
| `MYSQL_USER` | `MARIADB_USER` | Create user on startup |
| `MYSQL_PASSWORD` | `MARIADB_PASSWORD` | Password for created user |
| `MYSQL_ALLOW_EMPTY_PASSWORD` | `MARIADB_ALLOW_EMPTY_PASSWORD` | Allow empty root password |
| `MYSQL_RANDOM_ROOT_PASSWORD` | `MARIADB_RANDOM_ROOT_PASSWORD` | Generate random root password |

### Using Random Root Password

```bash
docker run -d \
  --name mysql \
  -e MYSQL_RANDOM_ROOT_PASSWORD=yes \
  mysql:8

# Find generated password in logs
docker logs mysql 2>&1 | grep "GENERATED ROOT PASSWORD"
```

## Docker Compose Configuration

### Basic MySQL Setup

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8
    container_name: mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql-data:
```

### Production MariaDB Setup

```yaml
version: '3.8'

services:
  mariadb:
    image: mariadb:11
    container_name: mariadb
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD_FILE: /run/secrets/db_root_password
      MARIADB_DATABASE: ${MARIADB_DATABASE}
      MARIADB_USER: ${MARIADB_USER}
      MARIADB_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_root_password
      - db_password
    volumes:
      - mariadb-data:/var/lib/mysql
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
      - ./my.cnf:/etc/mysql/conf.d/custom.cnf:ro
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
    networks:
      - backend

secrets:
  db_root_password:
    file: ./secrets/db_root_password.txt
  db_password:
    file: ./secrets/db_password.txt

networks:
  backend:
    internal: true

volumes:
  mariadb-data:
```

## Custom Configuration

### Using my.cnf

Create a custom configuration file for performance tuning.

```ini
# my.cnf
[mysqld]
# Connection settings
max_connections = 200
connect_timeout = 10

# Buffer pool (adjust based on available memory)
innodb_buffer_pool_size = 1G
innodb_buffer_pool_instances = 4

# Log files
innodb_log_file_size = 256M
innodb_log_buffer_size = 16M

# Query cache (deprecated in MySQL 8, use for MariaDB)
# query_cache_type = 1
# query_cache_size = 64M

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/lib/mysql/slow-query.log
long_query_time = 2

# Binary logging for replication
log_bin = mysql-bin
binlog_format = ROW
expire_logs_days = 7

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Timezone
default-time-zone = '+00:00'

[client]
default-character-set = utf8mb4
```

Mount the configuration:

```yaml
services:
  mysql:
    image: mysql:8
    volumes:
      - ./my.cnf:/etc/mysql/conf.d/custom.cnf:ro
      - mysql-data:/var/lib/mysql
```

### Command-Line Configuration

```yaml
services:
  mysql:
    image: mysql:8
    command:
      - --max-connections=200
      - --innodb-buffer-pool-size=512M
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
```

## Initialization Scripts

Scripts in `/docker-entrypoint-initdb.d/` run on first startup (empty data directory).

### SQL Script

```sql
-- init-scripts/01-schema.sql
USE myapp;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Shell Script

```bash
#!/bin/bash
# init-scripts/02-seed.sh
set -e

mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<-EOSQL
    USE myapp;
    INSERT INTO users (email) VALUES ('admin@example.com');
EOSQL
```

### Create Additional Databases

```bash
#!/bin/bash
# init-scripts/00-databases.sh
set -e

mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<-EOSQL
    CREATE DATABASE IF NOT EXISTS app_staging;
    CREATE DATABASE IF NOT EXISTS app_test;

    GRANT ALL PRIVILEGES ON app_staging.* TO '$MYSQL_USER'@'%';
    GRANT ALL PRIVILEGES ON app_test.* TO '$MYSQL_USER'@'%';

    FLUSH PRIVILEGES;
EOSQL
```

## Connecting to the Database

### From Host

```bash
# MySQL CLI
mysql -h 127.0.0.1 -P 3306 -u myapp -p myapp

# Connection string
mysql://myapp:password@127.0.0.1:3306/myapp
```

### From Another Container

```yaml
services:
  mysql:
    image: mysql:8
    networks:
      - app-network

  app:
    image: my-app
    environment:
      DATABASE_URL: mysql://myapp:password@mysql:3306/myapp
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - app-network

networks:
  app-network:
```

### Interactive Shell

```bash
# MySQL/MariaDB shell
docker exec -it mysql mysql -u root -p

# Specific database
docker exec -it mysql mysql -u myapp -p myapp
```

## Backup and Restore

### Create Backup

```bash
# Full backup with mysqldump
docker exec mysql mysqldump -u root -p"$PASSWORD" --all-databases > backup.sql

# Single database
docker exec mysql mysqldump -u root -p"$PASSWORD" myapp > myapp.sql

# With compression
docker exec mysql mysqldump -u root -p"$PASSWORD" myapp | gzip > myapp.sql.gz

# Schema only
docker exec mysql mysqldump -u root -p"$PASSWORD" --no-data myapp > schema.sql

# Data only
docker exec mysql mysqldump -u root -p"$PASSWORD" --no-create-info myapp > data.sql
```

### Restore Backup

```bash
# Restore full backup
docker exec -i mysql mysql -u root -p"$PASSWORD" < backup.sql

# Restore single database
docker exec -i mysql mysql -u root -p"$PASSWORD" myapp < myapp.sql

# Restore compressed backup
gunzip -c myapp.sql.gz | docker exec -i mysql mysql -u root -p"$PASSWORD" myapp
```

### Automated Backup Service

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8
    volumes:
      - mysql-data:/var/lib/mysql

  backup:
    image: mysql:8
    volumes:
      - ./backups:/backups
    environment:
      MYSQL_HOST: mysql
      MYSQL_USER: root
      MYSQL_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    entrypoint: |
      sh -c 'while true; do
        mysqldump -h $$MYSQL_HOST -u $$MYSQL_USER -p"$$MYSQL_PASSWORD" \
          --all-databases | gzip > /backups/backup-$$(date +%Y%m%d-%H%M%S).sql.gz
        find /backups -name "*.sql.gz" -mtime +7 -delete
        sleep 86400
      done'
    depends_on:
      - mysql

volumes:
  mysql-data:
```

## MySQL 8 Specific Configuration

### Authentication Plugin

MySQL 8 uses `caching_sha2_password` by default. For compatibility with older clients:

```yaml
services:
  mysql:
    image: mysql:8
    command:
      - --default-authentication-plugin=mysql_native_password
```

Or in my.cnf:
```ini
[mysqld]
default-authentication-plugin=mysql_native_password
```

### Lowercase Table Names

```yaml
services:
  mysql:
    image: mysql:8
    command:
      - --lower-case-table-names=1
```

**Note**: This must be set before initialization. It can't be changed after the data directory is created.

## Health Checks

### MySQL

```yaml
services:
  mysql:
    image: mysql:8
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

### MariaDB (Built-in Healthcheck)

```yaml
services:
  mariadb:
    image: mariadb:11
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Performance Tuning

### Memory-Based Configuration

| Container Memory | innodb_buffer_pool_size | max_connections |
|-----------------|------------------------|-----------------|
| 512MB | 256MB | 50 |
| 1GB | 512MB | 100 |
| 2GB | 1GB | 150 |
| 4GB | 2.5GB | 200 |

### Example Tuned Configuration

```ini
# For 2GB container
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
max_connections = 150
table_open_cache = 400
thread_cache_size = 16
```

## Troubleshooting

### Check Logs

```bash
docker logs mysql
docker logs --tail 100 -f mysql
```

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Container exits immediately | Missing required env vars | Set MYSQL_ROOT_PASSWORD |
| Can't connect from host | Not binding to 0.0.0.0 | Check bind-address config |
| Authentication failed | Wrong password or auth plugin | Check password and authentication plugin |
| Data lost after restart | No volume configured | Add volume for /var/lib/mysql |
| Slow startup | Large innodb_log_file_size change | Delete ib_logfile* and restart |

### Debug Mode

```bash
# Run with verbose logging
docker run -it \
  -e MYSQL_ROOT_PASSWORD=test \
  mysql:8 \
  --verbose --help
```

## Summary

| Setting | Development | Production |
|---------|-------------|------------|
| Root password | Environment variable | Docker secret |
| Port exposure | 3306:3306 | Internal network only |
| Volume | Named or bind mount | Named volume |
| Buffer pool | Default | 50-75% of memory |
| Logging | Minimal | Slow query + binary logs |
| Backups | Manual | Automated |
| Health check | Optional | Required |

Both MySQL and MariaDB work well in Docker when properly configured. Always use volumes for data persistence, secrets for passwords, and appropriate health checks for orchestration compatibility.
