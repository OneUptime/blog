# How to Stop a Pod with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Lifecycle

Description: Learn how to gracefully stop a Podman pod and all of its containers.

---

> By default, stopping a pod sends a SIGTERM to each container, giving them time to shut down gracefully before forcing termination.

When you stop a pod, Podman sends a termination signal to each container in the pod. Containers are given a grace period to clean up before being forcefully stopped. This ensures databases can flush writes, web servers can finish in-flight requests, and applications can release resources.

---

## Stopping a Pod

```bash
# Stop a running pod by name

podman pod stop my-pod

# Verify the pod is stopped
podman pod ls --filter name=my-pod
```

## Specifying a Stop Timeout

```bash
# Give containers 30 seconds to shut down gracefully
podman pod stop --time 30 my-pod

# Use a shorter timeout for quick shutdowns
podman pod stop --time 5 my-pod

# Timeout of 0 forces termination immediately after SIGTERM
podman pod stop --time 0 my-pod
```

## Stopping a Pod by ID

```bash
# Get the pod ID
POD_ID=$(podman pod ls --filter name=my-pod --format '{{.ID}}')

# Stop using the ID
podman pod stop "$POD_ID"
```

## Stopping Multiple Pods

```bash
# Stop specific pods by name
podman pod stop pod-a pod-b pod-c

# Stop all running pods
podman pod ls --filter status=running -q | xargs -r podman pod stop
```

## Checking Container Exit Codes

```bash
# After stopping, check how each container exited
podman ps -a --filter pod=my-pod --format "{{.Names}}\t{{.ExitCode}}\t{{.Status}}"

# Exit code 0 means clean shutdown
# Non-zero exit codes indicate errors or forced termination
```

## Stopping a Pod in a Script

```bash
#!/bin/bash
# Gracefully stop a pod and verify shutdown

POD_NAME="my-pod"

echo "Stopping pod: $POD_NAME"
podman pod stop --time 15 "$POD_NAME"

# Verify all containers are stopped
RUNNING=$(podman ps --filter pod="$POD_NAME" -q | wc -l)
if [ "$RUNNING" -eq 0 ]; then
  echo "Pod stopped successfully"
else
  echo "Warning: $RUNNING containers still running"
fi
```

## Summary

Use `podman pod stop` to gracefully shut down all containers in a pod. Set `--time` to control the grace period before forced termination. Check exit codes after stopping to verify clean shutdowns and diagnose any issues.
