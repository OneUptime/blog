# How to Implement Docker Health Check Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Reliability, DevOps, Containers

Description: Configure effective Docker health checks with proper intervals, timeout, and startup grace periods for reliable container orchestration.

---

Docker health checks tell the container runtime whether your application is actually working, not just whether the process is running. A container can have a running process but be completely unresponsive to requests. Health checks solve this problem by probing your application at regular intervals and marking containers as unhealthy when they fail to respond.

This guide covers the HEALTHCHECK instruction syntax, timing parameters, different check types, and integration with docker-compose and orchestration systems.

## Why Health Checks Matter

Without health checks, Docker only knows if your container's main process (PID 1) is running. Consider these failure scenarios that health checks catch:

- Application deadlocked waiting for a resource
- Database connection pool exhausted
- Memory leak causing slow responses
- Application stuck in an infinite loop
- Dependency service unavailable

When a container becomes unhealthy, orchestrators like Docker Swarm or Kubernetes can automatically restart or replace it.

## The HEALTHCHECK Instruction

The HEALTHCHECK instruction defines how Docker tests your container. Here is the basic syntax:

```dockerfile
HEALTHCHECK [OPTIONS] CMD command
```

The command runs inside the container and must return one of three exit codes:

| Exit Code | Status | Meaning |
|-----------|--------|---------|
| 0 | healthy | Application is working correctly |
| 1 | unhealthy | Application is not responding properly |
| 2 | reserved | Do not use this exit code |

### Basic HEALTHCHECK Example

This Dockerfile adds a simple health check to an Nginx container that verifies the web server responds to requests:

```dockerfile
FROM nginx:alpine

# Copy custom configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY html /usr/share/nginx/html

# Health check hits the root endpoint every 30 seconds
# Allows 3 seconds for response, retries 3 times before marking unhealthy
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### HEALTHCHECK Options Explained

The HEALTHCHECK instruction accepts four timing options:

| Option | Default | Description |
|--------|---------|-------------|
| --interval | 30s | Time between health check executions |
| --timeout | 30s | Maximum time to wait for check to complete |
| --start-period | 0s | Grace period for container startup |
| --retries | 3 | Consecutive failures needed to mark unhealthy |

Here is a detailed example showing all options:

```dockerfile
HEALTHCHECK \
    --interval=30s \
    --timeout=10s \
    --start-period=60s \
    --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
```

## Tuning Health Check Timing

Choosing the right timing parameters depends on your application characteristics.

### Interval Selection

The interval determines how quickly Docker detects failures. Consider these tradeoffs:

| Interval | Detection Time | Resource Impact | Use Case |
|----------|----------------|-----------------|----------|
| 5s | Fast (15-20s) | Higher CPU/network | Critical services |
| 30s | Medium (90-120s) | Moderate | Standard applications |
| 60s | Slow (180-240s) | Low | Background workers |

For a payment processing service that needs fast failure detection:

```dockerfile
# Fast detection for critical payment service
# Checks every 5 seconds, marks unhealthy after 15 seconds of failures
HEALTHCHECK --interval=5s --timeout=2s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
```

For a batch processing worker where slight delays are acceptable:

```dockerfile
# Slower checks for background worker
# Reduces overhead while still catching failures
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD pgrep -f "worker.py" && curl -f http://localhost:8080/health || exit 1
```

### Start Period Configuration

The start-period gives your application time to initialize before health checks count against it. Failed checks during this period do not count toward the retry limit.

Calculate your start period based on:
- Application boot time
- Database migration time
- Cache warming time
- External service connections

```dockerfile
# Java application with 45 second startup time
# 60 second start period provides buffer for slow starts
HEALTHCHECK \
    --start-period=60s \
    --interval=30s \
    --timeout=5s \
    --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1
```

### Timeout Considerations

Set timeout based on your application's expected response time plus some margin:

```dockerfile
# API with 95th percentile response time of 500ms
# 3 second timeout allows for occasional slow responses
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -f --max-time 2 http://localhost:3000/health || exit 1
```

## Health Check Types

Different applications need different health check approaches. Here are the main types.

### HTTP Health Checks

HTTP checks verify that your web server responds correctly. Use curl or wget to make requests:

Using curl (more common in production images):

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

# Curl with connection timeout and max time
# -f flag fails silently on HTTP errors (4xx, 5xx)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f --connect-timeout 2 --max-time 4 http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
```

Using wget (smaller, available in Alpine):

```dockerfile
FROM python:3.12-alpine

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Wget spider mode checks URL without downloading content
# --no-verbose reduces output, --tries=1 prevents retry loops
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

### TCP Health Checks

For services that do not have HTTP endpoints (databases, message queues), use TCP checks:

```dockerfile
FROM redis:7-alpine

# Use redis-cli ping to verify Redis is responding
# This checks both TCP connectivity and Redis protocol
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD redis-cli ping | grep -q PONG || exit 1

EXPOSE 6379
CMD ["redis-server"]
```

For generic TCP port checking, use nc (netcat):

```dockerfile
FROM postgres:16-alpine

# Check if PostgreSQL is accepting connections on port 5432
# pg_isready is the preferred method for PostgreSQL
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD pg_isready -U postgres -d postgres || exit 1

EXPOSE 5432
```

### Command-Based Health Checks

Some applications need custom logic to determine health:

```dockerfile
FROM rabbitmq:3-management-alpine

# RabbitMQ provides rabbitmqctl for health checking
# Checks node health and alarms
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD rabbitmqctl node_health_check || exit 1

EXPOSE 5672 15672
```

For applications with complex health requirements:

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

# Copy custom health check script
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

CMD ["python", "worker.py"]
```

## Writing Health Check Scripts

For complex health checks, use a dedicated script. This approach provides better error handling and allows multiple checks.

### Basic Health Check Script

Create a script that checks multiple conditions:

```bash
#!/bin/sh
# healthcheck.sh - Multi-condition health check

set -e

# Check 1: Verify the main process is running
if ! pgrep -f "python worker.py" > /dev/null; then
    echo "Worker process not running"
    exit 1
fi

# Check 2: Verify the application can connect to Redis
if ! python -c "import redis; r = redis.Redis(); r.ping()" 2>/dev/null; then
    echo "Cannot connect to Redis"
    exit 1
fi

# Check 3: Verify disk space is adequate (at least 100MB free)
FREE_SPACE=$(df /app | tail -1 | awk '{print $4}')
if [ "$FREE_SPACE" -lt 102400 ]; then
    echo "Low disk space: ${FREE_SPACE}KB"
    exit 1
fi

# Check 4: Verify the health endpoint responds
if ! curl -sf http://localhost:8080/health > /dev/null; then
    echo "Health endpoint not responding"
    exit 1
fi

echo "All health checks passed"
exit 0
```

### Advanced Health Check with Dependencies

This script checks the application and its critical dependencies:

```bash
#!/bin/bash
# healthcheck-advanced.sh - Production health check

set -e

HEALTH_URL="http://localhost:8080/health"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Function to check HTTP endpoint
check_http() {
    local url=$1
    local timeout=${2:-5}

    if curl -sf --connect-timeout 2 --max-time "$timeout" "$url" > /dev/null; then
        return 0
    fi
    return 1
}

# Function to check TCP port
check_tcp() {
    local host=$1
    local port=$2
    local timeout=${3:-2}

    if nc -z -w "$timeout" "$host" "$port" 2>/dev/null; then
        return 0
    fi
    return 1
}

# Function to check process
check_process() {
    local pattern=$1

    if pgrep -f "$pattern" > /dev/null; then
        return 0
    fi
    return 1
}

# Run checks
echo "Running health checks..."

# Check main application process
if ! check_process "gunicorn"; then
    echo "FAIL: Application process not running"
    exit 1
fi
echo "PASS: Application process running"

# Check application health endpoint
if ! check_http "$HEALTH_URL" 5; then
    echo "FAIL: Health endpoint not responding"
    exit 1
fi
echo "PASS: Health endpoint responding"

# Check database connectivity
if ! check_tcp "$DB_HOST" "$DB_PORT" 2; then
    echo "WARN: Database not reachable"
    # Depending on requirements, you might exit 1 here
fi
echo "PASS: Database reachable"

# Check Redis connectivity
if ! check_tcp "$REDIS_HOST" "$REDIS_PORT" 2; then
    echo "WARN: Redis not reachable"
    # Depending on requirements, you might exit 1 here
fi
echo "PASS: Redis reachable"

echo "All health checks passed"
exit 0
```

### Health Check Script in Python

For applications that need more complex logic:

```python
#!/usr/bin/env python3
"""healthcheck.py - Application health check script"""

import sys
import os
import socket
import urllib.request
import json
from datetime import datetime, timedelta

def check_http(url, timeout=5):
    """Check if HTTP endpoint responds with 2xx status."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.status >= 200 and response.status < 300
    except Exception as e:
        print(f"HTTP check failed: {e}")
        return False

def check_tcp(host, port, timeout=2):
    """Check if TCP port is accepting connections."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        print(f"TCP check failed: {e}")
        return False

def check_file_age(filepath, max_age_minutes=5):
    """Check if a file was modified within the specified time."""
    try:
        mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
        age = datetime.now() - mtime
        return age < timedelta(minutes=max_age_minutes)
    except Exception as e:
        print(f"File age check failed: {e}")
        return False

def main():
    checks = []

    # Check 1: Application health endpoint
    health_url = os.environ.get("HEALTH_URL", "http://localhost:8080/health")
    if not check_http(health_url):
        print("FAIL: Health endpoint not responding")
        checks.append(False)
    else:
        print("PASS: Health endpoint responding")
        checks.append(True)

    # Check 2: Database connectivity
    db_host = os.environ.get("DB_HOST", "localhost")
    db_port = int(os.environ.get("DB_PORT", 5432))
    if not check_tcp(db_host, db_port):
        print(f"FAIL: Cannot connect to database at {db_host}:{db_port}")
        checks.append(False)
    else:
        print("PASS: Database connection successful")
        checks.append(True)

    # Check 3: Heartbeat file freshness (if using file-based health)
    heartbeat_file = os.environ.get("HEARTBEAT_FILE")
    if heartbeat_file:
        if not check_file_age(heartbeat_file, max_age_minutes=2):
            print("FAIL: Heartbeat file is stale")
            checks.append(False)
        else:
            print("PASS: Heartbeat file is fresh")
            checks.append(True)

    # Return result
    if all(checks):
        print("All health checks passed")
        sys.exit(0)
    else:
        print("Some health checks failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Docker Compose Health Checks

Docker Compose provides health check configuration in the service definition.

### Basic Compose Health Check

```yaml
# docker-compose.yml
version: "3.8"

services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 60s
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d app"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

volumes:
  pgdata:
```

### Health Check Test Formats

Docker Compose supports multiple test formats:

```yaml
# Format 1: CMD - Arguments passed to exec
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]

# Format 2: CMD-SHELL - Executed with /bin/sh -c
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost/health || exit 1"]

# Format 3: String (implicitly uses CMD-SHELL)
healthcheck:
  test: "curl -f http://localhost/health || exit 1"

# Format 4: NONE - Disables health check from base image
healthcheck:
  test: ["NONE"]
```

### Multi-Service Application with Dependencies

This example shows a complete application stack with proper health check dependencies:

```yaml
# docker-compose.yml
version: "3.8"

services:
  # Frontend service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://api:8080
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    depends_on:
      api:
        condition: service_healthy

  # API service
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://appuser:secret@postgres:5432/appdb
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  # Worker service
  worker:
    build:
      context: ./worker
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://appuser:secret@postgres:5432/appdb
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    healthcheck:
      test: ["CMD-SHELL", "/app/healthcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 45s
    depends_on:
      api:
        condition: service_healthy

  # PostgreSQL database
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # Redis cache
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 10s

  # RabbitMQ message broker
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
```

## Health Checks in Orchestration

Health checks integrate with container orchestration systems for automatic recovery.

### Docker Swarm Health Checks

In Swarm mode, unhealthy containers trigger automatic restarts:

```yaml
# docker-stack.yml
version: "3.8"

services:
  api:
    image: myregistry/api:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 60s
    networks:
      - app_network

networks:
  app_network:
    driver: overlay
```

### Kubernetes Probes Comparison

If you are moving from Docker to Kubernetes, here is how health checks map to Kubernetes probes:

| Docker Health Check | Kubernetes Equivalent | Purpose |
|---------------------|----------------------|---------|
| HEALTHCHECK | livenessProbe | Restart unhealthy containers |
| N/A | readinessProbe | Remove from service until ready |
| start_period | startupProbe | Handle slow-starting containers |

Here is the equivalent Kubernetes configuration:

```yaml
# kubernetes-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: myregistry/api:latest
          ports:
            - containerPort: 8080
          # Startup probe handles slow starts
          # Replaces Docker's start_period
          startupProbe:
            httpGet:
              path: /health
              port: 8080
            failureThreshold: 30
            periodSeconds: 2
          # Liveness probe restarts unhealthy containers
          # Maps to Docker HEALTHCHECK
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3
          # Readiness probe removes from service
          # No Docker equivalent
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
```

## Monitoring Health Check Status

### Checking Container Health from CLI

View health status with docker inspect:

```bash
# Get health status
docker inspect --format='{{.State.Health.Status}}' container_name

# Get last health check result
docker inspect --format='{{json .State.Health}}' container_name | jq

# List all containers with health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Filter to show only unhealthy containers
docker ps --filter "health=unhealthy"
```

### Health Check Events

Docker emits events when health status changes:

```bash
# Watch for health events
docker events --filter event=health_status

# Example output:
# container health_status: healthy (name=api_1, ...)
# container health_status: unhealthy (name=api_1, ...)
```

### Scripted Health Monitoring

This script monitors health status and sends alerts:

```bash
#!/bin/bash
# monitor-health.sh - Monitor container health and alert

WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
CHECK_INTERVAL=30

while true; do
    # Get all unhealthy containers
    UNHEALTHY=$(docker ps --filter "health=unhealthy" --format "{{.Names}}" 2>/dev/null)

    if [ -n "$UNHEALTHY" ]; then
        echo "$(date): Unhealthy containers detected: $UNHEALTHY"

        # Send alert if webhook configured
        if [ -n "$WEBHOOK_URL" ]; then
            for container in $UNHEALTHY; do
                # Get health check logs
                HEALTH_LOG=$(docker inspect --format='{{json .State.Health.Log}}' "$container" | jq -r '.[-1].Output // "No output"')

                curl -s -X POST "$WEBHOOK_URL" \
                    -H "Content-Type: application/json" \
                    -d "{\"text\": \"Container $container is unhealthy: $HEALTH_LOG\"}"
            done
        fi
    fi

    sleep $CHECK_INTERVAL
done
```

## Implementing Health Endpoints

Your application needs endpoints that accurately report health status.

### Simple Health Endpoint (Node.js)

```javascript
// health.js - Express health check routes
const express = require('express');
const router = express.Router();

// Basic health check - returns 200 if process is running
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Detailed health check - checks dependencies
router.get('/health/detailed', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {}
    };

    // Check database connection
    try {
        await db.query('SELECT 1');
        health.checks.database = { status: 'healthy' };
    } catch (err) {
        health.checks.database = { status: 'unhealthy', error: err.message };
        health.status = 'unhealthy';
    }

    // Check Redis connection
    try {
        await redis.ping();
        health.checks.redis = { status: 'healthy' };
    } catch (err) {
        health.checks.redis = { status: 'unhealthy', error: err.message };
        health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

// Readiness check - reports if ready to accept traffic
router.get('/ready', async (req, res) => {
    // Check if all dependencies are available
    const isReady = await checkDependencies();

    if (isReady) {
        res.status(200).json({ ready: true });
    } else {
        res.status(503).json({ ready: false });
    }
});

module.exports = router;
```

### Health Endpoint (Python Flask)

```python
# health.py - Flask health check blueprint
from flask import Blueprint, jsonify
import time
import psycopg2
import redis

health_bp = Blueprint('health', __name__)

start_time = time.time()

def check_database():
    """Check PostgreSQL connection."""
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        cur.execute('SELECT 1')
        cur.close()
        conn.close()
        return {'status': 'healthy'}
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}

def check_redis():
    """Check Redis connection."""
    try:
        r = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))
        r.ping()
        return {'status': 'healthy'}
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}

@health_bp.route('/health')
def health():
    """Basic health check endpoint."""
    return jsonify({'status': 'healthy'}), 200

@health_bp.route('/health/detailed')
def health_detailed():
    """Detailed health check with dependency status."""
    checks = {
        'database': check_database(),
        'redis': check_redis()
    }

    overall_status = 'healthy'
    for check in checks.values():
        if check['status'] != 'healthy':
            overall_status = 'unhealthy'
            break

    response = {
        'status': overall_status,
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'uptime_seconds': int(time.time() - start_time),
        'checks': checks
    }

    status_code = 200 if overall_status == 'healthy' else 503
    return jsonify(response), status_code

@health_bp.route('/ready')
def ready():
    """Readiness check for load balancer."""
    # Check critical dependencies
    db_check = check_database()

    if db_check['status'] == 'healthy':
        return jsonify({'ready': True}), 200
    else:
        return jsonify({'ready': False, 'reason': 'Database unavailable'}), 503
```

## Common Patterns and Gotchas

### Pattern: Gradual Degradation

Report partial health instead of binary healthy/unhealthy:

```dockerfile
# Health check script that supports degraded state
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD /app/healthcheck.sh || exit 1
```

```bash
#!/bin/bash
# healthcheck.sh - Supports degraded state

CRITICAL_CHECKS_PASSED=true
OPTIONAL_CHECKS_PASSED=true

# Critical check: Main application responding
if ! curl -sf http://localhost:8080/health > /dev/null; then
    CRITICAL_CHECKS_PASSED=false
fi

# Optional check: Cache available (degraded without it)
if ! redis-cli -h redis ping > /dev/null 2>&1; then
    OPTIONAL_CHECKS_PASSED=false
fi

# Fail only on critical checks
if [ "$CRITICAL_CHECKS_PASSED" = false ]; then
    echo "Critical health check failed"
    exit 1
fi

if [ "$OPTIONAL_CHECKS_PASSED" = false ]; then
    echo "Running in degraded mode (cache unavailable)"
fi

exit 0
```

### Gotcha: Avoid Heavy Health Checks

Do not perform expensive operations in health checks:

```dockerfile
# BAD: Health check queries database tables
HEALTHCHECK CMD curl -f http://localhost/api/users/count || exit 1

# GOOD: Health check uses lightweight endpoint
HEALTHCHECK CMD curl -f http://localhost/health || exit 1
```

### Gotcha: Handle Startup Dependencies

Do not fail health checks during expected startup delays:

```dockerfile
# BAD: No start period for slow-starting app
HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# GOOD: Adequate start period for initialization
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=120s \
    CMD curl -f http://localhost:8080/health || exit 1
```

### Gotcha: Missing Health Check Tools

Ensure your image includes the tools needed for health checks:

```dockerfile
# Alpine images may not have curl by default
FROM python:3.12-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Or use wget which is included in Alpine
HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

## Summary

Effective Docker health checks require:

1. **Choose the right check type** - HTTP for web services, TCP for databases, command for complex scenarios
2. **Tune timing parameters** - Balance detection speed against resource overhead
3. **Set adequate start periods** - Account for application initialization time
4. **Write lightweight checks** - Avoid expensive operations that could impact performance
5. **Test failure scenarios** - Verify health checks detect actual failures
6. **Monitor health status** - Track health state changes for debugging

Start with simple health checks and add complexity only when needed. A basic HTTP check that verifies your application responds is better than a complex check that occasionally fails due to timing issues.

Remember that health checks are part of your application's reliability strategy. Combine them with proper logging, metrics, and alerting for comprehensive observability.
