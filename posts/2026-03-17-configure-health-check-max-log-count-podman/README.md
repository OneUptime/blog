# How to Configure Health Check Max Log Count in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Logging, Configuration

Description: Learn how to configure the maximum number of health check log entries stored by Podman to manage disk usage.

---

> The max log count setting limits how many health check results Podman retains, preventing unbounded log growth for long-running containers.

Long-running containers can accumulate health check log entries over time. By configuring the maximum log count, you control how many recent entries Podman keeps, balancing between having enough history for debugging and keeping disk usage manageable.

---

## Setting the Maximum Log Count

```bash
# Keep only the last 10 health check results

podman run -d \
  --name limited-logs \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-max-log-count 10 \
  my-app:latest
```

## Default Behavior

By default, Podman keeps 5 health check log entries. You can increase or decrease this:

```bash
# Keep more history for debugging (50 entries)
podman run -d \
  --name debug-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 15s \
  --health-max-log-count 50 \
  debug-app:latest

# Minimal history for resource-constrained environments (5 entries)
podman run -d \
  --name minimal-logs \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-max-log-count 5 \
  minimal-app:latest
```

## Choosing the Right Log Count

```bash
# For development: keep more entries for debugging
podman run -d --name dev-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 10s \
  --health-max-log-count 100 \
  dev-app:latest

# For production: keep enough for recent history
podman run -d --name prod-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-max-log-count 20 \
  prod-app:latest

# For edge/IoT: minimize storage usage
podman run -d --name edge-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 60s \
  --health-max-log-count 5 \
  edge-app:latest
```

## Combining with Other Log Settings

```bash
# Full logging configuration
podman run -d \
  --name fully-configured \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-max-log-count 25 \
  --health-max-log-size 1024 \
  --health-log-destination /var/log/podman-health \
  fully-configured:latest
```

## Viewing Stored Logs

```bash
# View all stored health check log entries
podman inspect --format='{{json .State.Health.Log}}' limited-logs | python3 -m json.tool

# Count current number of stored entries
podman inspect --format='{{len .State.Health.Log}}' limited-logs
```

## Summary

The `--health-max-log-count` flag controls how many health check results Podman retains per container. Older entries are automatically removed when the limit is reached. Use higher counts during development for debugging visibility, and lower counts in production or constrained environments to manage disk usage. Combine this with `--health-max-log-size` to also limit the length of each individual log entry in characters.
