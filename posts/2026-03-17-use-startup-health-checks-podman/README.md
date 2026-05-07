# How to Use Startup Health Checks in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Startup Probes

Description: Learn how to use startup health checks in Podman to handle containers with slow initialization independently from regular health checks.

---

> Startup health checks provide a separate probe for container initialization, preventing the regular health check from interfering during slow application startups.

Some applications take a long time to start, whether loading machine learning models, running database migrations, or warming caches. Startup health checks let you define a separate check that runs only during initialization, handing off to the regular health check once the container is ready.

---

## Configuring a Startup Health Check

Use the `--health-startup-cmd` flag for the startup-specific check:

```bash
# Define separate startup and regular health checks

podman run -d \
  --name slow-start-app \
  --health-startup-cmd "curl -f http://localhost:8080/startup || exit 1" \
  --health-startup-interval 5s \
  --health-startup-retries 30 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-retries 3 \
  slow-start-app:latest
```

## How Startup Health Checks Work

```bash
# Phase 1: Startup check runs until it succeeds or the container is restarted
# - Uses --health-startup-cmd
# - Runs at --health-startup-interval frequency
# - Restarts the container after --health-startup-retries failed attempts
#
# Phase 2: Regular health check takes over after startup succeeds
# - Uses --health-cmd
# - Runs at --health-interval frequency
# - Allows --health-retries failures

podman run -d \
  --name phased-health-app \
  --health-startup-cmd "curl -f http://localhost:8080/ready || exit 1" \
  --health-startup-interval 3s \
  --health-startup-retries 40 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 15s \
  --health-timeout 5s \
  --health-retries 3 \
  phased-health-app:latest

# Startup phase: checks every 3s, up to 40 failed attempts before restart (about 2 minutes)
# Running phase: checks every 15s, becomes unhealthy after 3 consecutive failures
```

## Use Cases for Startup Health Checks

```bash
# Java application with slow JVM warmup
podman run -d --name spring-app \
  --health-startup-cmd "curl -f http://localhost:8080/actuator/health || exit 1" \
  --health-startup-interval 5s \
  --health-startup-retries 60 \
  --health-cmd "curl -f http://localhost:8080/actuator/health || exit 1" \
  --health-interval 20s \
  --health-retries 3 \
  spring-boot-app:latest

# ML model server that loads large models on startup
podman run -d --name ml-server \
  --health-startup-cmd "curl -f http://localhost:5000/ready || exit 1" \
  --health-startup-interval 10s \
  --health-startup-retries 30 \
  --health-cmd "curl -f http://localhost:5000/health || exit 1" \
  --health-interval 30s \
  --health-retries 3 \
  ml-server:latest
```

## Startup vs Start Period

```bash
# Start period: a grace window where regular health check failures are ignored
podman run -d --name start-period-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-start-period 120s \
  --health-interval 15s \
  start-period-app:latest

# Startup health check: a completely separate check command and configuration
podman run -d --name startup-check-app \
  --health-startup-cmd "curl -f http://localhost:8080/startup || exit 1" \
  --health-startup-interval 5s \
  --health-startup-retries 30 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 15s \
  startup-check-app:latest

# Startup checks are useful when you need a different endpoint
# and can have their own interval and retry settings
```

## Summary

Startup health checks in Podman provide a dedicated probe for container initialization that is separate from the regular health check. This is useful when you need a different command and interval specifically tuned for your application startup, with a retry count that controls when Podman restarts the container if startup keeps failing. Once the startup check passes, Podman switches to the regular health check for ongoing monitoring.
