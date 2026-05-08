# How to Debug Container Startup Failures in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Debugging, Troubleshooting

Description: Learn systematic approaches to diagnose and fix container startup failures in Podman, from inspecting logs and exit codes to resolving common image and configuration issues.

---

> When a container refuses to start, the answer is almost always in the logs, the exit code, or the image itself.

Container startup failures are among the most common issues developers face when working with Podman. A container might exit immediately, crash loop, or hang indefinitely. This guide walks you through a systematic debugging workflow to identify and resolve the root cause quickly.

---

## Check Container Status and Exit Codes

The first step is always to check what state the container is in and what exit code it returned.

```bash
# List all containers including stopped ones

podman ps -a

# Check the exit code of a specific container
podman inspect --format '{{.State.ExitCode}}' my-container

# Get detailed state information
podman inspect --format '{{json .State}}' my-container | python3 -m json.tool
```

Common exit codes and their meanings:

- **Exit 0**: Container completed successfully (expected for one-off tasks).
- **Exit 1**: Application error inside the container.
- **Exit 125**: Podman error (e.g., invalid flags or options).
- **Exit 126**: Command cannot be invoked (permission issue on entrypoint).
- **Exit 127**: Command not found (entrypoint or CMD does not exist).
- **Exit 137**: Container was killed with SIGKILL (often OOM killer).
- **Exit 139**: Segmentation fault inside the container.

## Inspect Container Logs

Even if a container exited immediately, Podman retains its logs.

```bash
# View logs from a stopped container
podman logs my-container

# View logs with timestamps for timing analysis
podman logs --timestamps my-container

# View only the last 50 lines
podman logs --tail 50 my-container
```

If the container starts and then exits quickly, you might see errors related to missing binaries, misconfigured environment variables, or failed application startup.

## Debug Image Issues

Sometimes the image itself is the problem. Verify the image exists and inspect its configuration.

```bash
# List local images
podman images

# Inspect the image entrypoint and command
podman inspect --format '{{.Config.Entrypoint}}' my-image:latest
podman inspect --format '{{.Config.Cmd}}' my-image:latest

# Check the image layers and history
podman history my-image:latest

# Verify the image architecture matches your system
podman inspect --format '{{.Architecture}}' my-image:latest
```

If the entrypoint binary does not exist in the image, the container will fail with exit code 127. You can override it to investigate:

```bash
# Override the entrypoint to get a shell
podman run -it --entrypoint /bin/sh my-image:latest

# If /bin/sh is not available, try /bin/bash
podman run -it --entrypoint /bin/bash my-image:latest
```

## Debug Configuration Problems

Environment variables, volumes, and port mappings can all cause startup failures.

```bash
# Run with verbose output to see what Podman is doing
podman --log-level debug run my-image:latest

# Check if required environment variables are set
podman run --env-file .env my-image:latest

# Verify volume mounts exist and are accessible
podman run -v /host/path:/container/path:Z my-image:latest

# Test without volume mounts to isolate the issue
podman run my-image:latest
```

## Debug Health Check Failures

If your container has a health check defined, it might be marked as unhealthy or restarted if a health-check failure action is configured.

```bash
# Check the health status
podman inspect --format '{{json .State.Health}}' my-container | python3 -m json.tool

# View the health check configuration
podman inspect --format '{{json .Config.Healthcheck}}' my-container | python3 -m json.tool

# Run the container without the health check to test
podman run --no-healthcheck my-image:latest
```

## Use Events to Track Container Lifecycle

Podman events give you a timeline of what happened to the container.

```bash
# View recent events for a container
podman events --filter container=my-container

# Watch events in real time while starting a container
podman events --filter event=start --filter event=die &
podman run --name test-container my-image:latest
```

## Debug with a Sidecar Approach

When you cannot get a shell inside the failing container, create a new container using the same image but with a different entrypoint.

```bash
# Start a debug container with the same image and volumes
podman run -it \
  --entrypoint /bin/sh \
  -v /same/volumes:/as/original:Z \
  --env-file same-env-file.env \
  my-image:latest

# Inside the container, manually run the entrypoint
# to see the error output directly
/docker-entrypoint.sh
```

## Common Fixes

Here are quick fixes for the most frequent startup issues:

```bash
# Fix: missing executable permission on entrypoint
# Rebuild the image with:
# RUN chmod +x /app/entrypoint.sh

# Fix: wrong line endings on entrypoint script (Windows to Linux)
podman run -it --entrypoint /bin/sh my-image:latest -c "cat -A /app/entrypoint.sh | head -5"
# If you see ^M at end of lines, fix with:
# RUN sed -i 's/\r$//' /app/entrypoint.sh

# Fix: port already in use
podman run -p 8081:8080 my-image:latest

# Fix: SELinux blocking volume mounts (use :Z or :z suffix)
podman run -v /host/data:/container/data:Z my-image:latest
```

## Summary

Debugging container startup failures follows a clear pattern: check the exit code, read the logs, inspect the image configuration, and then systematically eliminate potential causes. Podman provides all the tools you need to diagnose these issues without leaving the command line.
