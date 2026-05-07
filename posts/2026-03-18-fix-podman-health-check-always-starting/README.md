# How to Fix Podman Health Check Always Showing Starting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Health Check, Monitoring, DevOps

Description: Learn how to fix Podman health checks that remain stuck in the 'starting' state due to misconfigured commands, timing issues, permission problems, and missing tools inside containers.

---

> Podman health checks stuck in "starting" state prevent orchestration tools from routing traffic to your containers. This guide covers why health checks fail silently and how to fix timing, command, and permission issues.

You configure a health check for your Podman container, start it, and the health status shows "starting" forever. It never transitions to "healthy" or "unhealthy." Your orchestration tools or monitoring systems see the container as not ready, and traffic is never routed to it.

Health checks that stay in "starting" are almost always caused by the health check command itself failing. Podman does not show you the failure details unless you know where to look, which makes this problem particularly frustrating to debug.

---

## Understanding Podman Health Checks

A health check is a command that Podman runs periodically inside your container to determine if the application is healthy. The health check has five parameters:

- **Command**: What to run inside the container
- **Interval**: How often to run it (default: 30s)
- **Timeout**: How long to wait for the command to complete (default: 30s)
- **Retries**: How many consecutive failures before marking unhealthy (default: 3)
- **Start period**: Grace period during startup where failures do not count (default: 0s)

The health states are:

- **starting**: The container has started but hasn't passed a health check yet
- **healthy**: The health check command returned exit code 0
- **unhealthy**: The health check command failed more than the retry count

## Why Health Checks Stay in Starting

The container stays in "starting" when the health check command has not returned exit code 0 yet and Podman is still inside the configured start period. After the start period, continued failures eventually mark the container "unhealthy." If it appears stuck in "starting," this often happens when:

1. The health check command is wrong and fails immediately
2. The command hangs (times out) on every attempt
3. The start period is too long
4. Automatic health checks are disabled or have not run as expected
5. The command works but returns a non-zero exit code

## Fix 1: Check Health Check Output

The first step is to see what the health check is actually doing:

```bash
podman inspect my-container --format '{{json .State.Healthcheck}}' | python3 -m json.tool
```

This shows recent health check results including exit codes and output:

```json
{
    "Status": "starting",
    "FailingStreak": 5,
    "Log": [
        {
            "Start": "2024-01-15T10:30:00.000000000Z",
            "End": "2024-01-15T10:30:00.500000000Z",
            "ExitCode": 127,
            "Output": "/bin/sh: curl: not found"
        }
    ]
}
```

In this example, the health check uses `curl` but the container image does not have curl installed.

## Fix 2: Fix Missing Tools in the Container

Many health checks use `curl` or `wget`, but minimal container images do not include these tools:

```dockerfile
# This health check will fail in Alpine images without curl

HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1
```

**Fix for Alpine-based images:**

```dockerfile
FROM alpine:3.19
RUN apk add --no-cache curl
HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1
```

**Alternative without installing extra tools:**

Use `wget` which is included in Alpine by default:

```dockerfile
HEALTHCHECK CMD wget -qO- http://localhost:8080/health || exit 1
```

Or use the BusyBox `wget` included in Alpine for a check that does not require installing `curl`:

```dockerfile
HEALTHCHECK CMD wget --spider -q http://127.0.0.1:8080/health || exit 1
```

For applications that write a PID file or status file:

```dockerfile
HEALTHCHECK CMD test -f /app/healthy || exit 1
```

## Fix 3: Fix the Health Check Command Syntax

Podman supports two forms for health check commands, and using the wrong form causes failures:

**Shell form (runs through /bin/sh):**

```bash
podman run --health-cmd "curl -f http://localhost:8080/ || exit 1" my-image
```

**Exec form (runs directly):**

```bash
podman run --health-cmd '["curl", "-f", "http://localhost:8080/"]' my-image
```

In a Dockerfile:

```dockerfile
# Shell form - allows pipes, redirects, &&, ||
HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1

# Exec form - no shell interpretation
HEALTHCHECK CMD ["curl", "-f", "http://localhost:8080/health"]
```

Common syntax mistake:

```dockerfile
# Bad - missing CMD keyword
HEALTHCHECK curl -f http://localhost:8080/health || exit 1

# Good
HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1
```

## Fix 4: Adjust Timing Parameters

If your application takes a long time to start, the health check might be running before the application is ready. Use the start period to give your application time to initialize:

```bash
podman run \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 10s \
  --health-timeout 5s \
  --health-retries 3 \
  --health-start-period 30s \
  my-image
```

In a Dockerfile:

```dockerfile
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=30s \
  CMD curl -f http://localhost:8080/health || exit 1
```

The `--start-period` gives the application 30 seconds before health check failures count toward the retry limit. During this period, failed checks do not make the container unhealthy, so the status remains "starting" until a check succeeds or the start period expires.

However, if the start period is set too long and checks keep failing, the container can stay in "starting" longer than expected before Podman marks it unhealthy. Set it to just long enough for your application's typical startup time.

## Fix 5: Fix Permission Issues

The health check command runs as the container's configured user. If the user does not have permission to execute the health check command or access the health endpoint, the check fails:

```dockerfile
# Running as non-root user
USER 1000

# This might fail if the health check tool or endpoint is not accessible to user 1000
HEALTHCHECK CMD curl -f http://localhost:8080/health || exit 1
```

Fix custom health check scripts by ensuring the health check tool is executable:

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache curl
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod a+x /usr/local/bin/healthcheck.sh
USER 1000
HEALTHCHECK CMD /usr/local/bin/healthcheck.sh
```

Or use a health check that does not require special permissions:

```dockerfile
HEALTHCHECK CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"
```

## Fix 6: Fix Localhost and IP Binding

A common issue is the application listening only on IPv4 while `localhost` resolves to IPv6 first, or the application listening on an address that the health check is not using:

```dockerfile
# Application listens on 127.0.0.1:8080
# Health check connects to localhost:8080
# This should work, but can fail if localhost resolves to ::1 first

HEALTHCHECK CMD curl -f http://127.0.0.1:8080/health || exit 1
```

If your application binds to `0.0.0.0`, a health check to `127.0.0.1` should work for IPv4. Some containers have IPv6 issues where `localhost` resolves to `::1` but the app only listens on IPv4. Use the explicit IPv4 address:

```dockerfile
HEALTHCHECK CMD curl -f http://127.0.0.1:8080/health || exit 1
```

## Fix 7: Debug Health Checks Manually

Run the health check command manually inside the container to see exactly what happens:

```bash
# Exec into the container
podman exec -it my-container /bin/sh

# Run the health check command manually
curl -f http://localhost:8080/health
echo $?
```

If the command fails manually, you have found your problem. Common issues:

```bash
# Check if the application is actually listening
podman exec my-container ss -tlnp
# or
podman exec my-container netstat -tlnp

# Check if the health endpoint returns 200
podman exec my-container curl -v http://localhost:8080/health

# Check if the right tools exist
podman exec my-container which curl
podman exec my-container which wget
```

## Fix 8: Use Application-Native Health Checks

Instead of relying on HTTP tools, use your application's own health check mechanism:

**For PostgreSQL:**

```dockerfile
HEALTHCHECK CMD pg_isready -U postgres || exit 1
```

**For Redis:**

```dockerfile
HEALTHCHECK CMD redis-cli ping | grep PONG || exit 1
```

**For MySQL:**

```dockerfile
HEALTHCHECK CMD mysqladmin ping -h localhost || exit 1
```

**For Nginx:**

```dockerfile
HEALTHCHECK CMD nginx -t || exit 1
```

**For custom applications, create a health check script:**

```dockerfile
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh
HEALTHCHECK CMD /usr/local/bin/healthcheck.sh
```

Where `healthcheck.sh` is:

```bash
#!/bin/sh
# Check multiple conditions
if [ ! -f /app/app.pid ]; then
    echo "PID file missing"
    exit 1
fi

PID=$(cat /app/app.pid)
if ! kill -0 "$PID" 2>/dev/null; then
    echo "Process not running"
    exit 1
fi

# Check if the application can handle requests
if ! wget -qO- http://127.0.0.1:8080/health > /dev/null 2>&1; then
    echo "HTTP health check failed"
    exit 1
fi

exit 0
```

## Fix 9: Handle Podman Compose Health Checks

In Compose files, health check syntax differs slightly:

```yaml
services:
  my-app:
    image: my-application:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
```

Or using shell form:

```yaml
services:
  my-app:
    image: my-application:latest
    healthcheck:
      test: curl -f http://localhost:8080/health || exit 1
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
```

To disable a health check defined in the image:

```yaml
services:
  my-app:
    image: my-application:latest
    healthcheck:
      test: ["NONE"]
```

## Monitoring Health Check Status

Set up a simple monitoring loop:

```bash
#!/bin/bash
while true; do
    STATUS=$(podman inspect my-container --format '{{.State.Healthcheck.Status}}' 2>/dev/null)
    echo "$(date): Health status: $STATUS"
    if [ "$STATUS" = "healthy" ]; then
        echo "Container is healthy!"
        break
    fi
    sleep 5
done
```

## Conclusion

Health checks stuck in "starting" are caused by the health check command failing silently. Always inspect the health check output with `podman inspect` to see the exact error. The most common fixes are installing the health check tool (curl/wget) in the image, correcting the command syntax, adjusting timing parameters for slow-starting applications, and ensuring the health check connects to the correct address and port. Use application-native health check tools when available, and test health check commands manually inside the container before relying on them in production.
