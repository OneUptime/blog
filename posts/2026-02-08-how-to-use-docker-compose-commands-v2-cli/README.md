# How to Use docker compose Commands (v2 CLI)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Multi-Container Applications, Container Orchestration, DevOps

Description: A comprehensive guide to Docker Compose v2 CLI commands for defining, running, and managing multi-container applications.

---

Docker Compose v2 is the modern replacement for the older `docker-compose` standalone binary. It integrates directly into the Docker CLI as `docker compose` (note the space instead of hyphen). This version is faster, supports more features, and aligns with Docker's plugin architecture.

If you are still using `docker-compose`, now is the time to switch. Docker Compose v2 ships with Docker Desktop and is available as a CLI plugin on Linux.

## Compose v1 vs v2

The most visible change is the command syntax. The old `docker-compose up` becomes `docker compose up`. Functionally, v2 supports the same Compose file format with added features like profiles, GPU resources, and enhanced dependency management.

Verify your Compose version:

```bash
docker compose version
```

## Starting Services

The `up` command is the workhorse of Compose. It reads your `docker-compose.yml`, creates networks and volumes, pulls images, and starts containers.

Start all services defined in docker-compose.yml in detached mode:

```bash
docker compose up -d
```

Start specific services only:

```bash
docker compose up -d api worker
```

Start services and force rebuild of images:

```bash
docker compose up -d --build
```

Start with a specific compose file:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Combine multiple compose files (later files override earlier ones):

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

Scale a specific service to multiple replicas:

```bash
docker compose up -d --scale worker=3
```

Force recreate containers even if configuration has not changed:

```bash
docker compose up -d --force-recreate
```

Start without recreating containers that already exist and have not changed:

```bash
docker compose up -d --no-recreate
```

## Stopping Services

Stop and remove all containers, networks, and volumes created by `up`:

```bash
docker compose down
```

Stop and also remove volumes (careful, this deletes data):

```bash
docker compose down -v
```

Stop and remove everything including images:

```bash
docker compose down --rmi all
```

Stop containers without removing them:

```bash
docker compose stop
```

Stop a specific service:

```bash
docker compose stop worker
```

## Listing and Inspecting

List running containers for the current Compose project:

```bash
docker compose ps
```

Include stopped containers:

```bash
docker compose ps -a
```

Show output in JSON format:

```bash
docker compose ps --format json
```

List all images used by services:

```bash
docker compose images
```

Show the resolved Compose configuration (useful for debugging variable substitution):

```bash
docker compose config
```

Validate the compose file without starting anything:

```bash
docker compose config --quiet
```

## Viewing Logs

View logs from all services:

```bash
docker compose logs
```

Follow logs in real time:

```bash
docker compose logs -f
```

View logs for specific services:

```bash
docker compose logs -f api worker
```

Show only the last 50 lines:

```bash
docker compose logs --tail 50
```

Show timestamps:

```bash
docker compose logs -t
```

Show logs since a specific time:

```bash
docker compose logs --since 30m
```

## Executing Commands

Run a command in a running service container:

```bash
docker compose exec api /bin/bash
```

Run a one-off command (creates a new container):

```bash
docker compose run --rm api python manage.py migrate
```

The difference between `exec` and `run` is important. `exec` attaches to an existing running container. `run` creates a new container from the service definition. Use `run` for one-off tasks like migrations, tests, and scripts.

Run without starting linked services:

```bash
docker compose run --rm --no-deps api python manage.py test
```

Run with different environment variables:

```bash
docker compose run --rm -e DEBUG=true api python manage.py shell
```

## Building Images

Build all service images:

```bash
docker compose build
```

Build a specific service:

```bash
docker compose build api
```

Build without cache:

```bash
docker compose build --no-cache
```

Build with build arguments:

```bash
docker compose build --build-arg NODE_ENV=production api
```

Pull images for services that use pre-built images:

```bash
docker compose pull
```

## Working with Profiles

Profiles let you selectively start services. This is useful for development tools, debugging containers, or optional services.

Define profiles in your compose file:

```yaml
# docker-compose.yml
services:
  api:
    image: my-api:latest
    ports:
      - "3000:3000"

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret

  # Only starts when the "debug" profile is active
  adminer:
    image: adminer:latest
    ports:
      - "8080:8080"
    profiles:
      - debug

  # Only starts when the "monitoring" profile is active
  prometheus:
    image: prom/prometheus:latest
    profiles:
      - monitoring
```

Start services with a specific profile enabled:

```bash
docker compose --profile debug up -d
```

Start with multiple profiles:

```bash
docker compose --profile debug --profile monitoring up -d
```

## Health Checks and Dependencies

Compose v2 supports `depends_on` with health check conditions.

A compose file with health-check-based service dependencies:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    image: my-api:latest
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:secret@db:5432/myapp
```

The API container will not start until the database passes its health check. This prevents connection errors during startup.

## Watching for Changes

Compose v2 includes a `watch` command for development that automatically rebuilds and restarts services when source files change.

Enable file watching for live development:

```bash
docker compose watch
```

Configure watch in your compose file:

```yaml
services:
  api:
    build: ./api
    develop:
      watch:
        - action: sync
          path: ./api/src
          target: /app/src
        - action: rebuild
          path: ./api/package.json
```

The `sync` action copies changed files into the container. The `rebuild` action triggers a full image rebuild when the specified file changes.

## Environment Variables

Compose reads `.env` files automatically from the project directory.

Set environment file explicitly:

```bash
docker compose --env-file .env.production up -d
```

View the resolved environment for a service:

```bash
docker compose config | grep -A 20 "api:"
```

## Practical Example: Full Development Stack

Here is a complete Compose file for a typical web application development environment:

```yaml
# docker-compose.yml
version: "3.8"

services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:secret@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./api/src:/app/src
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  worker:
    build:
      context: ./api
      dockerfile: Dockerfile
    command: node worker.js
    environment:
      - DATABASE_URL=postgresql://postgres:secret@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  pgdata:
  redis-data:
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker compose up` | Create and start services |
| `docker compose down` | Stop and remove services |
| `docker compose ps` | List running services |
| `docker compose logs` | View service logs |
| `docker compose exec` | Run command in running service |
| `docker compose run` | Run one-off command |
| `docker compose build` | Build service images |
| `docker compose pull` | Pull service images |
| `docker compose config` | Validate and view config |
| `docker compose watch` | File watching for development |
| `docker compose stop` | Stop services |
| `docker compose restart` | Restart services |

## Conclusion

Docker Compose v2 streamlines multi-container application development. The `up` and `down` commands handle the full lifecycle. Profiles let you keep optional services dormant until needed. Health check dependencies prevent race conditions during startup. The watch command replaces external file-watching tools. Migrate from v1 by simply replacing `docker-compose` with `docker compose` in your scripts and CI pipelines. The new CLI is faster and more reliable.
