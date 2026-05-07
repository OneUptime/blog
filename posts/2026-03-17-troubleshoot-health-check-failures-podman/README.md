# How to Troubleshoot Health Check Failures in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Troubleshooting, Debugging

Description: Learn how to diagnose and fix health check failures in Podman containers with systematic debugging techniques.

---

> When a container is marked unhealthy, systematic debugging of the health check command, application state, and configuration helps you find and fix the root cause quickly.

Health check failures can be caused by many factors: incorrect commands, application errors, network issues, or misconfigured timeouts. This guide walks through a systematic approach to diagnosing and resolving health check problems.

---

## Step 1: Check the Health Status and Logs

```bash
# View the current health status

podman inspect --format='{{.State.Healthcheck.Status}}' my-app

# View detailed health check logs
podman inspect --format='{{json .State.Healthcheck}}' my-app | python3 -m json.tool

# Check the failing streak count
podman inspect --format='{{.State.Healthcheck.FailingStreak}}' my-app

# Look at the exit code and output of the last check
podman inspect --format='{{range .State.Healthcheck.Log}}Exit: {{.ExitCode}} Output: {{.Output}}{{end}}' my-app
```

## Step 2: Test the Health Check Command Manually

```bash
# Run the health check manually
podman healthcheck run my-app
echo "Exit code: $?"

# Execute the health check command directly inside the container
podman exec my-app curl -f http://localhost:8080/health
echo "Exit code: $?"

# Get a shell inside the container to investigate
podman exec -it my-app /bin/sh
```

## Step 3: Verify the Application Is Running

```bash
# Check the container logs for application errors
podman logs my-app

# Check if the application process is running
podman exec my-app ps aux

# Verify the application is listening on the expected port
podman exec my-app ss -tlnp
# or
podman exec my-app netstat -tlnp
```

## Step 4: Common Issues and Fixes

### Health check tool not installed

```bash
# Problem: curl or wget not available in the container
# Solution: Use a tool that exists or install it in the Containerfile

# Option 1: Use wget instead of curl
podman run -d --name fixed-app \
  --health-cmd "wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1" \
  alpine-app:latest

# Option 2: Install curl in the Containerfile
# RUN apk add --no-cache curl
```

### Timeout too short

```bash
# Problem: Health check times out before the application responds
# Solution: Increase the timeout
podman run -d --name longer-timeout \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-timeout 30s \
  slow-app:latest
```

### Missing start period

```bash
# Problem: Health check fails during application startup
# Solution: Add a start period
podman run -d --name with-start-period \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-start-period 60s \
  --health-interval 15s \
  slow-start-app:latest
```

### Wrong port or path

```bash
# Verify the application port inside the container
podman exec my-app curl -v http://localhost:8080/health

# Check which port the application is actually listening on
podman exec my-app ss -tlnp

# Fix the health check with the correct port
podman run -d --name correct-port \
  --health-cmd "curl -f http://localhost:3000/health || exit 1" \
  my-app:latest
```

## Step 5: Monitor Events

```bash
# Watch health status change events
podman events --filter event=health_status --since 1h
```

## Summary

Troubleshooting health check failures involves inspecting health logs, testing the command manually inside the container, verifying the application state, and checking configuration settings. Common issues include missing health check tools, insufficient timeouts, missing start periods, and incorrect ports or paths. Always test your health check command by executing it directly inside the container with `podman exec` before relying on it for automated monitoring.
