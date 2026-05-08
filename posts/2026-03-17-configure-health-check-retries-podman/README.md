# How to Configure Health Check Retries in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Retries

Description: Learn how to configure health check retries in Podman to control how many consecutive failures mark a container as unhealthy.

---

> Health check retries prevent a single transient failure from marking your container as unhealthy, adding resilience to your monitoring setup.

A momentary spike in latency or a brief resource contention can cause a health check to fail once. By configuring retries, you ensure that Podman only marks a container as unhealthy after multiple consecutive failures, reducing false positives.

---

## Setting Health Check Retries

Use the `--health-retries` flag to define how many consecutive failures are needed:

```bash
# Require 3 consecutive failures before marking unhealthy

podman run -d \
  --name my-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-retries 3 \
  my-app:latest
```

## How Retries Work

```bash
# With retries set to 5, the container stays healthy
# even if a few checks fail intermittently
podman run -d \
  --name resilient-service \
  --health-cmd "curl -f http://localhost:3000/health || exit 1" \
  --health-interval 15s \
  --health-timeout 5s \
  --health-retries 5 \
  resilient-service:latest

# The container becomes unhealthy only after 5 consecutive failures
# A single successful check resets the failure counter
```

## Choosing the Right Retry Count

```bash
# Low retries for critical services where fast detection matters
podman run -d --name payment-gateway \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 10s \
  --health-retries 2 \
  payment-gateway:latest
# Approximate unhealthy detection time: about 2 * 10s = 20 seconds,
# plus any health check command runtime or timeout

# Higher retries for services with variable response times
podman run -d --name data-pipeline \
  --health-cmd "test -f /tmp/pipeline-healthy || exit 1" \
  --health-interval 30s \
  --health-retries 6 \
  data-pipeline:latest
# Approximate unhealthy detection time: about 6 * 30s = 3 minutes,
# plus any health check command runtime or timeout
```

## Retries in a Containerfile

```dockerfile
FROM ruby:3.2-slim

WORKDIR /app
COPY . .
RUN bundle install

# Set retries to 4 for this application
HEALTHCHECK --interval=30s --timeout=10s --retries=4 \
  CMD ruby healthcheck.rb || exit 1

CMD ["ruby", "app.rb"]
```

## Inspecting Retry Configuration

```bash
# View the configured retries
podman inspect --format='{{.Config.Healthcheck.Retries}}' my-app

# Check the current health log to see failure count
podman inspect --format='{{json .State.Health.Log}}' my-app | python3 -m json.tool
```

## Summary

The `--health-retries` flag controls how many consecutive health check failures Podman tolerates before marking a container as unhealthy. The default is 3 retries. Use fewer retries for fast failure detection on critical services, and more retries for workloads with occasional transient failures. A single successful check always resets the counter.
