# How to Write Effective Health Check Commands for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Best Practice

Description: Learn best practices for writing effective health check commands that accurately detect application failures in Podman containers.

---

> A well-written health check command should verify that your application is genuinely serving requests, not just that the process is running.

The quality of your health check command determines how accurately Podman can detect application failures. A poor health check may miss real problems or trigger false alarms. This guide covers patterns and best practices for writing health checks that reliably reflect your application state.

---

## Principles of Effective Health Checks

A good health check should:
1. Verify the application is serving its primary function
2. Complete quickly and use minimal resources
3. Return a clear pass or fail result
4. Not cause side effects in the application

## HTTP Endpoint Checks

```bash
# Basic HTTP check with curl

podman run -d --name web-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 15s \
  --health-timeout 5s \
  web-app:latest

# Using wget when curl is not available
podman run -d --name alpine-app \
  --health-cmd "wget --no-verbose --tries=1 --timeout=5 --spider http://localhost:3000/health || exit 1" \
  --health-interval 15s \
  --health-timeout 5s \
  alpine-app:latest

# Check with timeout to avoid hanging
podman run -d --name timeout-check \
  --health-cmd "curl -sf --max-time 5 http://localhost:8080/health || exit 1" \
  --health-interval 20s \
  --health-timeout 6s \
  my-app:latest
```

## Database Health Checks

```bash
# PostgreSQL readiness check
podman run -d --name postgres \
  --health-cmd "pg_isready -U postgres -d mydb || exit 1" \
  --health-interval 30s \
  --health-timeout 5s \
  postgres:15

# MySQL connection check
podman run -d --name mysql \
  --health-cmd 'mysqladmin ping -h localhost -u root --password="$MYSQL_ROOT_PASSWORD" || exit 1' \
  --health-interval 30s \
  --health-timeout 5s \
  mysql:8

# Redis ping check
podman run -d --name redis \
  --health-cmd "redis-cli ping | grep -q PONG || exit 1" \
  --health-interval 15s \
  --health-timeout 5s \
  redis:7
```

## Application-Specific Checks

```bash
# Check that a worker process is running and processing
podman run -d --name worker \
  --health-cmd "test -f /tmp/worker-heartbeat && find /tmp/worker-heartbeat -mmin -2 | grep -q . || exit 1" \
  --health-interval 60s \
  --health-timeout 5s \
  worker-app:latest

# Check a gRPC service
podman run -d --name grpc-service \
  --health-cmd "grpc_health_probe -addr=localhost:50051 -connect-timeout=2s -rpc-timeout=3s || exit 1" \
  --health-interval 15s \
  --health-timeout 5s \
  grpc-service:latest
```

## Multi-Check Health Commands

```bash
# Verify multiple dependencies in one check
podman run -d --name multi-check \
  --health-cmd "curl -sf http://localhost:8080/health && test -f /app/config.yaml || exit 1" \
  --health-interval 30s \
  --health-timeout 5s \
  multi-dep-app:latest

# Script-based health check for complex logic
podman run -d --name script-check \
  --health-cmd "/app/healthcheck.sh || exit 1" \
  --health-interval 30s \
  --health-timeout 5s \
  script-app:latest
```

A sample healthcheck.sh script:

```bash
#!/bin/bash
# Check HTTP endpoint responds
curl -sf --max-time 3 http://localhost:8080/health > /dev/null || exit 1

# Check disk space is not critically low
USAGE=$(df /app --output=pcent | tail -1 | tr -d ' %')
[ "$USAGE" -lt 95 ] || exit 1

exit 0
```

## What to Avoid

```bash
# BAD: Checking only if the process exists (does not verify functionality)
# --health-cmd "pgrep -x my-app || exit 1"

# GOOD: Check that the application is actually responding
# --health-cmd "curl -sf http://localhost:8080/health || exit 1"

# BAD: Health check that modifies application state
# --health-cmd "curl -X POST http://localhost:8080/reset || exit 1"

# GOOD: Health check that only reads state
# --health-cmd "curl -sf http://localhost:8080/status || exit 1"
```

## Summary

Effective health check commands verify actual application functionality, not just process existence. Use HTTP endpoint checks for web services, native client tools for databases, and custom scripts for complex multi-step validation. Keep health checks fast, side-effect-free, and focused on the application's core function. Always include a timeout in your check command and use `|| exit 1` to ensure proper failure signaling.
