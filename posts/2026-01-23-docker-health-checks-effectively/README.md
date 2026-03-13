# How to Use Docker Health Checks Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Health Checks, Monitoring, DevOps, Reliability

Description: Implement effective Docker health checks that accurately reflect container readiness, handle dependencies gracefully, and integrate with orchestration systems for automatic recovery.

---

Docker health checks transform containers from black boxes into observable services. A well-designed health check tells Docker whether a container is ready to serve traffic, enabling automatic restarts, load balancer integration, and proper startup ordering. Poorly designed checks cause false positives, cascading failures, and debugging nightmares.

## Basic Health Check Syntax

Define health checks in your Dockerfile:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm ci

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "index.js"]
```

Parameters explained:

- `--interval`: Time between checks (default 30s)
- `--timeout`: Maximum time for check to complete (default 30s)
- `--start-period`: Grace period for container startup (default 0s)
- `--retries`: Consecutive failures before marking unhealthy (default 3)

## Health Check in Docker Compose

```yaml
version: '3.8'

services:
  api:
    image: myapi:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  worker:
    image: myworker:latest
    healthcheck:
      test: ["CMD-SHELL", "pgrep -x worker || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
```

## Designing Effective Health Endpoints

### Basic HTTP Health Endpoint

```javascript
// Node.js Express health endpoint
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(3000);
```

### Comprehensive Health Check

Check actual dependencies, not just whether the process runs:

```javascript
// Node.js comprehensive health check
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/health', async (req, res) => {
  const checks = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: 'unknown',
    redis: 'unknown'
  };

  try {
    // Check database connectivity
    await pool.query('SELECT 1');
    checks.database = 'healthy';
  } catch (err) {
    checks.database = 'unhealthy';
  }

  try {
    // Check Redis connectivity
    await redisClient.ping();
    checks.redis = 'healthy';
  } catch (err) {
    checks.redis = 'unhealthy';
  }

  // Determine overall health
  const isHealthy = checks.database === 'healthy' && checks.redis === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks
  });
});
```

### Python FastAPI Example

```python
from fastapi import FastAPI, Response
from sqlalchemy import text
import redis
import time

app = FastAPI()
start_time = time.time()

@app.get("/health")
async def health_check(response: Response):
    checks = {
        "uptime": time.time() - start_time,
        "database": "unknown",
        "redis": "unknown"
    }

    # Check database
    try:
        async with db_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "healthy"
    except Exception:
        checks["database"] = "unhealthy"

    # Check Redis
    try:
        redis_client.ping()
        checks["redis"] = "healthy"
    except Exception:
        checks["redis"] = "unhealthy"

    is_healthy = all(v == "healthy" for k, v in checks.items() if k != "uptime")

    if not is_healthy:
        response.status_code = 503

    return {"status": "healthy" if is_healthy else "unhealthy", "checks": checks}
```

## Health Check Without curl

Many minimal images lack curl. Use alternatives:

### Using wget

```dockerfile
HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

### Using nc (netcat)

```dockerfile
# Just check if port is open
HEALTHCHECK CMD nc -z localhost 3000 || exit 1
```

### Custom Health Check Script

```dockerfile
FROM python:3.12-slim

COPY healthcheck.py /healthcheck.py
HEALTHCHECK CMD python /healthcheck.py

COPY . /app
CMD ["python", "/app/main.py"]
```

```python
# healthcheck.py
import urllib.request
import sys

try:
    response = urllib.request.urlopen('http://localhost:8000/health', timeout=5)
    if response.getcode() == 200:
        sys.exit(0)
except Exception as e:
    print(f"Health check failed: {e}")

sys.exit(1)
```

### Go Binary Health Check

Build a tiny health check binary:

```go
// healthcheck.go
package main

import (
    "net/http"
    "os"
    "time"
)

func main() {
    client := http.Client{Timeout: 5 * time.Second}
    resp, err := client.Get("http://localhost:8080/health")
    if err != nil || resp.StatusCode != 200 {
        os.Exit(1)
    }
    os.Exit(0)
}
```

```dockerfile
# Build the health check binary
FROM golang:1.22-alpine AS builder
COPY healthcheck.go .
RUN CGO_ENABLED=0 go build -o /healthcheck healthcheck.go

# Use in your final image
FROM scratch
COPY --from=builder /healthcheck /healthcheck
HEALTHCHECK CMD ["/healthcheck"]
```

## Service Dependency with Health Checks

Use health checks to order service startup:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    image: myapi:latest
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

The API container waits until postgres and redis are healthy before starting.

## Monitoring Health Status

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' mycontainer

# Get health check history
docker inspect --format='{{json .State.Health}}' mycontainer | jq

# Watch health status changes
docker events --filter 'event=health_status'
```

Output example:

```json
{
  "Status": "healthy",
  "FailingStreak": 0,
  "Log": [
    {
      "Start": "2026-01-23T10:00:00.000000000Z",
      "End": "2026-01-23T10:00:00.500000000Z",
      "ExitCode": 0,
      "Output": "{\"status\":\"healthy\"}"
    }
  ]
}
```

## Common Health Check Patterns

### Liveness vs Readiness

Docker has one health check, but you can implement both patterns:

```javascript
// Separate endpoints for different purposes
app.get('/health/live', (req, res) => {
  // Liveness: Is the process running?
  res.status(200).json({ alive: true });
});

app.get('/health/ready', async (req, res) => {
  // Readiness: Can we serve traffic?
  const dbReady = await checkDatabase();
  const cacheReady = await checkCache();

  if (dbReady && cacheReady) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});
```

Use liveness for Docker health check, readiness for load balancer checks.

### Graceful Degradation

```javascript
// Allow degraded but functional state
app.get('/health', async (req, res) => {
  const dbStatus = await checkDatabase();
  const cacheStatus = await checkCache();

  // Cache failure is acceptable (degraded performance)
  // Database failure is critical

  if (!dbStatus) {
    return res.status(503).json({ status: 'unhealthy', reason: 'database' });
  }

  const status = cacheStatus ? 'healthy' : 'degraded';
  res.status(200).json({ status, cacheAvailable: cacheStatus });
});
```

### Startup Probes

For slow-starting applications, use generous start_period:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 120s  # 2 minutes for initial startup
```

## Troubleshooting Health Check Issues

### Health Check Always Fails

```bash
# Run the health check manually
docker exec mycontainer curl -f http://localhost:3000/health

# Check if the port is listening
docker exec mycontainer netstat -tlnp

# Verify the command syntax
docker inspect mycontainer --format='{{json .Config.Healthcheck}}'
```

### Health Check Times Out

```bash
# Increase timeout for slow checks
healthcheck:
  timeout: 30s

# Or optimize the health endpoint
# Avoid heavy operations in health checks
```

### False Positives

```bash
# Health check passes but service is broken
# Add actual dependency checks, not just port checks

# Instead of:
HEALTHCHECK CMD nc -z localhost 3000

# Use:
HEALTHCHECK CMD curl -f http://localhost:3000/health
```

---

Effective health checks require balance between thoroughness and performance. Check actual dependencies, not just process existence. Use appropriate timeouts and intervals for your application's characteristics. Design health endpoints that fail fast when something is wrong, and integrate with container orchestration for automatic recovery.
