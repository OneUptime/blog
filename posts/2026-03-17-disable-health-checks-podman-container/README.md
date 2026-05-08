# How to Disable Health Checks for a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Configuration

Description: Learn how to disable health checks for Podman containers, whether defined in the image or at runtime.

---

> Sometimes you need to disable health checks, whether for debugging, testing, or when running containers in environments where health checks add unnecessary overhead.

Container images may include built-in health checks that are not always appropriate for every deployment scenario. Podman lets you disable health checks at runtime, giving you full control over whether monitoring is active for a specific container.

---

## Disabling an Image-Defined Health Check

If the image has a HEALTHCHECK instruction, you can disable it at runtime:

```bash
# Disable the health check defined in the image

podman run -d \
  --name no-healthcheck \
  --health-cmd none \
  my-app-with-healthcheck:latest

# Verify the health check is disabled
podman inspect --format='{{.Config.Healthcheck}}' no-healthcheck
```

## Using --no-healthcheck Flag

```bash
# Alternative way to disable health checks
podman run -d \
  --name disabled-check \
  --no-healthcheck \
  my-app-with-healthcheck:latest
```

## When to Disable Health Checks

```bash
# Debugging: run the container without health check interference
podman run -d \
  --name debug-session \
  --no-healthcheck \
  my-app:latest

# Attach to the container for debugging
podman exec -it debug-session /bin/bash

# One-off tasks: health checks are not useful for short-lived containers
podman run --rm \
  --no-healthcheck \
  my-app:latest /app/run-migration.sh

# Development: avoid health check noise during development
podman run -d \
  --name dev-app \
  --no-healthcheck \
  -v ./src:/app/src \
  my-app:latest
```

## Disabling in a Containerfile

You can also disable health checks in a child image:

```dockerfile
FROM my-base-image-with-healthcheck:latest

# Disable the parent image health check
HEALTHCHECK NONE

# Continue with your customizations
COPY config.yaml /app/config.yaml
CMD ["/app/server"]
```

## Verifying Health Check Is Disabled

```bash
# Check that no health check is configured
podman inspect --format='{{if .Config.Healthcheck}}Health check: {{.Config.Healthcheck.Test}}{{else}}No health check{{end}}' no-healthcheck

# Container status should not show health status
podman ps --format "table {{.Names}}\t{{.Status}}"
# Output: no-healthcheck   Up 2 minutes
```

## Re-enabling Health Checks

```bash
# Override the disabled health check with a new one
podman run -d \
  --name re-enabled \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  my-app-with-healthcheck-disabled:latest
```

## Summary

You can disable health checks in Podman using `--no-healthcheck` or `--health-cmd none` at runtime, or `HEALTHCHECK NONE` in a Containerfile. This is useful for debugging, development, short-lived containers, and environments where health checks are managed externally. You can always re-enable health checks by specifying a new `--health-cmd` when running the container.
