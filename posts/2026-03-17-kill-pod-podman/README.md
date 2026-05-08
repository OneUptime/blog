# How to Kill a Pod with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Signal, Lifecycle

Description: Learn how to send signals to all containers in a Podman pod using the kill command.

---

> The podman pod kill command sends a signal to the main process of each container in a pod, providing immediate termination when using the default SIGKILL signal.

When `podman pod stop` takes too long or a container is unresponsive, `podman pod kill` sends a signal directly to the main process of each container. By default, it sends SIGKILL for immediate termination, but you can specify any signal.

---

## Killing a Pod

```bash
# Create a pod with containers

podman pod create --name app-pod
podman run -d --pod app-pod --name web docker.io/library/nginx:alpine
podman run -d --pod app-pod --name worker docker.io/library/alpine \
  sh -c "while true; do sleep 1; done"

# Kill all containers in the pod (sends SIGKILL)
podman pod kill app-pod

# Verify containers are stopped
podman ps -a --filter pod=app-pod --format "{{.Names}} {{.Status}}"
```

## Sending a Specific Signal

```bash
# Send SIGTERM for graceful shutdown
podman pod kill --signal SIGTERM app-pod

# Send SIGHUP to trigger configuration reload
podman pod kill --signal SIGHUP app-pod

# Send SIGUSR1 for application-specific handling
podman pod kill --signal SIGUSR1 app-pod
```

## Difference Between Kill and Stop

```bash
# podman pod stop asks containers to stop, waits for the timeout, then forcibly stops them
podman pod stop --time 10 app-pod

# podman pod kill sends the signal immediately with no grace period
podman pod kill app-pod
```

## Killing a Pod by ID

```bash
# Get the pod ID
POD_ID=$(podman pod ls --filter name=app-pod --format '{{.ID}}')

# Kill using the ID
podman pod kill "$POD_ID"
```

## Killing All Pods

```bash
# Kill all running pods
podman pod ls --filter status=running -q | xargs -r podman pod kill
```

## Use Case: Recovering from a Hung Pod

```bash
# When podman pod stop hangs, use kill as a last resort
podman pod stop app-pod &
STOP_PID=$!

# Wait 15 seconds for graceful stop
sleep 15

# If stop is still running, kill the pod
if kill -0 "$STOP_PID" 2>/dev/null; then
  echo "Pod stop timed out, killing..."
  podman pod kill app-pod
fi
```

## Checking Exit Status After Kill

```bash
# Containers killed with SIGKILL will have exit code 137
podman ps -a --filter pod=app-pod --format "{{.Names}} exit={{.ExitCode}}"
# web exit=137
# worker exit=137
```

## Summary

Use `podman pod kill` when you need to immediately terminate all containers in a pod. It defaults to SIGKILL but accepts any signal via `--signal`. Reserve it for cases where graceful shutdown with `podman pod stop` is not working or not fast enough.
