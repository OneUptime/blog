# How to Kill a Running Container in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Operation, DevOps

Description: Learn how to forcefully terminate a running Docker container in Portainer using the kill command, and when to use it versus a graceful stop.

## Introduction

While `docker stop` sends the container's configured stop signal (`SIGTERM` by default) and waits for a graceful shutdown, `docker kill` sends an immediate `SIGKILL` (or a custom signal) without waiting. Portainer provides a **Kill** action for situations where a container is unresponsive or needs immediate termination.

## Prerequisites

- Portainer installed with a connected Docker environment
- A running container to terminate

## Stop vs. Kill

Understanding the difference:

```bash
docker stop my-container
# 1. Sends the container's stop signal (SIGTERM by default)
# 2. Waits up to --timeout seconds
#    (default: 10 seconds on Linux, 30 seconds on Windows)
# 3. If still running: sends SIGKILL

docker kill my-container
# 1. Immediately sends SIGKILL (no grace period)
# 2. Container is terminated instantly
#    (Or sends any specified signal)
```

Kill is appropriate when:
- The container is unresponsive to stop
- You need immediate termination
- The container is in a bad state and graceful shutdown doesn't matter
- From the Docker CLI, you need to send a specific signal (e.g., SIGHUP for config reload)

## Step 1: Kill a Container in Portainer

### Via the Container List

1. Navigate to **Containers** in Portainer.
2. Find the running container.
3. Click the **Kill** button.

Note: In some Portainer versions, Kill may only be available from the container details page.

### Via the Container Details Page

1. Click on the container name.
2. Click the **Kill** button in the action bar.

```bash
# Portainer's Kill button is equivalent to:

docker kill my-container

# If you need a specific signal, use the Docker CLI:
docker kill --signal SIGHUP my-container   # Config reload
docker kill --signal SIGUSR1 my-container  # Custom handler
docker kill --signal SIGTERM my-container  # Sends SIGTERM immediately; no grace period
```

## Step 2: Common Signals and Their Uses

| Signal | Typical Linux Value | Meaning | Common Use |
|--------|-------|---------|-----------|
| `SIGTERM` | 15 | Graceful termination | Normal shutdown |
| `SIGKILL` | 9 | Immediate kill | Force-terminate unresponsive container |
| `SIGHUP` | 1 | Hangup / reload | Reload config (nginx, sshd) |
| `SIGINT` | 2 | Interrupt | Like Ctrl+C |
| `SIGUSR1` | 10 | User-defined | Application-specific |
| `SIGUSR2` | 12 | User-defined | Application-specific (e.g., log rotate) |

Signal numbers can vary by architecture, so signal names are safer than numeric values.

## Step 3: Killing Unresponsive Containers

When a container doesn't respond to stop:

```bash
# Attempt graceful stop with short timeout:
docker stop --timeout 5 my-hung-container

# If that fails, force kill:
docker kill my-hung-container

# In Portainer:
# 1. Click Stop (waits grace period)
# 2. If container is still "Stopping" after a minute, click Kill
```

## Step 4: Using Kill to Reload Configuration

Portainer's **Kill** button performs a hard kill. If you need to send a non-default signal for a reload, use the Docker CLI:

```bash
# Reload nginx configuration without downtime:
docker kill --signal SIGHUP my-nginx

# Reload HAProxy config when HAProxy is running in master-worker mode:
docker kill --signal SIGUSR2 my-haproxy
```

For custom applications handling specific signals:

```python
# Python app handling SIGUSR1 for graceful log rotation
import signal
import logging

def handle_log_rotate(signum, frame):
    logging.info("Received SIGUSR1 - rotating logs")
    # Re-open log files
    for handler in logging.root.handlers[:]:
        handler.close()
        logging.root.removeHandler(handler)
    logging.basicConfig(filename='/app/logs/app.log')

signal.signal(signal.SIGUSR1, handle_log_rotate)
```

## Step 5: After Killing a Container

After a default kill, the container usually enters the **Stopped** (Exited) state unless a restart policy starts it again:

1. In Portainer, the container typically shows as stopped unless a restart policy starts it again.
2. You can view its last logs before the kill.
3. You can restart it or remove it.

Check the exit status:

```bash
docker inspect my-container | jq '.[].State'

# Output for kill:
{
  "Status": "exited",
  "ExitCode": 137,    # 128 + 9 (SIGKILL) = 137
  "OOMKilled": false
}
```

Exit code 137 means the container exited after receiving `SIGKILL`; check `OOMKilled` to distinguish an out-of-memory kill from other SIGKILL cases.

## Preventing Situations That Require Kill

Design your applications to respond to SIGTERM cleanly:

```bash
#!/bin/sh
# Entrypoint with proper signal handling

# Forward SIGTERM to the application process
_term() {
  echo "Received SIGTERM - shutting down gracefully"
  kill -TERM "$child" 2>/dev/null
}

trap _term SIGTERM

# Start the app in the background
./my-app &
child=$!

# Wait for the app to finish
wait "$child"
exit $?
```

In docker-compose.yml, use init to ensure proper signal forwarding:

```yaml
services:
  app:
    image: myorg/myapp:latest
    init: true   # Use an init process for signal forwarding and zombie reaping
    stop_grace_period: 30s
    stop_signal: SIGTERM
```

## When NOT to Use Kill

- **Data integrity**: Killing a database container mid-write can force crash recovery and risks data loss or corruption.
- **Ongoing transactions**: Kill can interrupt in-flight transactions without allowing the application to shut down gracefully.
- **File write operations**: Files may be left in a partially written state.

Prefer stop (with adequate grace period) for services with persistent state.

## Conclusion

The kill command in Portainer provides immediate container termination when graceful shutdown isn't possible or practical. Use Portainer's **Kill** action for unresponsive containers and situations requiring immediate termination. For signal-based workflows such as config reloads, use the Docker CLI with `docker kill --signal`. For regular operations, always prefer stop to allow applications to clean up gracefully. Design your applications to handle SIGTERM properly to minimize the need for force kills.
