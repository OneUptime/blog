# How to Implement Docker Compose Service Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, DevOps, Containers

Description: Learn how to properly configure service dependencies in Docker Compose with health checks and startup ordering.

---

When building multi-container applications with Docker Compose, managing service dependencies becomes critical. Your web application might need a database to be fully operational before it can accept connections. This guide covers everything you need to know about implementing robust service dependencies in Docker Compose.

## Understanding depends_on Basics

The `depends_on` directive is the simplest way to define service dependencies in Docker Compose. It ensures that dependent services start in the correct order.

```yaml
version: "3.8"
services:
  web:
    image: my-web-app
    depends_on:
      - db
      - redis

  db:
    image: postgres:15

  redis:
    image: redis:7
```

In this example, Docker Compose will start `db` and `redis` before starting `web`. However, there is a critical caveat: `depends_on` only waits for containers to start, not for services inside them to be ready. This is where the distinction between startup ordering and readiness becomes important.

## Startup Ordering vs Readiness

Starting a container is not the same as the service being ready to accept connections. A PostgreSQL container might take several seconds to initialize its database before accepting queries. If your application tries to connect immediately after the container starts, it will fail.

Docker Compose v3 introduced conditions with health checks to address this problem, providing true readiness verification rather than simple startup ordering.

## Using condition: service_healthy

The `service_healthy` condition ensures a dependent service only starts after the dependency passes its health check.

```yaml
version: "3.8"
services:
  web:
    image: my-web-app
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

The health check configuration options are:
- `test`: The command to run for checking health
- `interval`: Time between health checks
- `timeout`: Maximum time allowed for a health check
- `retries`: Number of consecutive failures needed to mark unhealthy
- `start_period`: Grace period for container initialization

## Custom Health Checks

For services without built-in health check commands, you can create custom checks.

```yaml
services:
  api:
    build: ./api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s

  elasticsearch:
    image: elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9200/_cluster/health | grep -q '\"status\":\"green\"\\|\"status\":\"yellow\"'"]
      interval: 10s
      timeout: 10s
      retries: 10
      start_period: 60s
```

## Wait-for Scripts

For more complex scenarios, wait-for scripts provide additional flexibility. These scripts actively poll services until they become available.

```yaml
services:
  web:
    build: ./web
    command: ["./wait-for-it.sh", "db:5432", "--", "python", "app.py"]
    depends_on:
      - db

  db:
    image: postgres:15
```

A simple wait-for script in bash:

```bash
#!/bin/bash
# wait-for-it.sh
host="$1"
shift
port="$1"
shift

until nc -z "$host" "$port"; do
  echo "Waiting for $host:$port..."
  sleep 2
done

echo "$host:$port is available"
exec "$@"
```

You can also use established tools like `wait-for-it`, `dockerize`, or `wait-for` which handle edge cases and provide additional features.

## Best Practices

**1. Always use health checks for critical dependencies.** Relying solely on `depends_on` without conditions leads to race conditions and intermittent failures.

**2. Set appropriate start_period values.** Give slow-starting services like databases and Elasticsearch enough time to initialize before health checks begin failing.

**3. Use specific health check commands.** Instead of generic TCP checks, use application-specific commands like `pg_isready` for PostgreSQL or `redis-cli ping` for Redis.

**4. Implement health endpoints in your applications.** Create dedicated `/health` or `/ready` endpoints that verify all internal components are operational.

**5. Consider using service_started for non-critical dependencies.** If a dependency is not essential for startup, use `condition: service_started` to avoid blocking.

```yaml
depends_on:
  db:
    condition: service_healthy
  metrics-collector:
    condition: service_started
```

**6. Handle connection failures gracefully in your application.** Even with proper dependencies, implement retry logic in your application code for resilience against transient failures.

## Conclusion

Proper service dependency management in Docker Compose requires understanding the difference between container startup and service readiness. By combining `depends_on` with health checks and the `service_healthy` condition, you can create reliable multi-container applications that start in the correct order and only proceed when dependencies are truly ready to accept connections.
