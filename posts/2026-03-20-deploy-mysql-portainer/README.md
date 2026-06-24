# How to Deploy MySQL via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, MySQL, Database, Docker, Deployment

Description: Learn how to deploy MySQL via Portainer with persistent data volumes, secure environment variable management, and proper backup strategies.

## MySQL via Portainer Stack

**Stacks → Add Stack → mysql**

```yaml
services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${MYSQL_DATABASE}
      - MYSQL_USER=${MYSQL_USER}
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
    volumes:
      # Persistent data (must survive container recreation)
      - mysql_data:/var/lib/mysql
      # Optional: custom config (use an absolute host path in Portainer's web editor)
      - /path/on/host/mysql-conf:/etc/mysql/conf.d:ro
      # Optional: initialization scripts (use an absolute host path in Portainer's web editor)
      - /path/on/host/init-scripts:/docker-entrypoint-initdb.d:ro
    ports:
      # Expose only on localhost for security
      - "127.0.0.1:3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

volumes:
  mysql_data:
    driver: local
```

## Environment Variables in Portainer

In the Portainer stack editor, under **Environment Variables**:

```text
MYSQL_ROOT_PASSWORD = a-very-strong-root-password
MYSQL_DATABASE = myapp
MYSQL_USER = appuser
MYSQL_PASSWORD = app-database-password
```

Avoid hardcoding passwords in the stack definition. For Docker Swarm deployments, prefer Docker secrets with MySQL's `*_FILE` variables for production credentials.

## MySQL Custom Configuration

Create `/path/on/host/mysql-conf/custom.cnf`:

```ini
[mysqld]
# InnoDB settings

innodb_buffer_pool_size = 256M
innodb_redo_log_capacity = 128M
innodb_flush_log_at_trx_commit = 2

# Connection settings
max_connections = 100
connect_timeout = 5
wait_timeout = 600

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/lib/mysql/slow.log
long_query_time = 2

# Binary logging for replication
# server-id = 1
# log-bin = mysql-bin
```

## Initialization Scripts

SQL scripts in the host directory mounted to `/docker-entrypoint-initdb.d/` run when MySQL initializes a fresh data directory:

```sql
-- /path/on/host/init-scripts/01-init.sql
CREATE DATABASE IF NOT EXISTS myapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON myapp.* TO 'appuser'@'%';

-- Create application tables
USE myapp;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Connecting to MySQL from Other Containers

Other services in the same stack connect using the service name:

```yaml
services:
  app:
    image: myapp:latest
    environment:
      - DB_HOST=mysql    # Service name
      - DB_PORT=3306
      - DB_NAME=${MYSQL_DATABASE}
      - DB_USER=${MYSQL_USER}
      - DB_PASSWORD=${MYSQL_PASSWORD}
    depends_on:
      mysql:
        condition: service_healthy
```

## Backup and Restore via Portainer

**Backup** using Portainer's exec:

```bash
# Via Portainer: Containers → your MySQL container → Console
mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" --all-databases > /tmp/backup.sql

# Copy out of container (from host)
docker cp <mysql-container-name>:/tmp/backup.sql /backup/mysql-$(date +%Y%m%d).sql
```

**Restore**:

```bash
docker cp /backup/mysql-20260320.sql <mysql-container-name>:/tmp/restore.sql
docker exec <mysql-container-name> sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" < /tmp/restore.sql'
```

## Verifying the Deployment

```bash
# Test connection by running the MySQL client inside the container
docker exec <mysql-container-name> sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES;"'

# Check data directory size
docker exec <mysql-container-name> du -sh /var/lib/mysql
```

## Conclusion

Deploying MySQL via Portainer is straightforward with Docker volumes ensuring data persistence. The critical best practices are avoiding hardcoded credentials in stack definitions and configuring the data volume correctly so data survives stack updates and container recreations.
