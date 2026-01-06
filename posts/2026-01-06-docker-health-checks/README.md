# How to Set Up Docker Health Checks That Actually Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Reliability, Monitoring

Description: Implement HEALTHCHECK instructions using curl, custom scripts, and proper thresholds so Docker, Swarm, and Compose can auto-heal your services.

A container can be running but completely broken. The process might be alive but stuck in a loop, out of memory, or unable to connect to dependencies. Health checks give Docker visibility into actual application health, enabling automatic recovery without human intervention.

---

## Why Running Isn't Healthy

```bash
docker ps
CONTAINER ID   IMAGE    STATUS         PORTS
abc123def456   myapp    Up 2 hours     8080/tcp
```

"Up 2 hours" only means the main process hasn't exited. It tells you nothing about:
- Can the app respond to requests?
- Is it connected to the database?
- Is it stuck in an infinite loop?
- Has it run out of file descriptors?

Health checks answer: "Is this service actually doing its job?"

---

## Basic HEALTHCHECK Syntax

```dockerfile
HEALTHCHECK [OPTIONS] CMD command

# Options:
# --interval=30s     How often to run the check
# --timeout=30s      Max time for check to complete
# --start-period=5s  Grace period during startup
# --retries=3        Failures before marking unhealthy
```

### Health States

- **starting** - Container started, within start-period
- **healthy** - Last health check passed
- **unhealthy** - Health check failed `retries` times in a row

---

## HTTP Health Checks (Most Common)

### Using curl

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
```

### Using wget (Alpine-Friendly)

Alpine doesn't include curl by default:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
```

### Minimal Health Endpoint

Your application needs a health endpoint:

```javascript
// server.js
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});
```

---

## TCP Health Checks

For services that don't speak HTTP:

```dockerfile
FROM redis:7

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD redis-cli ping | grep -q PONG || exit 1
```

### Using netcat

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD nc -z localhost 5432 || exit 1
```

---

## Custom Script Health Checks

For complex health logic, use a script:

```dockerfile
FROM node:22-alpine
WORKDIR /app

COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

COPY . .
RUN npm install

HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

CMD ["node", "server.js"]
```

```bash
#!/bin/sh
# healthcheck.sh

# Check HTTP endpoint
if ! wget --no-verbose --tries=1 --spider http://localhost:3000/health; then
  echo "HTTP health check failed"
  exit 1
fi

# Check database connection
if ! node -e "require('./db').ping().catch(() => process.exit(1))"; then
  echo "Database connection check failed"
  exit 1
fi

# Check disk space
DISK_USAGE=$(df /app | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo "Disk usage too high: ${DISK_USAGE}%"
  exit 1
fi

exit 0
```

---

## Deep Health Checks vs Shallow Health Checks

### Shallow (Liveness)

Quick check that the process is responsive:

```javascript
app.get('/health/live', (req, res) => {
  res.sendStatus(200);
});
```

### Deep (Readiness)

Validates dependencies are accessible:

```javascript
app.get('/health/ready', async (req, res) => {
  try {
    // Check database
    await db.query('SELECT 1');

    // Check Redis
    await redis.ping();

    // Check external API
    await fetch('https://api.stripe.com/v1/health', { timeout: 5000 });

    res.json({ status: 'ready', checks: { db: 'ok', redis: 'ok', stripe: 'ok' } });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

### Which to Use?

For `HEALTHCHECK` in Dockerfile:
- Use shallow checks for restart decisions
- Deep checks can cause cascading restarts during dependency outages

For load balancers/orchestrators:
- Use deep checks for traffic routing decisions

---

## Health Checks in Docker Compose

```yaml
services:
  api:
    build: .
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    environment:
      POSTGRES_PASSWORD: password
```

### Wait for Dependencies

The `depends_on` with `condition: service_healthy` ensures proper startup order:

```yaml
services:
  api:
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
```

---

## Health Checks with Restart Policies

Combine health checks with restart policies for self-healing:

```yaml
services:
  api:
    image: myapp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    # Container restarts when unhealthy (in Swarm mode)

  # For standalone Docker (non-Swarm), use autoheal
  autoheal:
    image: willfarrell/autoheal
    environment:
      - AUTOHEAL_CONTAINER_LABEL=all
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

### Docker Swarm Auto-Healing

In Swarm mode, unhealthy containers are automatically replaced:

```yaml
services:
  api:
    image: myapp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

---

## Tuning Health Check Parameters

### Start Period

Time before health checks count against you:

```dockerfile
# App takes 60 seconds to initialize
HEALTHCHECK --start-period=60s --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Interval vs Timeout

- **Interval**: How often to check (balance freshness vs overhead)
- **Timeout**: Max wait for check to complete (should be less than interval)

```dockerfile
# Check every 30s, give up after 10s, 3 failures = unhealthy
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD ...
```

### Retries

Avoid flapping with appropriate retries:

```dockerfile
# Transient failures are common, require 5 consecutive failures
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD ...
```

---

## Common Health Check Patterns

### PostgreSQL

```dockerfile
# Using pg_isready
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U postgres || exit 1

# Or with query
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U postgres && psql -U postgres -c "SELECT 1" || exit 1
```

### MySQL

```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD} || exit 1
```

### Redis

```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD redis-cli ping | grep -q PONG || exit 1
```

### MongoDB

```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD mongosh --eval "db.adminCommand('ping')" || exit 1
```

### Nginx

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/health || exit 1
```

With nginx.conf:
```nginx
location /health {
  access_log off;
  return 200 "healthy\n";
  add_header Content-Type text/plain;
}
```

### RabbitMQ

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD rabbitmq-diagnostics check_port_connectivity || exit 1
```

---

## Monitoring Health Status

### View Health Status

```bash
# Container list with health
docker ps
CONTAINER ID   IMAGE    STATUS                   HEALTH
abc123         myapp    Up 2 hours               healthy
def456         myapp    Up 5 minutes (healthy)   healthy
ghi789         myapp    Up 10 minutes            unhealthy

# Detailed health info
docker inspect --format='{{json .State.Health}}' myapp | jq
```

### Health Check Logs

```bash
# View health check output
docker inspect --format='{{json .State.Health.Log}}' myapp | jq

# Output:
# [
#   {
#     "Start": "2024-01-06T10:00:00Z",
#     "End": "2024-01-06T10:00:01Z",
#     "ExitCode": 0,
#     "Output": "healthy"
#   },
#   ...
# ]
```

### Alert on Unhealthy

```bash
#!/bin/bash
# monitor-health.sh

UNHEALTHY=$(docker ps --filter "health=unhealthy" --format "{{.Names}}")

if [ -n "$UNHEALTHY" ]; then
  echo "Unhealthy containers: $UNHEALTHY"
  # Send alert to Slack/PagerDuty/etc
fi
```

---

## Disabling Health Checks

Sometimes you need to disable inherited health checks:

```dockerfile
# Disable health check
HEALTHCHECK NONE
```

```yaml
# In Compose
services:
  app:
    image: myapp
    healthcheck:
      disable: true
```

---

## Quick Reference

```dockerfile
# HTTP health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# TCP health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD nc -z localhost 5432 || exit 1

# Custom script
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD /healthcheck.sh

# Disable
HEALTHCHECK NONE
```

```bash
# View health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Filter by health
docker ps --filter "health=healthy"
docker ps --filter "health=unhealthy"

# Inspect health details
docker inspect --format='{{json .State.Health}}' container_name | jq
```

---

## Summary

- Health checks verify application functionality, not just process existence
- Use HTTP checks for web services, TCP/custom checks for databases and queues
- Set appropriate start periods for slow-starting applications
- Use retries to avoid flapping on transient failures
- Compose's `depends_on: condition: service_healthy` ensures proper startup order
- Swarm automatically replaces unhealthy containers
- Monitor health status and alert when containers stay unhealthy

Good health checks turn "is it running?" into "is it working?" - a crucial distinction for reliable services.
