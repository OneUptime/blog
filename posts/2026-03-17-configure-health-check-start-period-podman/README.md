# How to Configure Health Check Start Period in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Start Period

Description: Learn how to configure the health check start period in Podman to give containers time to initialize before health checks begin counting failures.

---

> The start period gives your container a grace period to initialize before health check failures count against it.

Many applications need time to start up, load configuration, connect to databases, or warm caches. Without a start period, health checks may fail during this initialization and prematurely mark the container as unhealthy.

---

## Setting the Start Period

Use the `--health-start-period` flag to define the initialization grace period:

```bash
# Give the container 60 seconds to start before counting failures

podman run -d \
  --name java-app \
  --health-cmd "curl -f http://localhost:8080/actuator/health || exit 1" \
  --health-interval 15s \
  --health-timeout 5s \
  --health-retries 3 \
  --health-start-period 60s \
  java-app:latest
```

## How the Start Period Works

During the start period, health checks still run, but failures do not count toward the retry limit while the container is still starting. If a health check succeeds during this period, the container is immediately marked as healthy:

```bash
# Application with a slow database migration on startup
podman run -d \
  --name app-with-migration \
  --health-cmd "curl -f http://localhost:3000/ready || exit 1" \
  --health-interval 10s \
  --health-timeout 5s \
  --health-retries 3 \
  --health-start-period 120s \
  app-with-migration:latest

# During the first 120 seconds:
#   - Health checks run every 10 seconds
#   - Startup failures are ignored while the container remains in the starting state
#   - First success marks the container as healthy
# After 120 seconds:
#   - Failures count toward the 3-retry limit
```

## Choosing the Right Start Period

```bash
# Fast-starting application (Node.js, Go)
podman run -d --name fast-app \
  --health-cmd "wget -q --spider http://localhost:3000/ || exit 1" \
  --health-start-period 10s \
  --health-interval 15s \
  fast-app:latest

# Slow-starting application (Java Spring Boot, .NET)
podman run -d --name spring-app \
  --health-cmd "curl -f http://localhost:8080/actuator/health || exit 1" \
  --health-start-period 90s \
  --health-interval 20s \
  spring-boot-app:latest

# Application with data loading phase
podman run -d --name ml-service \
  --health-cmd "curl -f http://localhost:5000/health || exit 1" \
  --health-start-period 300s \
  --health-interval 30s \
  ml-model-service:latest
```

## Start Period in a Containerfile

```dockerfile
FROM openjdk:17-slim

COPY target/app.jar /app.jar

# Allow 90 seconds for JVM startup and initialization
HEALTHCHECK --interval=20s --timeout=10s --retries=3 --start-period=90s \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app.jar"]
```

## Inspecting the Start Period

```bash
# View the configured start period
podman inspect --format='{{.Config.Healthcheck.StartPeriod}}' java-app
```

## Summary

The `--health-start-period` flag provides a grace period during which startup health check failures are not counted while the container is still starting. This is essential for applications with slow startup times such as Java services, ML model loading, or database migrations. Set it slightly longer than your worst-case startup time to avoid false unhealthy states during initialization.
