# How to Start and Stop Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Operation, DevOps

Description: Learn how to start, stop, and manage the lifecycle of Docker containers using the Portainer web interface.

## Introduction

Starting and stopping containers is the most fundamental container management operation. Portainer provides both individual and bulk container lifecycle controls through its web interface, making it easy to manage containers without memorizing Docker CLI commands.

## Prerequisites

- Portainer installed with a connected Docker environment
- At least one container deployed

## Understanding Container States

Docker containers have several possible states:

| State | Description |
|-------|-------------|
| **Running** | Container is active and executing |
| **Stopped** (Exited) | Container process has exited |
| **Paused** | Container execution is frozen |
| **Restarting** | Container is in the restart cycle |
| **Dead** | Container is defunct and can only be removed |
| **Created** | Container created but not started |

## Stopping a Single Container

### Via the Container List

1. Navigate to **Containers** in Portainer.
2. Find the container you want to stop.
3. Click the **Stop** button (square icon) in the container's row.

Portainer sends `docker stop` to the container, which:
1. Sends the configured stop signal to the main process (PID 1), `SIGTERM` by default.
2. Waits for a grace period (default: 10 seconds on Linux, 30 seconds on Windows).
3. If still running, sends `SIGKILL`.

### Via the Container Details Page

1. Click on the container name.
2. Click the **Stop** button at the top of the page.

```bash
# Equivalent Docker CLI:

docker stop my-container

# With custom timeout (30 seconds before SIGKILL):
docker stop --timeout 30 my-container
```

## Starting a Stopped Container

### Via the Container List

1. Navigate to **Containers**.
2. Check **Show stopped containers** if hidden.
3. Click the **Start** button (play icon) next to the stopped container.

### Via the Container Details Page

1. Click on the stopped container's name.
2. Click the **Start** button.

```bash
# Equivalent Docker CLI:
docker start my-container
```

## Stopping Multiple Containers at Once

Portainer supports bulk operations:

1. Navigate to **Containers**.
2. Check the checkboxes next to multiple containers.
3. Click the **Stop** button in the top action bar.

This stops all selected containers simultaneously.

## Starting Multiple Containers at Once

1. Navigate to **Containers**.
2. Check **Show stopped containers**.
3. Select the containers to start.
4. Click **Start** in the action bar.

## Managing Container Stop Behavior

### Graceful Shutdown

Well-designed applications handle `SIGTERM` gracefully:

```bash
#!/bin/sh
# Example: entrypoint.sh with graceful shutdown

# Trap SIGTERM and SIGINT
trap 'echo "Stopping service..."; kill $APP_PID; wait $APP_PID' TERM INT

# Start the application
./my-app &
APP_PID=$!

# Wait for the app to finish
wait $APP_PID
```

### Setting Stop Timeout

If your application needs more time to shut down, configure a longer timeout in the container definition you deploy through Portainer, such as your Docker Compose file:

```yaml
services:
  app:
    image: myorg/myapp:latest
    # Give the app 60 seconds to shut down gracefully
    stop_grace_period: 60s
    # Send SIGTERM first, then SIGKILL after the grace period
    stop_signal: SIGTERM
```

### Setting a Custom Stop Signal

Some applications handle different signals:

```yaml
services:
  nginx:
    image: nginx:alpine
    stop_signal: SIGQUIT   # Nginx graceful shutdown signal
    stop_grace_period: 30s
```

## Container Start Order (Dependencies)

For Docker Compose-managed applications, control startup order with `depends_on`:

```yaml
services:
  db:
    image: postgres:15-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  app:
    image: myorg/myapp:latest
    # Wait for db to be healthy before starting
    depends_on:
      db:
        condition: service_healthy
```

## Stopping Containers Before Updates

When updating a container, it's best practice to stop it cleanly first:

1. Stop the running container.
2. Remove the old container (or use "Recreate").
3. Start the new container with updated settings.

Or use the **Recreate** feature in Portainer which handles this automatically.

## Monitoring Container Start/Stop Events

In Docker Standalone environments, you can view container events in Portainer to see start/stop history:

```bash
# Equivalent: view container events
docker events --filter container=my-container

# Output:
2026-03-20T10:00:00 container stop my-container (image=myimage:latest)
2026-03-20T10:05:00 container start my-container (image=myimage:latest)
```

## Troubleshooting Start/Stop Issues

### Container Won't Stop

```bash
# Force stop (sends SIGKILL immediately):
docker kill my-container

# In Portainer: use the "Kill" button instead of "Stop"
```

### Container Won't Start

1. Click the container name in Portainer.
2. Click **Logs** to see error output.
3. Common issues:
   - Port already in use (change host port).
   - Volume path doesn't exist (create the directory first).
   - Image not found (pull the image first).
   - Environment variable missing (check env configuration).

### Container Starts Then Immediately Exits

Check the exit code and logs:

```bash
# Check exit code:
docker inspect my-container | jq '.[].State.ExitCode'

# Common exit codes:
# 0: clean exit (normal)
# 1: application error
# 137: killed (SIGKILL, often OOM)
# 139: segmentation fault
# 143: terminated (SIGTERM)
```

## Conclusion

Starting and stopping containers in Portainer is straightforward through the web UI, with support for both individual and bulk operations. Understanding container states and stop behavior - particularly grace periods and stop signals - ensures your applications shut down cleanly without data corruption or incomplete operations. For Docker Compose-managed applications, use `depends_on` with health checks to manage startup order automatically.
