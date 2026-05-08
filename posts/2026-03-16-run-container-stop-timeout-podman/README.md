# How to Run a Container with Stop Timeout in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Stop Timeout, Process Management

Description: Learn how to configure stop timeouts for Podman containers to give applications enough time for graceful shutdown before being force-killed.

---

> The stop timeout determines how long your container gets to clean up before Podman forcefully terminates it with SIGKILL.

When you stop a container, Podman first sends the stop signal (default SIGTERM, unless the image or `--stop-signal` configures a different signal) and then waits for the container to exit. If the container does not exit within the timeout period, Podman sends SIGKILL to force an immediate termination. The default timeout is 10 seconds, but applications that need to drain connections, flush data, or complete transactions may need more time.

---

## Default Stop Behavior

The default stop timeout is 10 seconds:

```bash
# This container will receive SIGTERM, then SIGKILL after 10 seconds

podman run -d --name default-timeout alpine sh -c "
  trap 'echo SIGTERM received; sleep 20; echo Done' TERM
  while true; do sleep 1; done
"

# Stop with default 10-second timeout
# The container will be force-killed after 10 seconds
time podman stop default-timeout

podman rm default-timeout
```

## Setting a Custom Stop Timeout

Use `--stop-timeout` to change how long Podman waits:

```bash
# Give the container 30 seconds to shut down
podman run -d --name long-timeout \
  --stop-timeout 30 \
  alpine sh -c "
    trap 'echo SIGTERM received; echo Cleaning up...; sleep 15; echo Cleanup done; exit 0' TERM
    echo 'Running...'
    while true; do sleep 1; done
  "

# Stop will wait up to 30 seconds
time podman stop long-timeout
podman logs long-timeout | tail -5

podman rm long-timeout
```

## Setting Timeout at Stop Time

You can also override the timeout when running `podman stop`:

```bash
# Run a container with default timeout
podman run -d --name override-test alpine sh -c "
  trap 'echo Shutting down...; sleep 25; echo Done; exit 0' TERM
  while true; do sleep 1; done
"

# Override the timeout to 60 seconds at stop time
time podman stop --time 60 override-test

podman logs override-test | tail -3
podman rm override-test
```

## Zero Timeout (Immediate Kill)

Use a timeout of 0 to skip the graceful shutdown entirely:

```bash
# Run a container
podman run -d --name immediate-kill alpine sh -c "
  trap 'echo SIGTERM received' TERM
  while true; do sleep 1; done
"

# Stop with zero timeout - sends SIGKILL immediately
podman stop --time 0 immediate-kill

# Check logs - the trap will NOT have fired
podman logs immediate-kill

podman rm immediate-kill
```

## Practical Example: Database Graceful Shutdown

Databases need time to flush data to disk:

```bash
# PostgreSQL with a generous stop timeout
podman run -d --name postgres-graceful \
  --stop-timeout 60 \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data:Z \
  postgres:16

# Give PostgreSQL up to 60 seconds to:
# - Refuse new connections and abort active transactions cleanly
# - Flush data to disk
# - Close connections cleanly
# - Write a clean shutdown marker
podman stop postgres-graceful

podman rm postgres-graceful
```

## Web Server Connection Draining

```bash
# Nginx with time to drain connections
podman run -d --name nginx-drain \
  --stop-timeout 30 \
  --stop-signal SIGQUIT \
  -p 8080:80 \
  nginx:latest

# SIGQUIT tells Nginx to stop accepting new connections
# and finish serving existing requests
# 30-second timeout gives time for long-lived connections to complete
podman stop nginx-drain

podman rm nginx-drain
```

## Application with Cleanup Tasks

```bash
# Application that needs time for cleanup
cat > /tmp/cleanup_app.sh << 'SCRIPT'
#!/bin/sh

cleanup() {
    echo "[$(date)] Received shutdown signal"
    echo "[$(date)] Saving application state..."
    sleep 3
    echo "[$(date)] Closing network connections..."
    sleep 2
    echo "[$(date)] Flushing logs..."
    sleep 2
    echo "[$(date)] Cleanup complete"
    exit 0
}

trap cleanup TERM INT

echo "[$(date)] Application started"
while true; do sleep 1; done
SCRIPT

chmod +x /tmp/cleanup_app.sh

# Run with 20-second timeout to accommodate cleanup
podman run -d --name cleanup-app \
  --stop-timeout 20 \
  -v /tmp/cleanup_app.sh:/app.sh:Z \
  alpine /app.sh

sleep 2
podman stop cleanup-app
podman logs cleanup-app

podman rm cleanup-app
```

## Verifying the Stop Timeout

```bash
# Check the configured stop timeout
podman run -d --name timeout-check \
  --stop-timeout 45 \
  alpine sleep infinity

podman inspect timeout-check --format '{{.Config.StopTimeout}}'
# Output: 45

podman stop timeout-check && podman rm timeout-check
```

## Choosing the Right Timeout

Guidelines for different workload types:

```bash
# Stateless web servers - short timeout (10-15 seconds)
podman run -d --name web --stop-timeout 15 nginx:latest

# Application servers - moderate timeout (30 seconds)
podman run -d --name app --stop-timeout 30 node:20-slim sleep infinity

# Databases - long timeout (60-120 seconds)
podman run -d --name db --stop-timeout 120 \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# Message queues - long timeout for message processing (60 seconds)
podman run -d --name queue --stop-timeout 60 alpine sleep infinity

# Quick batch jobs - minimal timeout (5 seconds)
podman run -d --name batch --stop-timeout 5 alpine sleep infinity

# Clean up
podman stop web app db queue batch 2>/dev/null
podman rm web app db queue batch 2>/dev/null
```

## Combining Stop Timeout with Stop Signal

```bash
# Full graceful shutdown configuration
podman run -d --name graceful-service \
  --stop-signal SIGQUIT \
  --stop-timeout 45 \
  --init \
  alpine sh -c "
    trap 'echo SIGQUIT received - graceful shutdown; sleep 10; exit 0' QUIT
    while true; do sleep 1; done
  "

# Podman will:
# 1. Send SIGQUIT (custom stop signal)
# 2. Wait up to 45 seconds for the container to exit
# 3. Send SIGKILL if the container is still running after 45 seconds
podman stop graceful-service
podman logs graceful-service | tail -3

podman rm graceful-service
```

## Summary

Stop timeouts in Podman control the graceful shutdown window:

- Default timeout is 10 seconds
- Use `--stop-timeout N` to set the timeout when creating the container
- Use `podman stop --time N` to override the timeout at stop time
- Use `--time 0` for immediate SIGKILL (no graceful shutdown)
- Databases and stateful services typically need 30-120 seconds
- Stateless services can use shorter timeouts (10-15 seconds)
- Combine with `--stop-signal` and `--init` for complete shutdown control

Set the timeout based on your application's actual shutdown requirements. Too short risks data loss; too long delays deployments and restarts.
