# How to Use wait-for-it and dockerize for Service Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, wait-for-it, dockerize, Service Dependencies, Startup Order, Networking

Description: Manage Docker service startup dependencies using wait-for-it and dockerize to ensure services are ready before your application starts.

---

Docker Compose's `depends_on` tells Docker which services to start first, but it does not wait for those services to be ready. A container being "started" and a service being "ready to accept connections" are two very different things. MySQL might take 30 seconds to initialize its data directory. PostgreSQL needs time to run recovery. Redis is fast, but even it is not instant.

When your application container starts before its database is ready, you get connection errors, crash loops, and wasted time debugging something that is purely a timing issue.

Two popular tools solve this problem: `wait-for-it` and `dockerize`. Both block your application startup until dependencies are actually accepting connections.

## The Problem in Detail

Consider this scenario:

```yaml
# This is NOT sufficient for reliable startup
services:
  app:
    build: .
    depends_on:
      - postgres
  postgres:
    image: postgres:16
```

Docker starts PostgreSQL first, then starts the app. But "starts" means Docker has created the container and begun running its entrypoint. PostgreSQL's entrypoint needs to initialize the database, run recovery, and begin listening on port 5432. That takes time. Your app container launches, tries to connect, and fails.

Docker Compose V2 supports health check conditions:

```yaml
# Better, but requires a health check on the dependency
services:
  app:
    depends_on:
      postgres:
        condition: service_healthy
  postgres:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 10
```

This works well, but sometimes you need more control at the application level, or you are using tools that do not support health check conditions. That is where wait-for-it and dockerize come in.

## wait-for-it

`wait-for-it` is a pure Bash script that waits for a TCP host and port to become available. It has zero dependencies beyond bash and common Unix utilities.

### Installing wait-for-it

Add it to your Dockerfile:

```dockerfile
# Download wait-for-it during the build
FROM python:3.11-slim

# Install wait-for-it from GitHub
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /usr/local/bin/wait-for-it
RUN chmod +x /usr/local/bin/wait-for-it

WORKDIR /app
COPY . .

CMD ["python", "app.py"]
```

Or copy it from a local file:

```dockerfile
# Copy wait-for-it from your project
COPY scripts/wait-for-it.sh /usr/local/bin/wait-for-it
RUN chmod +x /usr/local/bin/wait-for-it
```

### Using wait-for-it

The basic syntax is:

```bash
# Wait for a service, then run a command
wait-for-it host:port -- command args
```

In your Docker Compose file:

```yaml
# Wait for PostgreSQL before starting the app
services:
  app:
    build: .
    command: >
      wait-for-it postgres:5432 --timeout=60 --strict --
      python app.py
    depends_on:
      - postgres
```

### wait-for-it Options

```bash
# Wait up to 60 seconds for postgres, then run the app
wait-for-it postgres:5432 --timeout=60 --strict -- python app.py

# --timeout=60  : Give up after 60 seconds
# --strict      : Exit with error if timeout is reached (do not run the command)
# --quiet       : Suppress output messages

# Wait for multiple services sequentially
wait-for-it postgres:5432 --timeout=30 --strict -- \
wait-for-it redis:6379 --timeout=30 --strict -- \
python app.py
```

### wait-for-it in Entrypoint Scripts

```bash
#!/bin/bash
# entrypoint.sh - Wait for dependencies then start the app
set -euo pipefail

echo "Waiting for database..."
wait-for-it "$DB_HOST:${DB_PORT:-5432}" --timeout=60 --strict

echo "Waiting for Redis..."
wait-for-it "$REDIS_HOST:${REDIS_PORT:-6379}" --timeout=30 --strict

echo "Dependencies are ready, running migrations..."
python manage.py migrate

echo "Starting application..."
exec "$@"
```

```yaml
# Use the entrypoint script in Docker Compose
services:
  app:
    build: .
    entrypoint: ["/app/entrypoint.sh"]
    command: ["gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
```

## dockerize

`dockerize` is a compiled Go binary that does everything wait-for-it does, plus template rendering and log tailing. It is more feature-rich but slightly larger.

### Installing dockerize

```dockerfile
# Install dockerize from GitHub releases
FROM python:3.11-slim

ENV DOCKERIZE_VERSION=v0.7.0
RUN apt-get update && apt-get install -y --no-install-recommends wget && \
    wget -q "https://github.com/jwilder/dockerize/releases/download/${DOCKERIZE_VERSION}/dockerize-linux-amd64-${DOCKERIZE_VERSION}.tar.gz" && \
    tar -C /usr/local/bin -xzvf "dockerize-linux-amd64-${DOCKERIZE_VERSION}.tar.gz" && \
    rm "dockerize-linux-amd64-${DOCKERIZE_VERSION}.tar.gz" && \
    apt-get purge -y wget && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
```

### Using dockerize

```bash
# Wait for a single service
dockerize -wait tcp://postgres:5432 -timeout 60s python app.py

# Wait for multiple services
dockerize \
  -wait tcp://postgres:5432 \
  -wait tcp://redis:6379 \
  -wait http://config-service:8080/health \
  -timeout 120s \
  python app.py
```

Notice that dockerize can wait for HTTP endpoints, not just TCP ports. This is useful when a TCP connection succeeds but the service has not finished initializing.

### dockerize in Docker Compose

```yaml
# Wait for multiple dependencies with dockerize
services:
  app:
    build: .
    command: >
      dockerize
      -wait tcp://postgres:5432
      -wait tcp://redis:6379
      -wait http://elasticsearch:9200
      -timeout 120s
      python app.py
    depends_on:
      - postgres
      - redis
      - elasticsearch
```

### dockerize Template Rendering

One of dockerize's unique features is generating config files from templates at startup:

```bash
# Generate a config file from a template, then start the app
dockerize \
  -template /app/config.tmpl:/app/config.json \
  -wait tcp://postgres:5432 \
  -timeout 60s \
  node server.js
```

The template uses Go's text/template syntax:

```
// config.tmpl - Configuration template for dockerize
{
  "database": {
    "host": "{{ .Env.DB_HOST }}",
    "port": {{ default .Env.DB_PORT "5432" }},
    "name": "{{ .Env.DB_NAME }}",
    "user": "{{ .Env.DB_USER }}"
  },
  "redis": {
    "host": "{{ .Env.REDIS_HOST }}",
    "port": {{ default .Env.REDIS_PORT "6379" }}
  }
}
```

## Comparison: wait-for-it vs dockerize

| Feature | wait-for-it | dockerize |
|---------|-------------|-----------|
| Size | ~5 KB (bash script) | ~10 MB (Go binary) |
| Dependencies | bash, nc | None (static binary) |
| TCP wait | Yes | Yes |
| HTTP wait | No | Yes |
| Template rendering | No | Yes |
| Multiple waits | Chained | Single command |
| Alpine compatible | Needs bash | Works out of the box |

Use wait-for-it when you only need TCP checks and want a minimal footprint. Use dockerize when you need HTTP health checks, template rendering, or work with Alpine images that lack bash.

## Writing Your Own Wait Script

Sometimes you need custom readiness checks that go beyond TCP connectivity. Write your own:

```bash
#!/bin/bash
# wait-for-postgres.sh - Wait for PostgreSQL to accept queries
set -euo pipefail

HOST="${DB_HOST:-postgres}"
PORT="${DB_PORT:-5432}"
USER="${DB_USER:-postgres}"
TIMEOUT="${DB_TIMEOUT:-60}"
ELAPSED=0

echo "Waiting for PostgreSQL at $HOST:$PORT..."

while ! PGPASSWORD="$DB_PASSWORD" psql -h "$HOST" -p "$PORT" -U "$USER" -c "SELECT 1" > /dev/null 2>&1; do
    ELAPSED=$((ELAPSED + 1))
    if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
        echo "ERROR: PostgreSQL not ready after ${TIMEOUT}s" >&2
        exit 1
    fi
    sleep 1
done

echo "PostgreSQL is ready (took ${ELAPSED}s)"
```

This goes further than a TCP check. It actually runs a query, confirming that PostgreSQL is initialized and accepting connections.

## Health Check Alternative

Docker Compose V2's health check conditions are often the cleanest solution:

```yaml
# The recommended approach in Docker Compose V2
services:
  app:
    build: .
    command: python app.py
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 15
      start_period: 10s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
```

The `start_period` gives the service time to initialize before health checks count as failures. This approach moves the wait logic out of your application and into the infrastructure layer.

## Combining Approaches

For maximum reliability, use both health checks and application-level waits:

```yaml
# Belt and suspenders approach
services:
  app:
    build: .
    entrypoint: ["/app/entrypoint.sh"]
    command: ["python", "app.py"]
    depends_on:
      postgres:
        condition: service_healthy
```

```bash
#!/bin/bash
# entrypoint.sh - Additional wait with retry logic
set -euo pipefail

# Even though Compose waits for healthy, double-check from the app side
wait-for-it "$DB_HOST:$DB_PORT" --timeout=30 --strict

# Run migrations now that we are sure the DB is ready
python manage.py migrate

exec "$@"
```

## Summary

Service readiness is a real problem in containerized environments. `wait-for-it` gives you a lightweight TCP check with zero dependencies beyond bash. `dockerize` adds HTTP checks, template rendering, and works everywhere including Alpine. Docker Compose V2 health checks handle most cases natively. For production systems, combining health checks at the infrastructure level with application-level retry logic gives you the most reliable startup sequence.
