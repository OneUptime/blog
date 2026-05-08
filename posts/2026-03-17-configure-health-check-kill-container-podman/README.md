# How to Configure Health Check to Kill a Container in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Health Check, Container Management

Description: Learn how to configure Podman health checks to automatically kill a container when it becomes unhealthy.

---

> The kill action immediately terminates an unhealthy container with SIGKILL, useful when a graceful shutdown is not possible or desirable.

In some scenarios, you want an unhealthy container to be killed immediately rather than stopped gracefully or restarted. The `--health-on-failure kill` option sends a SIGKILL signal to the container, terminating it without allowing cleanup, which is appropriate when the application is in a corrupted state.

---

## Configuring Kill on Health Failure

```bash
# Kill the container immediately when health check fails

podman run -d \
  --name kill-on-fail \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 15s \
  --health-timeout 5s \
  --health-retries 3 \
  --health-on-failure kill \
  my-app:latest
```

## When to Use Kill vs Stop vs Restart

```bash
# Use kill when the application may be in a corrupted state
# and graceful shutdown handlers might hang
podman run -d --name stuck-handler \
  --health-cmd "curl -sf http://localhost:8080/health || exit 1" \
  --health-interval 20s \
  --health-retries 2 \
  --health-on-failure kill \
  legacy-app:latest

# Use kill when you need immediate termination and an external
# process will handle recovery
podman run -d --name externally-managed \
  --health-cmd "test -f /tmp/healthy || exit 1" \
  --health-interval 10s \
  --health-retries 3 \
  --health-on-failure kill \
  worker-app:latest
```

## Kill with External Recovery

```bash
# Start a container that will be killed on failure
podman run -d \
  --name monitored-service \
  --health-cmd "curl -f http://localhost:3000/health || exit 1" \
  --health-interval 15s \
  --health-retries 3 \
  --health-on-failure kill \
  monitored-service:latest

# External watcher script to restart killed containers
#!/bin/bash
while true; do
  STATUS=$(podman inspect --format='{{.State.Status}}' monitored-service 2>/dev/null)
  if [ "$STATUS" = "exited" ] || [ "$STATUS" = "" ]; then
    echo "Container was killed, performing cleanup and restart..."
    podman rm -f monitored-service 2>/dev/null
    # Run any pre-start cleanup
    podman run -d \
      --name monitored-service \
      --health-cmd "curl -f http://localhost:3000/health || exit 1" \
      --health-interval 15s \
      --health-retries 3 \
      --health-on-failure kill \
      monitored-service:latest
  fi
  sleep 10
done
```

## Monitoring Kill Events

```bash
# Watch for container kill events
podman events --filter event=kill

# Check status and exit code after a health-check-triggered kill
podman inspect --format='{{.State.Status}} {{.State.ExitCode}}' kill-on-fail
```

## Summary

The `--health-on-failure kill` option immediately terminates an unhealthy container with SIGKILL. Use this when graceful shutdown is not possible, when the application may be deadlocked, or when an external system manages container lifecycle recovery. Unlike `stop`, `kill` does not wait for the container process to exit gracefully, and unlike `restart`, it does not automatically bring the container back up.
