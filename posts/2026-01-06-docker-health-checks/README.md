# How to Set Up Docker Health Checks That Actually Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Reliability, Monitoring

Description: Implement HEALTHCHECK instructions using curl, custom scripts, and proper thresholds so Docker, Swarm, and Compose can auto-heal your services.

A container can be running but completely broken. The process might be alive but stuck in a loop, out of memory, or unable to connect to dependencies. Health checks give Docker visibility into actual application health, enabling automatic recovery without human intervention.

---

## Why Running Isn't Healthy

The following command shows containers that appear to be running, but the "Up" status only indicates the process is alive, not that it is functioning correctly.

```bash
# List running containers - STATUS shows uptime but not application health
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

This shows the basic syntax for defining a health check in a Dockerfile. The options control timing and failure thresholds, which are critical for avoiding false positives while still detecting real problems quickly.

```dockerfile
# HEALTHCHECK instruction syntax with configurable options
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

This Dockerfile demonstrates an HTTP health check using curl. The `-f` flag makes curl fail silently on HTTP errors, and the `|| exit 1` ensures a proper exit code is returned to Docker.

```dockerfile
# Node.js application with HTTP health check using curl
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install

# Health check: curl the /health endpoint every 30 seconds
# -f flag fails silently on HTTP errors (4xx, 5xx)
# exit 1 signals failure to Docker if curl fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
```

### Using wget (Alpine-Friendly)

Alpine doesn't include curl by default:

Since Alpine Linux uses a minimal base image, wget is available by default while curl is not. This Dockerfile shows how to use wget for health checks, which is useful when you want to keep your image size small.

```dockerfile
# Node.js on Alpine using wget instead of curl for health checks
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install

# Health check using wget - better for Alpine since wget is included
# --no-verbose reduces output, --spider checks URL without downloading
# --tries=1 prevents retries within a single check (Docker handles retries)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
```

### Minimal Health Endpoint

Your application needs a health endpoint:

The following code creates a simple health endpoint in your Node.js application. This endpoint returns a 200 status code to indicate the service is healthy and responding to HTTP requests.

```javascript
// server.js - Minimal health endpoint implementation
app.get('/health', (req, res) => {
  // Return 200 OK with JSON payload
  // This confirms the HTTP server is accepting connections
  res.status(200).json({ status: 'healthy' });
});
```

---

## TCP Health Checks

For services that don't speak HTTP:

Redis and other non-HTTP services require different health check approaches. This example uses the Redis CLI to send a PING command and verify the response, ensuring the Redis server is actually processing commands.

```dockerfile
# Redis health check using native redis-cli command
FROM redis:7

# PING returns "PONG" when Redis is healthy
# grep -q quietly checks for the expected response
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD redis-cli ping | grep -q PONG || exit 1
```

### Using netcat

For services where you just need to verify a port is open and accepting connections, netcat provides a simple TCP-level health check.

```dockerfile
# TCP port check using netcat (nc)
# -z flag scans for listening daemons without sending data
# Useful for databases or services without a CLI tool
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD nc -z localhost 5432 || exit 1
```

---

## Custom Script Health Checks

For complex health logic, use a script:

When health checks need to verify multiple conditions, a shell script provides flexibility to check the HTTP endpoint, database connectivity, and system resources all in one place.

```dockerfile
# Dockerfile with custom health check script
FROM node:22-alpine
WORKDIR /app

# Copy and make the health check script executable
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

COPY . .
RUN npm install

# Use the custom script for complex multi-condition health checks
# Longer start-period allows for database migrations and warmup
HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

CMD ["node", "server.js"]
```

This shell script performs multiple health checks including HTTP endpoint verification, database connectivity, and disk space monitoring. If any check fails, the container is marked unhealthy.

```bash
#!/bin/sh
# healthcheck.sh - Multi-condition health check script

# Check 1: Verify HTTP endpoint is responding
if ! wget --no-verbose --tries=1 --spider http://localhost:3000/health; then
  echo "HTTP health check failed"
  exit 1  # Return failure to Docker
fi

# Check 2: Verify database connection is working
# Uses Node.js to test the actual database connection
if ! node -e "require('./db').ping().catch(() => process.exit(1))"; then
  echo "Database connection check failed"
  exit 1
fi

# Check 3: Ensure disk space is not critically low
# Extract disk usage percentage and remove the % symbol
DISK_USAGE=$(df /app | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo "Disk usage too high: ${DISK_USAGE}%"
  exit 1  # Fail if disk is more than 90% full
fi

# All checks passed
exit 0
```

---

## Deep Health Checks vs Shallow Health Checks

### Shallow (Liveness)

Quick check that the process is responsive:

A shallow health check simply verifies the HTTP server is running and can respond. This is fast and prevents cascading failures when dependencies are temporarily unavailable.

```javascript
// Shallow/liveness check - just verify the process responds
app.get('/health/live', (req, res) => {
  // Immediate response without checking dependencies
  // Use this to determine if the container should restart
  res.sendStatus(200);
});
```

### Deep (Readiness)

Validates dependencies are accessible:

A deep health check verifies all critical dependencies are reachable. This is useful for load balancer decisions but should not be used for container restart decisions as it can cause cascading failures.

```javascript
// Deep/readiness check - verify all dependencies are accessible
app.get('/health/ready', async (req, res) => {
  try {
    // Check database connectivity with a simple query
    await db.query('SELECT 1');

    // Verify Redis cache is responding to commands
    await redis.ping();

    // Test external API availability with timeout
    await fetch('https://api.stripe.com/v1/health', { timeout: 5000 });

    // All dependencies healthy - return detailed status
    res.json({ status: 'ready', checks: { db: 'ok', redis: 'ok', stripe: 'ok' } });
  } catch (error) {
    // One or more dependencies failed - return 503 Service Unavailable
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

This Docker Compose configuration demonstrates health checks for a multi-service application. The API service waits for the database to be healthy before starting, preventing connection errors during startup.

```yaml
# docker-compose.yml with health checks and dependency ordering
services:
  api:
    build: .
    healthcheck:
      # CMD format for health check command
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s      # Check every 30 seconds
      timeout: 10s       # Fail if check takes longer than 10 seconds
      retries: 3         # Mark unhealthy after 3 consecutive failures
      start_period: 40s  # Grace period for application startup
    depends_on:
      db:
        condition: service_healthy  # Wait for db to be healthy before starting

  db:
    image: postgres:16
    healthcheck:
      # CMD-SHELL allows shell syntax in health check
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s   # Check database more frequently
      timeout: 5s
      retries: 5      # More retries for database startup
    environment:
      POSTGRES_PASSWORD: password
```

### Wait for Dependencies

The `depends_on` with `condition: service_healthy` ensures proper startup order:

This pattern ensures services start in the correct order. The API won't start until both the database and Redis cache report healthy status, preventing runtime errors from missing dependencies.

```yaml
# Dependency ordering using health check conditions
services:
  api:
    depends_on:
      db:
        condition: service_healthy    # Wait for PostgreSQL
      redis:
        condition: service_healthy    # Wait for Redis

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]  # PostgreSQL readiness check
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]  # Redis PING command
      interval: 5s
      timeout: 5s
      retries: 5
```

---

## Health Checks with Restart Policies

Combine health checks with restart policies for self-healing:

This configuration shows how to combine health checks with automatic restart policies. In standalone Docker (non-Swarm), the autoheal container monitors other containers and restarts them when they become unhealthy.

```yaml
# Self-healing configuration with autoheal for standalone Docker
services:
  api:
    image: myapp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped  # Restart if container stops unexpectedly
    # Container restarts when unhealthy (in Swarm mode)

  # For standalone Docker (non-Swarm), use autoheal sidecar
  autoheal:
    image: willfarrell/autoheal
    environment:
      - AUTOHEAL_CONTAINER_LABEL=all  # Monitor all containers with health checks
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Required for Docker API access
```

### Docker Swarm Auto-Healing

In Swarm mode, unhealthy containers are automatically replaced:

Docker Swarm has built-in support for health check-based container replacement. When a container fails health checks, Swarm automatically stops it and starts a new one, maintaining the desired replica count.

```yaml
# Docker Swarm service with auto-healing based on health checks
services:
  api:
    image: myapp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s     # Allow 60 seconds for container initialization
    deploy:
      replicas: 3           # Maintain 3 running instances
      update_config:
        parallelism: 1      # Update one container at a time
        delay: 10s          # Wait 10 seconds between updates
      restart_policy:
        condition: on-failure  # Restart only on failure
        delay: 5s              # Wait before restart
        max_attempts: 3        # Give up after 3 restart attempts
```

---

## Tuning Health Check Parameters

### Start Period

Time before health checks count against you:

The start period is crucial for applications that take time to initialize. During this period, health check failures won't mark the container as unhealthy, giving your app time to complete migrations, warm caches, or load data.

```dockerfile
# Health check for slow-starting application
# App takes 60 seconds to initialize (database migrations, cache warmup, etc.)
# start-period prevents false unhealthy status during startup
HEALTHCHECK --start-period=60s --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Interval vs Timeout

- **Interval**: How often to check (balance freshness vs overhead)
- **Timeout**: Max wait for check to complete (should be less than interval)

These settings show standard production values. The interval should be short enough to detect problems quickly but not so frequent that it impacts performance. The timeout must be less than the interval.

```dockerfile
# Production health check timing configuration
# Check every 30s, give up after 10s, 3 failures = unhealthy
# Total time to detect failure: 30s interval * 3 retries = 90 seconds max
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD ...
```

### Retries

Avoid flapping with appropriate retries:

Higher retry counts prevent container thrashing due to brief network hiccups or garbage collection pauses. This configuration tolerates up to 5 consecutive failures before marking the container unhealthy.

```dockerfile
# Tolerant health check for environments with transient failures
# Transient failures are common, require 5 consecutive failures
# Total detection time: 10s * 5 = 50 seconds
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD ...
```

---

## Common Health Check Patterns

### PostgreSQL

PostgreSQL includes the pg_isready utility specifically designed for health checks. The second example adds an actual query to verify not just connectivity but also the ability to execute queries.

```dockerfile
# PostgreSQL health check using built-in pg_isready utility
# pg_isready checks if the server is accepting connections
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U postgres || exit 1

# More thorough check: verify connection AND query execution
# Useful when you need to confirm the database is fully operational
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD pg_isready -U postgres && psql -U postgres -c "SELECT 1" || exit 1
```

### MySQL

This health check uses the mysqladmin tool to verify MySQL is responding to connections. The password is passed via environment variable to avoid hardcoding credentials.

```dockerfile
# MySQL health check using mysqladmin ping
# -h localhost ensures local socket connection
# Password from environment variable for security
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD} || exit 1
```

### Redis

Redis provides a simple PING/PONG mechanism for health verification. The grep ensures we're getting the expected response, not just any output.

```dockerfile
# Redis health check using redis-cli
# PING command returns "PONG" when server is healthy
# grep -q quietly validates the response
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD redis-cli ping | grep -q PONG || exit 1
```

### MongoDB

MongoDB's health check uses the mongosh shell to execute an administrative command that verifies the server is responding.

```dockerfile
# MongoDB health check using mongosh (MongoDB Shell)
# adminCommand('ping') is a lightweight operation to verify server health
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD mongosh --eval "db.adminCommand('ping')" || exit 1
```

### Nginx

Nginx needs a dedicated health endpoint configured in nginx.conf. This allows the health check to verify Nginx is serving requests without affecting application logs.

```dockerfile
# Nginx health check via HTTP endpoint
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost/health || exit 1
```

With nginx.conf:

The nginx configuration below creates a /health endpoint that returns a simple text response. Access logging is disabled to avoid cluttering logs with health check requests.

```nginx
# Nginx health endpoint configuration
location /health {
  access_log off;           # Don't log health checks
  return 200 "healthy\n";   # Return plain text response
  add_header Content-Type text/plain;
}
```

### RabbitMQ

RabbitMQ provides built-in diagnostic commands for health verification. This check ensures the message broker is accepting connections on its configured ports.

```dockerfile
# RabbitMQ health check using built-in diagnostics
# check_port_connectivity verifies the broker is listening
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD rabbitmq-diagnostics check_port_connectivity || exit 1
```

---

## Monitoring Health Status

### View Health Status

These commands show how to view the health status of your containers. The docker inspect command provides detailed health check history including timing and output.

```bash
# Container list with health column showing current status
docker ps
CONTAINER ID   IMAGE    STATUS                   HEALTH
abc123         myapp    Up 2 hours               healthy
def456         myapp    Up 5 minutes (healthy)   healthy
ghi789         myapp    Up 10 minutes            unhealthy

# Get detailed health information as JSON
# Shows last 5 health check results with timing and output
docker inspect --format='{{json .State.Health}}' myapp | jq
```

### Health Check Logs

The health check log provides a history of recent checks, useful for debugging why a container was marked unhealthy.

```bash
# View health check output history
# Returns array of recent health check results
docker inspect --format='{{json .State.Health.Log}}' myapp | jq

# Output example:
# [
#   {
#     "Start": "2024-01-06T10:00:00Z",    # When check started
#     "End": "2024-01-06T10:00:01Z",      # When check completed
#     "ExitCode": 0,                       # 0 = healthy, 1 = unhealthy
#     "Output": "healthy"                  # Command output
#   },
#   ...
# ]
```

### Alert on Unhealthy

This monitoring script can be run periodically via cron to detect and alert on unhealthy containers before they cause service disruptions.

```bash
#!/bin/bash
# monitor-health.sh - Alert script for unhealthy containers

# Find all containers with unhealthy status
UNHEALTHY=$(docker ps --filter "health=unhealthy" --format "{{.Names}}")

# If any unhealthy containers found, trigger alert
if [ -n "$UNHEALTHY" ]; then
  echo "Unhealthy containers: $UNHEALTHY"
  # Send alert to Slack/PagerDuty/etc
  # curl -X POST -d "text=Unhealthy: $UNHEALTHY" $SLACK_WEBHOOK
fi
```

---

## Disabling Health Checks

Sometimes you need to disable inherited health checks:

When extending a base image that has a health check you don't want, or during debugging, you can disable health checks entirely using the NONE keyword.

```dockerfile
# Disable health check inherited from base image
HEALTHCHECK NONE
```

Docker Compose also allows disabling health checks, which is useful when the base image has a health check that doesn't apply to your use case.

```yaml
# In Compose - disable health check from base image
services:
  app:
    image: myapp
    healthcheck:
      disable: true  # Completely disable health checking
```

---

## Quick Reference

These Dockerfile examples show the most common health check patterns for quick reference when setting up new containers.

```dockerfile
# HTTP health check - most common for web services
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# TCP health check - for databases and non-HTTP services
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD nc -z localhost 5432 || exit 1

# Custom script - for complex multi-condition checks
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD /healthcheck.sh

# Disable - remove inherited health check
HEALTHCHECK NONE
```

These commands help you monitor and debug container health status from the command line.

```bash
# View health status with container names
docker ps --format "table {{.Names}}\t{{.Status}}"

# Filter containers by health status
docker ps --filter "health=healthy"     # Show only healthy
docker ps --filter "health=unhealthy"   # Show only unhealthy

# Inspect detailed health information as formatted JSON
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
