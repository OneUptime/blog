# How to Create a Docker Compose File for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Docker, Docker Compose, Container, Configuration

Description: Write a production-ready Docker Compose file for MySQL with persistent volumes, environment configuration, health checks, and a named network for connected services.

---

## Basic Docker Compose Structure

A minimal `docker-compose.yml` for MySQL:

```yaml
version: "3.9"

services:
  mysql:
    image: mysql:8.0
    container_name: mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_secret
      MYSQL_DATABASE: myapp
      MYSQL_USER: appuser
      MYSQL_PASSWORD: app_secret
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - backend

volumes:
  mysql_data:

networks:
  backend:
```

Start MySQL:

```bash
docker compose up -d
```

## Adding a Health Check

Docker's health check marks the container as unhealthy if MySQL fails to accept connections:

```yaml
services:
  mysql:
    image: mysql:8.0
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost",
             "-u", "root", "-proot_secret"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

Dependent services can wait for MySQL to be healthy:

```yaml
  app:
    image: myapp:latest
    depends_on:
      mysql:
        condition: service_healthy
```

## Using Secrets Instead of Environment Variables

For better security, use Docker secrets rather than plain environment variable passwords:

```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/mysql_root_password
      MYSQL_PASSWORD_FILE: /run/secrets/mysql_app_password
    secrets:
      - mysql_root_password
      - mysql_app_password

secrets:
  mysql_root_password:
    file: ./secrets/mysql_root_password.txt
  mysql_app_password:
    file: ./secrets/mysql_app_password.txt
```

## Customizing MySQL Configuration

Mount a custom `my.cnf` for tuning:

```yaml
volumes:
  - ./my.cnf:/etc/mysql/conf.d/custom.cnf:ro
  - mysql_data:/var/lib/mysql
```

Create `./my.cnf`:

```ini
[mysqld]
innodb_buffer_pool_size = 512M
max_connections = 200
slow_query_log = 1
long_query_time = 1
```

## Full Example with App and Adminer

```yaml
version: "3.9"

services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_secret
      MYSQL_DATABASE: myapp
      MYSQL_USER: appuser
      MYSQL_PASSWORD: app_secret
    volumes:
      - mysql_data:/var/lib/mysql
      - ./my.cnf:/etc/mysql/conf.d/custom.cnf:ro
    networks:
      - backend
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  adminer:
    image: adminer:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    networks:
      - backend
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  mysql_data:

networks:
  backend:
```

## Useful Commands

```bash
# View logs
docker compose logs -f mysql

# Access MySQL shell
docker compose exec mysql mysql -u root -proot_secret

# Stop and remove containers (keep volumes)
docker compose down

# Stop and remove everything including volumes
docker compose down -v
```

## Summary

A well-structured Docker Compose file for MySQL uses named volumes for data persistence, a health check to signal readiness, a custom `my.cnf` for tuning, and secrets for passwords in production. Connecting dependent services with `depends_on` and `condition: service_healthy` ensures your application only starts after MySQL is ready to accept connections.
