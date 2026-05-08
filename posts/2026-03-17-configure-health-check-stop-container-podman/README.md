# How to Configure Health Check to Stop a Container in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Container Lifecycle

Description: Learn how to configure Podman health checks to gracefully stop a container when it becomes unhealthy.

---

> The stop action gracefully shuts down an unhealthy container by sending the container's configured stop signal, SIGTERM by default, allowing the application to clean up before termination.

When a container becomes unhealthy, sometimes the best course of action is to stop it gracefully rather than restart or kill it. The `--health-on-failure stop` option stops the container with its configured stop signal, giving the application time to perform cleanup operations like flushing buffers or closing connections.

---

## Configuring Stop on Health Failure

```bash
# Gracefully stop the container when health check fails

podman run -d \
  --name graceful-stop-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 20s \
  --health-timeout 10s \
  --health-retries 3 \
  --health-on-failure stop \
  my-app:latest
```

## When to Use Stop

```bash
# Use stop when the application has cleanup handlers
# that need to run (flush logs, close DB connections)
podman run -d --name db-writer \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 30s \
  --health-retries 3 \
  --health-on-failure stop \
  db-writer-service:latest

# Use stop when an external orchestrator handles restart decisions
podman run -d --name orchestrated-service \
  --health-cmd "test -f /tmp/service-alive || exit 1" \
  --health-interval 15s \
  --health-retries 5 \
  --health-on-failure stop \
  orchestrated-service:latest
```

## Stop with Custom Stop Signal and Timeout

```bash
# Configure the stop signal and timeout for graceful shutdown
podman run -d \
  --name app-with-cleanup \
  --stop-signal SIGTERM \
  --stop-timeout 30 \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 20s \
  --health-retries 3 \
  --health-on-failure stop \
  my-app:latest

# The container receives SIGTERM and has 30 seconds to shut down
# After 30 seconds, SIGKILL is sent if still running
```

## Comparing Stop, Kill, and Restart

```bash
# Stop: Graceful shutdown with SIGTERM (allows cleanup)
podman run -d --name app-stop \
  --health-cmd "test -f /usr/share/nginx/html/index.html || exit 1" \
  --health-on-failure stop \
  nginx:latest

# Kill: Immediate termination with SIGKILL (no cleanup)
podman run -d --name app-kill \
  --health-cmd "test -f /usr/share/nginx/html/index.html || exit 1" \
  --health-on-failure kill \
  nginx:latest

# Restart: Stop and start the container again
podman run -d --name app-restart \
  --health-cmd "test -f /usr/share/nginx/html/index.html || exit 1" \
  --health-on-failure restart \
  nginx:latest
```

## Monitoring Stopped Containers

```bash
# Check if a container was stopped due to health failure
podman ps -a --filter status=exited --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"

# Watch for stop events
podman events --filter event=stop
```

## Summary

The `--health-on-failure stop` option gracefully stops an unhealthy container by using the container's configured stop signal, allowing the application to execute cleanup handlers. This is ideal for services with important shutdown procedures or those managed by an external orchestrator that makes its own restart decisions. Use `--stop-timeout` to control how long Podman waits before forcefully killing the container.
