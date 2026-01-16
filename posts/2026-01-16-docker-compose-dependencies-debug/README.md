# How to Debug Docker Compose Service Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Dependencies, Troubleshooting, DevOps

Description: Learn how to troubleshoot Docker Compose service dependency issues including startup order problems, health check failures, circular dependencies, and timing-related bugs.

---

Docker Compose makes it easy to define multi-service applications, but dependency management can be tricky. Services might start in the wrong order, fail because dependencies aren't ready, or create circular dependency deadlocks. This guide helps you diagnose and fix these issues.

## Understanding depends_on

### Basic depends_on Limitations

```yaml
services:
  app:
    depends_on:
      - database
  database:
    image: postgres:15
```

**Important**: Basic `depends_on` only ensures the container starts, not that the service inside is ready. Your database container might be running but PostgreSQL might still be initializing.

### depends_on with Conditions

```yaml
services:
  app:
    depends_on:
      database:
        condition: service_healthy
  database:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

Available conditions:
- `service_started`: Container started (default)
- `service_healthy`: Health check passing
- `service_completed_successfully`: Container exited with code 0

## Diagnosing Dependency Issues

### Check Service Status

```bash
# View all services and their status
docker compose ps

# Example output showing unhealthy service blocking dependents:
# NAME       SERVICE    STATUS              PORTS
# db         database   running (healthy)   5432/tcp
# app        app        waiting

# View detailed service status
docker compose ps --format json | jq
```

### Check Health Status

```bash
# View health check details
docker inspect app-db-1 --format='{{json .State.Health}}' | jq

# Example output:
# {
#   "Status": "unhealthy",
#   "FailingStreak": 5,
#   "Log": [
#     {"Output": "connection refused", "ExitCode": 1}
#   ]
# }
```

### View Startup Logs

```bash
# See all logs with timestamps
docker compose logs -t

# Follow logs in real-time
docker compose logs -f

# Logs for specific service
docker compose logs database

# See startup order
docker compose up 2>&1 | grep -E "Creating|Starting|Waiting"
```

### Debug Health Checks

```bash
# Run health check command manually
docker compose exec database pg_isready -U postgres

# Test from app container's perspective
docker compose exec app nc -zv database 5432

# Check DNS resolution
docker compose exec app nslookup database
```

## Common Issues and Solutions

### Issue 1: Service Not Ready When Dependent Starts

**Symptom**: App crashes with "connection refused" even though database container is running.

**Solution**: Use health checks with `condition: service_healthy`

```yaml
services:
  app:
    image: myapp
    depends_on:
      database:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://user:pass@database:5432/mydb

  database:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: pass
      POSTGRES_USER: user
      POSTGRES_DB: mydb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
```

### Issue 2: Health Check Never Passes

**Symptom**: Service stuck in "unhealthy" state, dependents never start.

**Diagnosis**:
```bash
# Check health check logs
docker inspect myservice --format='{{json .State.Health.Log}}' | jq

# Run health check manually
docker compose exec myservice /bin/sh -c "pg_isready -U postgres"
```

**Common causes and fixes**:

```yaml
# Wrong user in health check
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]  # Check POSTGRES_USER
  # Should match:
  # POSTGRES_USER: myuser

# Missing tool in container
healthcheck:
  # Bad: curl not installed
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  # Good: Use wget in Alpine
  test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]

# Wrong port
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:8080/health"]
  # But app runs on port 3000
```

### Issue 3: Circular Dependencies

**Symptom**: Compose hangs or reports circular dependency error.

```yaml
# BAD: Circular dependency
services:
  a:
    depends_on:
      - b
  b:
    depends_on:
      - c
  c:
    depends_on:
      - a  # Creates cycle: a -> b -> c -> a
```

**Solution**: Restructure dependencies or use initialization service:

```yaml
# Good: Break the cycle with init service
services:
  init:
    image: busybox
    command: "true"
    depends_on:
      - database
      - cache

  a:
    depends_on:
      init:
        condition: service_completed_successfully

  b:
    depends_on:
      init:
        condition: service_completed_successfully
```

### Issue 4: Race Conditions

**Symptom**: Works sometimes, fails other times.

**Solution**: Implement retry logic in your application AND use health checks:

```javascript
// app.js - Retry database connection
const maxRetries = 30;
const retryDelay = 1000;

async function connectWithRetry() {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await database.connect();
      console.log('Database connected');
      return;
    } catch (error) {
      console.log(`Attempt ${i + 1} failed, retrying...`);
      await new Promise(r => setTimeout(r, retryDelay));
    }
  }
  throw new Error('Could not connect to database');
}
```

### Issue 5: Migrations Need to Run First

**Symptom**: App starts before migrations complete.

**Solution**: Use `service_completed_successfully`:

```yaml
services:
  migrate:
    image: myapp
    command: npm run migrate
    depends_on:
      database:
        condition: service_healthy

  app:
    image: myapp
    command: npm start
    depends_on:
      migrate:
        condition: service_completed_successfully
      database:
        condition: service_healthy

  database:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 5s
      retries: 10
```

## Debugging Techniques

### Start Services Individually

```bash
# Start just the database
docker compose up database

# In another terminal, test connection
docker compose run --rm app nc -zv database 5432

# Then start app
docker compose up app
```

### Verbose Output

```bash
# See detailed startup information
docker compose --verbose up

# Debug mode
COMPOSE_DEBUG=1 docker compose up
```

### Check Network Connectivity

```bash
# Verify services are on same network
docker network inspect myproject_default

# Test DNS resolution
docker compose exec app getent hosts database

# Test port connectivity
docker compose exec app nc -zv database 5432
```

### Override for Debugging

```yaml
# docker-compose.override.yml
services:
  app:
    # Keep container running for debugging
    command: sleep infinity
    # Or
    entrypoint: ["tail", "-f", "/dev/null"]
```

```bash
# Start with override
docker compose up -d

# Debug interactively
docker compose exec app sh
# Now test connections manually
```

## Health Check Recipes

### PostgreSQL

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-postgres}"]
  interval: 5s
  timeout: 5s
  retries: 10
  start_period: 10s
```

### MySQL

```yaml
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
  interval: 5s
  timeout: 5s
  retries: 10
  start_period: 30s
```

### Redis

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 5s
  timeout: 3s
  retries: 5
```

### HTTP Service

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

### Custom Script

```yaml
healthcheck:
  test: ["CMD", "/healthcheck.sh"]
  interval: 10s
  timeout: 5s
  retries: 3
```

## Complete Debugging Example

```yaml
# docker-compose.yml
version: '3.8'

services:
  database:
    image: postgres:15
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  migrate:
    image: myapp
    command: npm run migrate
    environment:
      DATABASE_URL: postgres://app:secret@database:5432/myapp
    depends_on:
      database:
        condition: service_healthy
    restart: on-failure

  app:
    image: myapp
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://app:secret@database:5432/myapp
      REDIS_URL: redis://redis:6379
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    depends_on:
      migrate:
        condition: service_completed_successfully
      database:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  pgdata:
```

Debug commands:
```bash
# Full startup with logs
docker compose up

# Check health status
docker compose ps

# Check specific service health
docker inspect myproject-database-1 --format='{{.State.Health.Status}}'

# Debug app container
docker compose exec app sh

# View health check history
docker inspect myproject-app-1 --format='{{json .State.Health.Log}}' | jq
```

## Quick Reference

| Problem | Check | Solution |
|---------|-------|----------|
| Service not ready | `docker inspect --format='{{json .State.Health}}'` | Add health check with retries |
| Health check fails | Run check manually in container | Fix check command or settings |
| Circular dependency | Review depends_on chain | Restructure or use init service |
| Race condition | Logs show timing issues | Add retry logic + health checks |
| Migration not complete | Check migrate service status | Use `service_completed_successfully` |

## Summary

| Technique | When to Use |
|-----------|-------------|
| `service_healthy` condition | Wait for service to be ready |
| `service_completed_successfully` | Wait for init/migration tasks |
| Manual health check test | Debug failing health checks |
| Individual service startup | Isolate dependency issues |
| Application retry logic | Handle transient failures |
| Override file with sleep | Debug container environment |

Docker Compose dependencies work best when combined with proper health checks. Always use `condition: service_healthy` for services that need time to initialize, and implement retry logic in your applications as a safety net. When debugging, start services individually and test connectivity manually to isolate the issue.

