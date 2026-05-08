# How to Configure Health Check Interval in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Configuration

Description: Learn how to configure the health check interval in Podman to control how frequently container health is evaluated.

---

> The health check interval determines how often Podman runs the health check command inside your container, balancing responsiveness with resource usage.

Choosing the right health check interval is important. Too frequent and you waste resources; too infrequent and failures go undetected for too long. Podman lets you fine-tune this interval to match your application requirements.

---

## Setting the Health Check Interval

Use the `--health-interval` flag to specify how often the health check runs:

```bash
# Run a health check every 30 seconds

podman run -d \
  --name my-api \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  my-api:latest
```

## Supported Time Formats

Podman accepts various time formats for the interval:

```bash
# Seconds
podman run -d --name app1 \
  --health-cmd "nginx -t || exit 1" \
  --health-interval 15s \
  nginx:latest

# Minutes
podman run -d --name app2 \
  --health-cmd "nginx -t || exit 1" \
  --health-interval 2m \
  nginx:latest

# Combined format
podman run -d --name app3 \
  --health-cmd "nginx -t || exit 1" \
  --health-interval 1m30s \
  nginx:latest
```

## Choosing the Right Interval

```bash
# For critical services that need fast detection (every 10 seconds)
podman run -d --name payment-service \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 10s \
  --health-retries 2 \
  payment-service:latest

# For background workers where latency is acceptable (every 2 minutes)
podman run -d --name batch-worker \
  --health-cmd "test -f /tmp/worker-alive || exit 1" \
  --health-interval 2m \
  --health-retries 5 \
  batch-worker:latest
```

## Interval in a Containerfile

You can set the default interval in a Containerfile. If you build the image with Podman, use `--format=docker` so the `HEALTHCHECK` instruction is preserved:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

# Health check runs every 45 seconds
HEALTHCHECK --interval=45s --timeout=5s --retries=3 \
  CMD python healthcheck.py || exit 1

CMD ["python", "app.py"]
```

## Viewing the Current Interval

```bash
# Inspect the configured health check interval
podman inspect --format='{{.Config.Healthcheck.Interval}}' my-api

# View full health check configuration
podman inspect --format='{{json .Config.Healthcheck}}' my-api | python3 -m json.tool
```

## Summary

The `--health-interval` flag controls how frequently Podman checks your container health. Choose shorter intervals for critical services requiring fast failure detection, and longer intervals for less critical workloads where you want to minimize overhead. The default interval is 30 seconds, which works well for most applications.
