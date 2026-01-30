# How to Create Docker Compose Health Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Health Checks, Service Readiness

Description: Learn to implement health checks in Docker Compose with test commands, intervals, and dependency conditions for reliable service startup.

---

When running multi-container applications with Docker Compose, ensuring services start in the correct order and are actually ready to handle requests is critical for application reliability. Docker Compose health checks provide a mechanism to verify that a container is not just running, but genuinely ready to serve traffic. This guide walks you through implementing robust health checks for service readiness.

## Why Health Checks Matter

Starting a container does not guarantee the service inside is ready. A database container might be running, but the database server could still be initializing. Without health checks, dependent services may fail because they attempt to connect before their dependencies are truly available.

```mermaid
sequenceDiagram
    participant DC as Docker Compose
    participant DB as Database Container
    participant App as Application Container

    DC->>DB: Start container
    DB-->>DC: Container running
    Note over DB: Database initializing...
    DC->>App: Start container (depends_on: db)
    App->>DB: Connection attempt
    DB--xApp: Connection refused
    Note over App: Application crashes
    Note over DB: Database now ready
```

With health checks, Docker Compose waits until the service is genuinely ready:

```mermaid
sequenceDiagram
    participant DC as Docker Compose
    participant DB as Database Container
    participant App as Application Container

    DC->>DB: Start container
    DB-->>DC: Container running
    Note over DB: Database initializing...
    DC->>DB: Health check
    DB--xDC: Unhealthy
    DC->>DB: Health check (retry)
    DB-->>DC: Healthy
    DC->>App: Start container
    App->>DB: Connection attempt
    DB-->>App: Connection successful
```

## Basic Health Check Syntax

The `healthcheck` directive in Docker Compose defines how Docker should test if a container is healthy. Here is the basic structure:

```yaml
services:
  myservice:
    image: myimage:latest
    healthcheck:
      test: ["CMD", "command", "to", "run"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
      start_interval: 5s
```

### Configuration Options Explained

| Option | Description | Default |
|--------|-------------|---------|
| `test` | Command to run for the health check | None |
| `interval` | Time between health checks | 30s |
| `timeout` | Maximum time for a check to complete | 30s |
| `retries` | Consecutive failures needed to be unhealthy | 3 |
| `start_period` | Grace period for container initialization | 0s |
| `start_interval` | Interval during start period (Compose v2.3+) | Same as interval |

## Health Check Test Commands

The `test` field supports multiple formats for specifying the health check command.

### CMD Format

Executes the command directly without a shell:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
```

### CMD-SHELL Format

Executes the command through `/bin/sh -c`:

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
```

### String Format

Equivalent to CMD-SHELL when specified as a string:

```yaml
healthcheck:
  test: curl -f http://localhost:8080/health || exit 1
```

## Practical Examples

### PostgreSQL Database

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

The `pg_isready` utility is specifically designed to check PostgreSQL connection readiness.

### MySQL Database

```yaml
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: rootsecret
      MYSQL_DATABASE: myapp
      MYSQL_USER: admin
      MYSQL_PASSWORD: secret
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootsecret"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 60s
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### Redis Cache

```yaml
services:
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### Web Application with HTTP Endpoint

```yaml
services:
  api:
    build: ./api
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 3
      start_period: 30s
```

If your container does not have `curl` or `wget`, you can use other methods:

```yaml
healthcheck:
  test: ["CMD-SHELL", "nc -z localhost 8080 || exit 1"]
```

### Node.js Application

For Node.js applications, you can create a dedicated health check script:

```javascript
// healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', () => process.exit(1));
req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

```yaml
services:
  node-app:
    build: .
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

## Service Dependencies with Health Conditions

Docker Compose allows you to specify dependency conditions using the `depends_on` directive with `condition` options.

### Dependency Conditions

```mermaid
flowchart TD
    A[depends_on conditions] --> B[service_started]
    A --> C[service_healthy]
    A --> D[service_completed_successfully]

    B --> B1[Container is running]
    C --> C1[Container passes health check]
    D --> D1[Container exited with code 0]
```

### Complete Example with Dependencies

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s

  migrations:
    build:
      context: .
      dockerfile: Dockerfile.migrations
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://admin:secret@postgres:5432/myapp
    restart: "no"

  api:
    build: ./api
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      migrations:
        condition: service_completed_successfully
    environment:
      DATABASE_URL: postgres://admin:secret@postgres:5432/myapp
      REDIS_URL: redis://redis:6379
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 3
      start_period: 30s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      api:
        condition: service_healthy
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro

volumes:
  postgres_data:
```

### Startup Order Visualization

```mermaid
flowchart LR
    subgraph Phase1[Phase 1]
        postgres[PostgreSQL]
        redis[Redis]
    end

    subgraph Phase2[Phase 2]
        migrations[Migrations]
    end

    subgraph Phase3[Phase 3]
        api[API Service]
    end

    subgraph Phase4[Phase 4]
        nginx[Nginx]
    end

    postgres -->|service_healthy| migrations
    postgres -->|service_healthy| api
    redis -->|service_healthy| api
    migrations -->|service_completed_successfully| api
    api -->|service_healthy| nginx
```

## Advanced Patterns

### Custom Health Check Script

For complex health checks, create a dedicated script:

```bash
#!/bin/bash
# healthcheck.sh

# Check if the main process is running
if ! pgrep -x "myprocess" > /dev/null; then
    echo "Main process not running"
    exit 1
fi

# Check if the service responds
if ! curl -sf http://localhost:8080/health > /dev/null; then
    echo "Health endpoint not responding"
    exit 1
fi

# Check database connectivity
if ! pg_isready -h postgres -U admin > /dev/null 2>&1; then
    echo "Cannot connect to database"
    exit 1
fi

echo "All checks passed"
exit 0
```

```yaml
services:
  myservice:
    build: .
    healthcheck:
      test: ["CMD", "/app/healthcheck.sh"]
      interval: 30s
      timeout: 15s
      retries: 3
      start_period: 60s
```

### Disabling Health Checks

To disable health checks defined in a Dockerfile:

```yaml
services:
  myservice:
    image: someimage
    healthcheck:
      disable: true
```

### Environment-Specific Health Checks

Use YAML anchors for environment-specific configurations:

```yaml
x-healthcheck-defaults: &healthcheck-defaults
  interval: 30s
  timeout: 10s
  retries: 3

services:
  api:
    image: myapi:latest
    healthcheck:
      <<: *healthcheck-defaults
      test: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      start_period: ${HEALTH_START_PERIOD:-30s}
```

## Troubleshooting Health Checks

### Checking Health Status

View the health status of containers:

```bash
docker compose ps
```

Output shows health status in the STATUS column:

```
NAME                STATUS                    PORTS
myapp-postgres-1    Up 2 minutes (healthy)    5432/tcp
myapp-api-1         Up 1 minute (unhealthy)   0.0.0.0:8080->8080/tcp
```

### Inspecting Health Check Details

Get detailed health check information:

```bash
docker inspect --format='{{json .State.Health}}' container_name | jq
```

Example output:

```json
{
  "Status": "unhealthy",
  "FailingStreak": 3,
  "Log": [
    {
      "Start": "2026-01-30T10:00:00.000000000Z",
      "End": "2026-01-30T10:00:05.000000000Z",
      "ExitCode": 1,
      "Output": "curl: (7) Failed to connect to localhost port 8080"
    }
  ]
}
```

### Common Issues and Solutions

```mermaid
flowchart TD
    A[Health Check Failing] --> B{What type of failure?}

    B --> C[Command not found]
    B --> D[Connection refused]
    B --> E[Timeout]
    B --> F[Permission denied]

    C --> C1[Install required tools in image]
    C --> C2[Use available tools like nc or shell]

    D --> D1[Increase start_period]
    D --> D2[Check service is binding to correct interface]
    D --> D3[Verify port configuration]

    E --> E1[Increase timeout value]
    E --> E2[Optimize health endpoint]
    E --> E3[Check resource constraints]

    F --> F1[Run as correct user]
    F --> F2[Check file permissions]
```

### Issue: Command Not Found

If your container lacks common tools like `curl`:

```yaml
# Use wget instead
healthcheck:
  test: ["CMD-SHELL", "wget -q --spider http://localhost:8080/health || exit 1"]

# Or use netcat
healthcheck:
  test: ["CMD-SHELL", "nc -z localhost 8080 || exit 1"]

# Or use shell built-ins
healthcheck:
  test: ["CMD-SHELL", "exec 3<>/dev/tcp/localhost/8080 && echo -e 'GET /health HTTP/1.1\\r\\nHost: localhost\\r\\n\\r\\n' >&3 && cat <&3 | grep -q '200 OK'"]
```

### Issue: Health Check Works Manually But Fails in Docker

The health check runs inside the container network namespace. Ensure:

1. The service binds to `0.0.0.0`, not just `127.0.0.1`
2. The health check uses `localhost` or `127.0.0.1`, not the external IP
3. The correct port is being checked

### Issue: Flaky Health Checks

Adjust timing parameters:

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
  interval: 30s      # Less frequent checks
  timeout: 15s       # More time to respond
  retries: 5         # More retries before unhealthy
  start_period: 60s  # Longer grace period
```

## Best Practices

1. **Keep health checks lightweight** - They run frequently, so avoid expensive operations

2. **Use dedicated health endpoints** - Create a `/health` or `/readiness` endpoint that checks critical dependencies

3. **Set appropriate timeouts** - The timeout should be long enough for the check to complete under normal load

4. **Use start_period wisely** - Give containers enough time to initialize before health checks count against them

5. **Test health checks locally** - Run the health check command manually inside the container to verify it works

6. **Monitor health check logs** - Failed health checks can indicate performance or reliability issues

7. **Differentiate liveness and readiness** - Consider having separate endpoints for "is the process alive" versus "is it ready to serve traffic"

```yaml
services:
  api:
    build: .
    healthcheck:
      # Readiness check - is the service ready to handle requests?
      test: ["CMD-SHELL", "curl -f http://localhost:8080/ready || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
```

## Conclusion

Docker Compose health checks are essential for building reliable multi-container applications. By properly configuring health checks and dependency conditions, you ensure services start in the correct order and only begin accepting traffic when they are truly ready. This eliminates race conditions during startup, improves application resilience, and makes debugging easier when issues occur.

Start with simple health checks using built-in tools like `pg_isready` for databases or HTTP requests for web services, then evolve to custom health check scripts as your needs grow more complex. Remember to tune the timing parameters based on your application's actual startup behavior and resource requirements.
