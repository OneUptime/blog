# How to Troubleshoot Pod Startup Failures in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Troubleshooting, Debugging

Description: Learn how to diagnose and fix common pod startup failures in Podman.

---

> Systematic troubleshooting helps you quickly identify why a pod or its containers fail to start.

Pod startup failures can stem from image pull errors, port conflicts, resource exhaustion, volume mount issues, or container crashes. This guide walks through a systematic approach to diagnosing and resolving these problems.

---

## Step 1: Check Pod Status

```bash
# View the pod status

podman pod ls --filter name=my-pod

# If the pod shows "Degraded", one or more containers are not running as expected
# If it shows "Exited", all containers stopped
```

## Step 2: Inspect Container States

```bash
# List all containers in the pod, including failed ones
podman ps -a --filter pod=my-pod --format "table {{.Names}}\t{{.Status}}\t{{.ExitCode}}"

# Look for containers with non-zero exit codes
# Exit code 125: Podman or container engine error
# Exit code 126: Command cannot be invoked
# Exit code 127: Command not found
# Exit code 137: OOM killed or SIGKILL
# Exit code 143: SIGTERM received
```

## Step 3: Check Container Logs

```bash
# View logs from a failed container
podman logs my-container

# View logs with timestamps
podman logs --timestamps my-container

# If the container never started, check events
podman events --filter container=my-container --since 10m
```

## Common Issue: Port Conflicts

```bash
# Check if the port is already in use
ss -tlnp | grep 8080

# If another process holds the port, either stop it or use a different port
podman pod create --name my-pod -p 9090:80  # Use an alternative port
```

## Common Issue: Image Pull Failures

```bash
# Try pulling the image manually
podman pull docker.io/library/nginx:alpine

# Check for authentication issues
podman login docker.io

# Verify the image name and tag are correct
podman search nginx --limit 5
```

## Common Issue: Volume Mount Problems

```bash
# Check if the source path exists for bind mounts
ls -la /path/to/mount

# Check volume permissions
podman run --rm -v /path/to/mount:/data docker.io/library/alpine ls -la /data

# For SELinux systems, add the :Z or :z label
podman run -d --pod my-pod --name app \
  -v /path/to/mount:/data:Z \
  docker.io/library/alpine sleep 3600
```

## Common Issue: Resource Exhaustion

```bash
# Check available disk space
df -h

# Check available memory
free -h

# Check if container was OOM killed
podman inspect my-container --format '{{.State.OOMKilled}}'

# Clean up unused resources
podman system prune --all --force
```

## Common Issue: Init Container Failures

```bash
# Check init container exit codes
podman ps -a --filter pod=my-pod --format "{{.Names}} {{.ExitCode}}" | grep init

# View init container logs
podman logs init-container-name
```

## Debugging with a Shell

```bash
# Override the entrypoint to get a shell in the failing container
podman run -it --pod my-pod --entrypoint /bin/sh docker.io/library/nginx:alpine -l

# Check the environment, filesystem, and network from inside
# env
# ls -la /etc/nginx/
# ping localhost
```

## Inspecting Pod Events

```bash
# View recent events related to the pod
podman events --filter pod=my-pod --since 30m

# View system-wide container events
podman events --filter event=die --since 30m
```

## Summary

Troubleshoot pod startup failures by checking pod status, container exit codes, and container logs in that order. Common causes include port conflicts, image pull failures, volume mount errors, and resource exhaustion. Use `podman events` for a timeline of what happened and run a debug shell to inspect the container environment directly.
