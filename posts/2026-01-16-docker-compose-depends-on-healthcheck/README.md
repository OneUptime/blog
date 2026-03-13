# How to Use Docker Compose depends_on with Health Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Health Checks, DevOps, Reliability

Description: Learn how to properly configure service dependencies in Docker Compose using depends_on with health checks to ensure services start in the correct order and only when dependencies are truly ready.

---

The `depends_on` directive in Docker Compose controls startup order, but by default it only waits for containers to start, not for services inside them to be ready. A database container might be running, but PostgreSQL isn't accepting connections yet. Health checks solve this problem by making depends_on wait until services are actually healthy.

## The Problem with Basic depends_on

```yaml
version: '3.8'

services:
  app:
    image: my-app
    depends_on:
      - database

  database:
    image: postgres:15
```

This starts the database container before the app, but:
- The database process might not be ready for connections
- The app will crash trying to connect
- You need retry logic in your application

## depends_on with Conditions

Docker Compose 2.1+ supports conditions that wait for health checks.

```yaml
version: '3.8'

services:
  app:
    image: my-app
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_healthy

  database:
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
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Now the app waits until both database and redis health checks pass.

## Available Conditions

| Condition | Behavior |
|-----------|----------|
| `service_started` | Wait for container to start (default) |
| `service_healthy` | Wait for health check to pass |
| `service_completed_successfully` | Wait for container to exit with code 0 |

### service_completed_successfully Example

Useful for init containers or migrations.

```yaml
version: '3.8'

services:
  migrate:
    image: my-app
    command: npm run migrate
    depends_on:
      database:
        condition: service_healthy

  app:
    image: my-app
    depends_on:
      migrate:
        condition: service_completed_successfully
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

Flow:
1. Database starts and becomes healthy
2. Migrate container runs and completes successfully
3. App container starts

## Health Check Configuration

### Health Check Options

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  interval: 30s      # Time between checks
  timeout: 10s       # Max time for check to complete
  retries: 3         # Failures before unhealthy
  start_period: 40s  # Grace period for startup
```

### Test Formats

```yaml
# CMD format - run command directly
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]

# CMD-SHELL format - run through shell
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost/health || exit 1"]

# String format (implies CMD-SHELL)
healthcheck:
  test: "curl -f http://localhost/health || exit 1"
```

## Common Service Health Checks

### PostgreSQL

```yaml
postgres:
  image: postgres:15
  environment:
    POSTGRES_PASSWORD: secret
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d postgres"]
    interval: 5s
    timeout: 5s
    retries: 5
    start_period: 10s
```

### MySQL/MariaDB

```yaml
mysql:
  image: mysql:8
  environment:
    MYSQL_ROOT_PASSWORD: secret
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-psecret"]
    interval: 5s
    timeout: 5s
    retries: 5
    start_period: 30s
```

### Redis

```yaml
redis:
  image: redis:7-alpine
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 3s
    retries: 5
```

### MongoDB

```yaml
mongodb:
  image: mongo:7
  healthcheck:
    test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s
```

### Elasticsearch

```yaml
elasticsearch:
  image: elasticsearch:8.11.0
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

### RabbitMQ

```yaml
rabbitmq:
  image: rabbitmq:3-management
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "check_running"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s
```

### Kafka

```yaml
kafka:
  image: confluentinc/cp-kafka:latest
  healthcheck:
    test: ["CMD-SHELL", "kafka-broker-api-versions --bootstrap-server localhost:9092"]
    interval: 10s
    timeout: 10s
    retries: 10
    start_period: 60s
```

### HTTP Services

```yaml
api:
  image: my-api
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 30s
```

### Custom Application

```yaml
app:
  image: my-app
  healthcheck:
    test: ["CMD", "/app/healthcheck.sh"]
    interval: 15s
    timeout: 5s
    retries: 3
```

## Complete Example: Full Stack Application

```yaml
version: '3.8'

services:
  # Database layer
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Run migrations before starting app
  migrate:
    image: my-app
    command: npm run migrate
    environment:
      DATABASE_URL: postgres://app:secret@postgres:5432/myapp
    depends_on:
      postgres:
        condition: service_healthy
    restart: on-failure

  # Main application
  api:
    image: my-app
    command: npm start
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://app:secret@postgres:5432/myapp
      REDIS_URL: redis://redis:6379
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    depends_on:
      migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Background worker
  worker:
    image: my-app
    command: npm run worker
    environment:
      DATABASE_URL: postgres://app:secret@postgres:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      api:
        condition: service_healthy

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      api:
        condition: service_healthy

volumes:
  postgres-data:
```

## Disabling Health Checks

You can disable health checks from the Dockerfile.

```yaml
services:
  app:
    image: my-app
    healthcheck:
      disable: true
```

## Troubleshooting

### Check Health Status

```bash
# See health status of all containers
docker-compose ps

# Detailed health info
docker inspect --format='{{json .State.Health}}' container_name | jq

# Watch health changes
watch 'docker-compose ps'
```

### Debug Failing Health Checks

```bash
# Run health check command manually
docker-compose exec postgres pg_isready -U postgres

# Check container logs
docker-compose logs postgres

# Get into container to debug
docker-compose exec postgres bash
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Health check always fails | Wrong command or port | Test command manually in container |
| Check passes but app fails | Check too simple | Make check verify actual readiness |
| Start period too short | Service needs more time | Increase start_period |
| Flapping health status | Check too aggressive | Increase interval, decrease retries |

### Health Check Not Working

```yaml
# Make sure you're using compose version 2.1+
version: '3.8'  # or just remove version for latest behavior

# Use long-form depends_on
depends_on:
  database:
    condition: service_healthy  # NOT just "database"
```

## Best Practices

1. **Always add health checks to databases** - They take time to initialize
2. **Use start_period** - Give services time to initialize before checking
3. **Make health checks lightweight** - They run frequently
4. **Check actual readiness**, not just process existence
5. **Use service_completed_successfully for migrations**
6. **Don't rely solely on depends_on** - Add retry logic in applications too

## Summary

| Service Type | Health Check Test | Typical Timing |
|-------------|-------------------|----------------|
| PostgreSQL | `pg_isready` | interval: 5s, start_period: 10s |
| MySQL | `mysqladmin ping` | interval: 5s, start_period: 30s |
| Redis | `redis-cli ping` | interval: 5s, start_period: 5s |
| MongoDB | `mongosh --eval "ping"` | interval: 10s, start_period: 30s |
| HTTP API | `curl -f /health` | interval: 10s, start_period: 30s |
| Elasticsearch | `curl /_cluster/health` | interval: 10s, start_period: 60s |

Health checks with `depends_on: condition: service_healthy` ensure your services start in the right order and only when dependencies are truly ready, not just running.
