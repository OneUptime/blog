# How to Set Up Docker Compose on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Docker Compose, Containers, Multi-Container, DevOps

Description: Learn how to install and use Docker Compose on RHEL to define and run multi-container applications.

---

Docker Compose allows you to define multi-container applications in a YAML file and manage them as a single unit. Docker Compose V2 is now a Docker CLI plugin and comes bundled with Docker CE.

## Installing Docker Compose

If you installed Docker CE with the compose plugin, it is already available:

```bash
# Verify Docker Compose is installed
docker compose version

# If not installed, add the plugin
sudo dnf install -y docker-compose-plugin
```

## Creating a Compose File

```yaml
# docker-compose.yml - A web app with Redis and PostgreSQL
services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      - api
    restart: unless-stopped

  api:
    build: ./api
    environment:
      - DATABASE_URL=postgresql://appuser:secret@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  cache:
    image: redis:7
    volumes:
      - redisdata:/data
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
```

## Managing Compose Applications

```bash
# Start all services in the background
docker compose up -d

# View running services
docker compose ps

# View logs
docker compose logs -f
docker compose logs -f api

# Stop all services
docker compose down

# Stop and remove volumes (destroys data)
docker compose down -v
```

## Building and Rebuilding

```bash
# Build images defined in the compose file
docker compose build

# Force rebuild without cache
docker compose build --no-cache

# Build and start
docker compose up -d --build
```

## Scaling Services

```bash
# Run 3 instances of the api service
docker compose up -d --scale api=3
```

## Using Environment Files

```bash
# Create a .env file
cat << 'ENV' > .env
POSTGRES_USER=appuser
POSTGRES_PASSWORD=secret
POSTGRES_DB=myapp
NGINX_PORT=8080
ENV
```

```yaml
# Reference in docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
  web:
    image: nginx:latest
    ports:
      - "${NGINX_PORT}:80"
```

## Production Tips

```bash
# Use profiles for different environments
docker compose --profile monitoring up -d

# Execute commands in running containers
docker compose exec db psql -U appuser -d myapp

# View resource usage
docker compose top
docker stats
```

Always use named volumes for persistent data and health checks for dependencies. The `depends_on` with `condition: service_healthy` ensures your application waits for the database to be ready before starting.
