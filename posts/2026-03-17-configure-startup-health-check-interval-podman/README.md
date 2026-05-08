# How to Configure Startup Health Check Interval in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Startup, Interval

Description: Learn how to configure the startup health check interval in Podman to control how frequently the startup probe runs during initialization.

---

> The startup health check interval controls how often Podman checks if your application has finished initializing, separate from the regular health check interval.

A shorter startup interval means faster detection of when the application is ready, while a longer interval reduces overhead during startup. This setting works independently from the regular health check interval, allowing you to optimize both phases separately.

---

## Setting the Startup Health Check Interval

```bash
# Check startup readiness every 3 seconds

podman run -d \
  --name quick-detect-app \
  --health-startup-cmd "curl -f http://localhost:8080/ready || exit 1" \
  --health-startup-interval 3s \
  --health-startup-retries 40 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  quick-detect-app:latest
```

## Startup Interval vs Regular Interval

```bash
# Frequent startup checks, less frequent regular checks
podman run -d \
  --name my-service \
  --health-startup-cmd "curl -f http://localhost:8080/ready || exit 1" \
  --health-startup-interval 2s \
  --health-startup-retries 60 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-retries 3 \
  my-service:latest

# Startup phase: checks every 2 seconds for fast readiness detection
# Running phase: checks every 30 seconds for low-overhead monitoring
```

## Choosing the Right Startup Interval

```bash
# Fast polling for latency-sensitive deployments (every 1 second)
podman run -d --name fast-deploy \
  --health-startup-cmd "curl -f http://localhost:3000/ready || exit 1" \
  --health-startup-interval 1s \
  --health-startup-retries 120 \
  --health-cmd "curl -f http://localhost:3000/health || exit 1" \
  --health-interval 15s \
  fast-deploy:latest

# Moderate polling for standard applications (every 5 seconds)
podman run -d --name standard-app \
  --health-startup-cmd "curl -f http://localhost:8080/ready || exit 1" \
  --health-startup-interval 5s \
  --health-startup-retries 24 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 20s \
  standard-app:latest

# Infrequent polling for resource-heavy startup checks (every 15 seconds)
podman run -d --name heavy-init \
  --health-startup-cmd "/app/check-data-loaded.sh || exit 1" \
  --health-startup-interval 15s \
  --health-startup-retries 20 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  heavy-init:latest
```

## Impact on Startup Failure Window

```bash
# Approximate startup failure window = interval * retries

# 2s interval * 30 retries = about 60 seconds before restart on repeated failures
podman run -d --name app-60s \
  --health-startup-cmd "curl -f http://localhost:8080/ready || exit 1" \
  --health-startup-interval 2s \
  --health-startup-retries 30 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 20s \
  app-60s:latest

# 10s interval * 30 retries = about 300 seconds (5 minutes) before restart on repeated failures
podman run -d --name app-5m \
  --health-startup-cmd "curl -f http://localhost:8080/ready || exit 1" \
  --health-startup-interval 10s \
  --health-startup-retries 30 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 20s \
  app-5m:latest
```

## Summary

The `--health-startup-interval` flag sets how often the startup health check runs during container initialization. Use shorter intervals for faster readiness detection in latency-sensitive deployments, and longer intervals when the startup check itself is resource-intensive. Remember that the approximate failure window before Podman restarts the container is the product of the interval and retries, so adjust both values together to match your application needs.
