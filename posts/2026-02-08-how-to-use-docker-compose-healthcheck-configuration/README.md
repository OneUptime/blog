# How to Use Docker Compose healthcheck Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Healthcheck, Container Orchestration, DevOps, Monitoring

Description: Learn how to configure Docker Compose healthcheck directives to monitor container health and build resilient service deployments.

---

Running containers without health checks is like flying blind. Your container might be up, but is the application inside actually working? Docker Compose healthcheck configuration solves this problem by letting you define tests that verify your services are truly functional, not just running.

## What Is a Docker Compose Healthcheck?

A healthcheck in Docker Compose is a command that runs periodically inside a container to determine whether the service is healthy. Docker tracks the results and marks the container as `healthy`, `unhealthy`, or `starting`. Other services can depend on this health status, which makes your entire stack more reliable.

The healthcheck directive supports several parameters:

- **test** - The command to run inside the container
- **interval** - How often to run the check (default: 30s)
- **timeout** - How long to wait before considering the check failed (default: 30s)
- **retries** - Number of consecutive failures before marking unhealthy (default: 3)
- **start_period** - Grace period for container initialization (default: 0s)
- **start_interval** - Interval between checks during the start period (added in newer versions)

## Basic Healthcheck Syntax

Here is a minimal healthcheck for a web server that verifies the HTTP endpoint responds.

```yaml
# docker-compose.yml - Basic healthcheck for an Nginx service
version: "3.8"

services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

The `test` field accepts three formats. The first uses the shell form.

```yaml
# Shell form - runs in /bin/sh -c
healthcheck:
  test: curl -f http://localhost/ || exit 1
```

The second uses the exec form with CMD.

```yaml
# Exec form - runs the command directly without a shell
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/"]
```

The third uses CMD-SHELL, which combines the exec syntax with shell execution.

```yaml
# CMD-SHELL form - explicit shell execution in exec syntax
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
```

I recommend CMD-SHELL for most cases. It gives you the explicit syntax of the exec form while still allowing shell features like pipes and logical operators.

## Healthchecks for Common Services

### PostgreSQL Database

Database healthchecks should verify the database accepts connections, not just that the process is alive.

```yaml
# PostgreSQL healthcheck using pg_isready
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secretpass
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

### Redis Cache

Redis ships with a built-in ping command that works perfectly for health checks.

```yaml
# Redis healthcheck using redis-cli ping
services:
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### MySQL Database

For MySQL, use `mysqladmin ping` to verify the server is accepting connections.

```yaml
# MySQL healthcheck using mysqladmin
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpass"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

### Custom Application

For your own application, write a dedicated health endpoint that checks all critical dependencies.

```yaml
# Custom Node.js app with a /health endpoint
services:
  api:
    build: ./api
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 3
      start_period: 20s
```

Note that this example uses `wget` instead of `curl`. Many lightweight container images (especially Alpine-based) include `wget` but not `curl`. Always verify which tools are available in your base image.

## Using Healthchecks with Service Dependencies

One of the most powerful uses of healthchecks is controlling service startup order. The `depends_on` directive with a `condition` field lets you wait for a service to be healthy before starting another.

```yaml
# Full stack with dependency conditions based on health
version: "3.8"

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secretpass
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 15s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3

  api:
    build: ./api
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:secretpass@postgres/myapp
      REDIS_URL: redis://redis:6379
```

With this configuration, Docker Compose will start `postgres` and `redis` first, wait for both to report healthy, and only then start the `api` service. This eliminates the old pattern of adding sleep commands or retry loops in your application startup scripts.

## Tuning Healthcheck Parameters

Getting the timing right matters. Here is a breakdown of how to think about each parameter.

**interval** controls how often Docker runs the health check. Set it short enough to detect failures quickly, but not so short that you waste CPU on a busy system. For most services, 10-30 seconds works well.

**timeout** should be shorter than your interval. If a health check takes longer than this, Docker kills the check process and counts it as a failure.

**retries** prevents false positives from transient failures. Three retries is a solid default. For flaky services, increase it to 5.

**start_period** gives your container time to initialize before Docker starts counting failures. This is critical for applications that take time to boot, like Java applications or services that run database migrations on startup.

```yaml
# Tuned healthcheck for a Java application with slow startup
services:
  java-api:
    image: my-spring-app:latest
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 120s
```

## Inspecting Container Health Status

You can check a container's health status at any time from the command line.

```bash
# View health status for all running containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Get detailed health information for a specific container
docker inspect --format='{{json .State.Health}}' my-container | jq .

# Watch health status in real time
watch -n 2 'docker ps --format "table {{.Names}}\t{{.Status}}"'
```

The `docker inspect` output includes the log of recent health check results, which is invaluable for debugging.

```bash
# View the last 5 health check results with timestamps
docker inspect --format='{{range .State.Health.Log}}{{.Start}} - Exit: {{.ExitCode}} - {{.Output}}{{end}}' my-container
```

## Disabling a Healthcheck

If your base image includes a healthcheck in its Dockerfile but you want to disable it in Compose, use the `disable` option.

```yaml
# Disable the healthcheck inherited from the Dockerfile
services:
  web:
    image: my-image-with-healthcheck:latest
    healthcheck:
      disable: true
```

## Common Pitfalls to Avoid

**Using tools not in the image.** If your image does not include `curl`, the healthcheck will always fail. Use `wget`, write a custom script, or install the necessary tools in your Dockerfile.

**Setting timeout longer than interval.** This creates overlapping health checks that can pile up and consume resources. Always keep timeout shorter than interval.

**Ignoring the start_period.** Without a start period, Docker counts boot-time failures as real failures. Your container might get marked unhealthy before it even finishes starting.

**Checking the wrong thing.** A healthcheck that just verifies a port is open does not tell you if the application is actually working. Test the actual functionality, like querying a health endpoint that checks database connectivity and other dependencies.

## Putting It All Together

Here is a production-ready example combining everything discussed above.

```yaml
# Production-ready docker-compose.yml with comprehensive healthchecks
version: "3.8"

services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: production
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d production"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  cache:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  app:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8000/health || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 3
      start_period: 30s
    ports:
      - "8000:8000"

  nginx:
    image: nginx:alpine
    depends_on:
      app:
        condition: service_healthy
    ports:
      - "80:80"
      - "443:443"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  pgdata:
```

Health checks are a small addition to your Compose file that pay big dividends. They prevent cascading failures, simplify debugging, and give you confidence that your services are genuinely ready to handle traffic. Start adding them to every service in your stack today.
