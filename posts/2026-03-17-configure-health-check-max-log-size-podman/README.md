# How to Configure Health Check Max Log Size in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Logging, Storage

Description: Learn how to configure the maximum size of individual health check log entries in Podman to control storage usage.

---

> The max log size setting limits how much output each health check result can store, preventing verbose health check commands from consuming excessive disk space.

Some health check commands produce significant output, especially when they include diagnostic information or error messages. By setting a maximum log length per entry, you ensure that health check logs remain manageable without losing important status information.

---

## Setting the Maximum Log Size

```bash
# Limit each health check log entry to 500 characters

podman run -d \
  --name size-limited \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-max-log-size 500 \
  my-app:latest
```

## Why Limit Log Size

Health check commands that output diagnostic information can produce large entries:

```bash
# A verbose health check that outputs JSON diagnostics
podman run -d \
  --name verbose-check \
  --health-cmd "curl -sf http://localhost:8080/health/detailed || exit 1" \
  --health-interval 30s \
  --health-max-log-size 1024 \
  verbose-app:latest

# With an unlimited size setting, each entry could store kilobytes of output
# With --health-max-log-size 1024, output is truncated to 1024 characters
```

## Configuring for Different Scenarios

```bash
# Minimal output: simple pass/fail checks
podman run -d --name simple-check \
  --health-cmd "test -f /tmp/healthy || exit 1" \
  --health-interval 30s \
  --health-max-log-size 100 \
  simple-app:latest

# Moderate output: HTTP response with status info
podman run -d --name http-check \
  --health-cmd "curl -sf http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-max-log-size 512 \
  http-app:latest

# Detailed output: diagnostic health checks with multiple subsystems
podman run -d --name detailed-check \
  --health-cmd "/app/healthcheck.sh || exit 1" \
  --health-interval 60s \
  --health-max-log-size 4096 \
  detailed-app:latest
```

## Combining with Max Log Count

```bash
# Estimate total maximum output length for health check logs:
# total_max_characters = max_log_count * max_log_size

# Example: 20 entries * 1024 characters = up to 20,480 characters of stored output
podman run -d \
  --name bounded-logs \
  --health-cmd "curl -sf http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-max-log-count 20 \
  --health-max-log-size 1024 \
  bounded-app:latest
```

## Viewing Log Entry Sizes

```bash
# Check the output of recent health check entries
podman inspect --format='{{json .State.Health.Log}}' size-limited | python3 -m json.tool

# View just the output field to see what is being captured
podman inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' size-limited
```

## Summary

The `--health-max-log-size` flag limits the length of individual health check log entries in characters. Output exceeding this size is truncated. Use smaller sizes for simple pass/fail checks, and larger sizes when health checks produce diagnostic output you need for debugging. Combine with `--health-max-log-count` to control both the number and length of stored entries for predictable storage usage.
