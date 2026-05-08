# How to Configure Health Check Log Destination in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Logging

Description: Learn how to configure the health check log destination in Podman to control where health check results are stored.

---

> Configuring the health check log destination lets you direct health check output to Podman's supported log locations for monitoring and analysis.

By default, Podman stores health check logs in its local container storage. You can configure the log destination to route health check results to a directory or to the configured events logger, making it easier to integrate with your existing monitoring and logging infrastructure.

---

## Default Health Check Logging

By default, health check results are stored in Podman's local container storage and accessible via `podman inspect`:

```bash
# Start a container with a health check

podman run -d \
  --name default-logging \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  default-logging:latest

# View health check logs from the default location
podman inspect --format='{{json .State.Healthcheck.Log}}' default-logging | python3 -m json.tool
```

## Configuring Log Destination

Use the `--health-log-destination` flag to specify where health check logs are written. Podman supports `local`, a directory path, or `events_logger`:

```bash
# Write health check logs to a specific directory
podman run -d \
  --name file-logging \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-log-destination /tmp/health-logs \
  file-logging:latest

# Health check results will be written to the specified directory
```

## Using Events for Health Check Monitoring

```bash
# Monitor health status changes via Podman events
podman events --filter event=health_status &

# Start a container with health checks
podman run -d \
  --name event-monitored \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 15s \
  --health-retries 3 \
  event-monitored:latest

# Events output shows health state transitions:
# 2026-03-17 10:00:30 health_status healthy (container=event-monitored)
```

## Integrating with External Logging

```bash
# Script to export health check logs to an external system
#!/bin/bash
CONTAINER="my-app"

while true; do
  HEALTH_JSON=$(podman inspect --format='{{json .State.Healthcheck}}' "$CONTAINER" 2>/dev/null)
  if [ -n "$HEALTH_JSON" ]; then
    # Forward health status to your logging system
    echo "$HEALTH_JSON" | logger -t "podman-health-$CONTAINER"
  fi
  sleep 30
done
```

## Combining with Max Log Settings

```bash
# Configure log destination with character and count limits
podman run -d \
  --name managed-logs \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-log-destination /var/log/podman-health \
  --health-max-log-count 50 \
  --health-max-log-size 500 \
  managed-logs:latest
```

## Summary

Podman allows you to configure health check log destinations to control where health check results are stored. The default stores logs in local container storage accessible via `podman inspect`, but you can direct them to files on disk or the configured events logger using `--health-log-destination`. Combine this with `--health-max-log-count` and `--health-max-log-size` to manage log retention and entry length, and use `podman events` for real-time health status monitoring.
