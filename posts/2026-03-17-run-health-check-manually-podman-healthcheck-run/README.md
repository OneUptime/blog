# How to Run a Health Check Manually with podman healthcheck run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Debugging

Description: Learn how to manually trigger health checks on Podman containers using the podman healthcheck run command for testing and debugging.

---

> The `podman healthcheck run` command lets you manually trigger a health check at any time, which is invaluable for testing and debugging.

Sometimes you need to run a health check on demand rather than waiting for the next scheduled interval. Podman provides the `podman healthcheck run` command to trigger a health check immediately, making it easy to test your health check configuration.

---

## Running a Health Check Manually

```bash
# Run the health check for a specific running container

podman healthcheck run my-web-app

# The command returns the exit code:
# 0 = healthy
# 1 = unhealthy
# 125 = Podman error, such as a missing container, no health check, or a stopped container
echo $?
```

## Using Manual Health Checks for Debugging

```bash
# Start a container with a health check
podman run -d \
  --name debug-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 60s \
  debug-app:latest

# Immediately test the health check without waiting
podman healthcheck run debug-app

# Check the detailed result after the manual run
podman inspect --format='{{json .State.Health}}' debug-app | python3 -m json.tool
```

## Scripting with Manual Health Checks

```bash
# Wait for a container to become healthy before proceeding
podman run -d \
  --name my-service \
  --health-cmd "curl -f http://localhost:8080/ready || exit 1" \
  --health-interval 30s \
  --health-start-period 60s \
  my-service:latest

# Poll the health check manually until healthy
MAX_ATTEMPTS=20
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if podman healthcheck run my-service > /dev/null 2>&1; then
    echo "Container is healthy after $ATTEMPT attempts"
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  echo "Attempt $ATTEMPT: not healthy yet, waiting..."
  sleep 3
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "Container failed to become healthy"
  exit 1
fi
```

## Manual Health Check in CI/CD Pipelines

```bash
#!/bin/bash
# deploy-and-verify.sh

# Start the new container
podman run -d \
  --name app-v2 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  app:v2

# Verify health before routing traffic
sleep 5
if podman healthcheck run app-v2; then
  echo "Deployment verified, switching traffic"
  # Switch traffic to new container
else
  echo "Health check failed, rolling back"
  podman stop app-v2
  podman rm app-v2
  exit 1
fi
```

## Viewing Manual Health Check Output

```bash
# Run the check and immediately inspect the log
podman healthcheck run my-web-app
podman inspect --format='{{(index .State.Health.Log 0).Output}}' my-web-app
podman inspect --format='{{(index .State.Health.Log 0).ExitCode}}' my-web-app
```

## Summary

The `podman healthcheck run` command triggers a health check immediately, bypassing the regular interval. This is useful for debugging health check configurations, testing during development, scripting startup dependencies, and verifying deployments in CI/CD pipelines. The command returns exit code 0 for healthy, 1 for unhealthy, and 125 for Podman errors such as a missing container, a container without a health check, or a stopped container, making it easy to use in scripts.
