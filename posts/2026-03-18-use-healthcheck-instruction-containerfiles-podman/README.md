# How to Use HEALTHCHECK Instruction in Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, HealthCheck, Container Monitoring, DevOps

Description: Learn how to use the HEALTHCHECK instruction in Containerfiles for Podman to monitor container health, detect failures, and enable automatic recovery.

---

> A running container is not necessarily a healthy container. HEALTHCHECK lets you define what "healthy" actually means for your application.

Containers can fail in subtle ways. A process might be running but stuck in a deadlock, a web server might be up but returning 500 errors, or a database connection pool might be exhausted. The HEALTHCHECK instruction in Containerfiles gives you a way to define custom health checks that Podman runs periodically to verify your application is truly functional. In this guide, we will explore how to configure and use health checks effectively.

---

## What Is the HEALTHCHECK Instruction?

The HEALTHCHECK instruction tells Podman how to test whether a container is still working correctly. When a health check is defined, Podman periodically runs the specified command inside the container and tracks the results. The container's health status will be one of three states: starting, healthy, or unhealthy.

The basic syntax is:

```dockerfile
HEALTHCHECK [OPTIONS] CMD command
```

You can also disable any inherited health check:

```dockerfile
HEALTHCHECK NONE
```

## Basic HEALTHCHECK Example

Here is a simple Containerfile for a web application with a health check:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache curl \
  && npm ci --omit=dev
COPY . .

EXPOSE 3000

HEALTHCHECK CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

This health check uses curl to hit the `/health` endpoint. If the request returns an HTTP 4xx/5xx response or the connection fails, the `|| exit 1` ensures the health check reports a failure.

Build and run it:

```bash
podman build -t my-web-app .
podman run -d --name web my-web-app
```

Check the health status:

```bash
podman inspect web --format '{{.State.Health.Status}}'
```

## HEALTHCHECK Options

The HEALTHCHECK instruction supports several timing options that control how frequently checks run and how failures are evaluated:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

The `--interval` flag sets the time between health checks, defaulting to 30 seconds. The `--timeout` flag sets the maximum time a single health check can take before it is considered failed, defaulting to 30 seconds. The `--start-period` flag provides a grace period during container startup when health check failures do not count toward the retry limit, defaulting to 0 seconds. The `--retries` flag sets how many consecutive failures are needed before the container is marked unhealthy, defaulting to 3.

## Health Checks for Different Application Types

### HTTP-Based Services

For web servers and REST APIs, HTTP checks are the most common approach:

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

This approach avoids installing curl in the image by using Python's standard library.

### Database Services

For database containers, you can check connectivity using the database client:

```dockerfile
FROM postgres:16-alpine

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD pg_isready -U postgres -d postgres || exit 1
```

PostgreSQL ships with `pg_isready`, a utility designed specifically for health checking. The longer start period accounts for database initialization time.

### Queue Workers and Background Services

Services that do not expose HTTP endpoints need different approaches. A common pattern is to use a file-based health check:

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python healthcheck.py || exit 1

CMD ["python", "worker.py"]
```

The `healthcheck.py` script might check whether the worker has processed messages recently:

```python
import sys
import os
import time

HEARTBEAT_FILE = "/tmp/worker_heartbeat"
MAX_AGE_SECONDS = 120

if not os.path.exists(HEARTBEAT_FILE):
    print("No heartbeat file found")
    sys.exit(1)

last_modified = os.path.getmtime(HEARTBEAT_FILE)
age = time.time() - last_modified

if age > MAX_AGE_SECONDS:
    print(f"Heartbeat is {age:.0f}s old, exceeds {MAX_AGE_SECONDS}s threshold")
    sys.exit(1)

print("Worker is healthy")
sys.exit(0)
```

Your worker process would periodically touch the heartbeat file to signal it is still processing:

```python
import pathlib

def update_heartbeat():
    pathlib.Path("/tmp/worker_heartbeat").touch()
```

### TCP Socket Check

For services that listen on a TCP port but do not serve HTTP:

```dockerfile
FROM redis:7-alpine

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD redis-cli ping | grep -q PONG || exit 1
```

## Custom Health Check Scripts

For complex health checks that need to verify multiple conditions, create a dedicated script:

```dockerfile
FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app
COPY . .
RUN npm ci --omit=dev

COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

HEALTHCHECK --interval=20s --timeout=10s --start-period=45s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

CMD ["node", "server.js"]
```

The health check script can verify multiple aspects of application health:

```bash
#!/bin/sh
set -e

# Check if the HTTP endpoint responds

curl -sf http://localhost:3000/health > /dev/null || exit 1

# Check if the application can reach the database
curl -sf http://localhost:3000/health/db > /dev/null || exit 1

# Check disk space (fail if less than 10% free)
USAGE=$(df /app | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$USAGE" -gt 90 ]; then
  echo "Disk usage critical: ${USAGE}%"
  exit 1
fi

exit 0
```

## Monitoring Health Status with Podman

Podman provides several commands for monitoring container health:

```bash
# View current health status
podman inspect web --format '{{.State.Health.Status}}'

# View health check logs (last 5 results)
podman inspect web --format '{{json .State.Health}}' | jq

# Run the health check manually
podman healthcheck run web

# List containers with health status
podman ps --format "{{.Names}} {{.Status}}"
```

The `podman healthcheck run` command manually triggers a health check, which is useful for debugging.

## Health Checks with Podman Compose

When using a Compose provider with Podman, you can define health checks in your compose file and use them for dependency ordering:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  api:
    build: .
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
```

The Compose specification defines `condition: service_healthy`, but actual behavior with Podman depends on the compose provider and version you use.

## Health Checks with Systemd Integration

Podman integrates with systemd through Quadlet, and health checks work well in this context when you pair them with a health failure action and a systemd restart policy. Create a Quadlet container file to manage your service:

```ini
# ~/.config/containers/systemd/web.container
[Container]
Image=my-web-app
ContainerName=web
HealthCmd=curl -f http://localhost:3000/health || exit 1
HealthInterval=15s
HealthOnFailure=kill
HealthRetries=3

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

Then reload systemd and start the service:

```bash
systemctl --user daemon-reload
systemctl --user start web
```

You can also set health check options directly when running a container:

```bash
podman run -d --name web \
  --health-cmd="curl -f http://localhost:3000/health || exit 1" \
  --health-interval=15s \
  --health-retries=3 \
  --health-on-failure=restart \
  my-web-app
```

## Best Practices

Keep health checks lightweight so they do not consume significant resources on every interval. Use the start period to account for application initialization time, especially for services that load large datasets or warm caches. Set appropriate timeouts that are long enough for the check to complete but short enough to detect hangs. Avoid checking external dependencies in your health check unless the service truly cannot function without them. Write health check endpoints that verify internal state rather than just returning 200. Use exit codes correctly: 0 for healthy, 1 for unhealthy.

## Conclusion

The HEALTHCHECK instruction transforms your containers from black boxes into observable services with built-in monitoring. By defining meaningful health checks, you enable Podman and orchestration tools to detect failures automatically and, when combined with health-failure actions or service manager policies, take corrective action. Start with a simple HTTP check for web services, and evolve your health checks as you better understand your application's failure modes.
