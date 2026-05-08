# How to Restart a Pod with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Lifecycle

Description: Learn how to restart a Podman pod to refresh all its containers in a single command.

---

> Restarting a pod stops running containers and starts them again, useful for applying mounted configuration changes or recovering from errors.

Sometimes you need to cycle all containers in a pod without tearing it down. The `podman pod restart` command stops running member containers and then starts them again; stopped containers in the pod are started. This is useful after changing mounted configuration files or recovering from a misbehaving container.

---

## Restarting a Pod

```bash
# Restart a pod by name

podman pod restart my-pod

# Verify the pod is running again
podman pod ls --filter name=my-pod
```

## Restarting with Output

```bash
# The command returns the pod ID on success
podman pod restart my-pod
# Output: a1b2c3d4e5f6 (the pod ID)

# Check that all containers restarted
podman ps --filter pod=my-pod --format "{{.Names}} {{.Status}}"
```

## Restarting Multiple Pods

```bash
# Restart several pods at once
podman pod restart pod-a pod-b pod-c

# Restart all running pods
podman pod ls --filter status=running -q | xargs -r podman pod restart
```

## Use Case: Applying Configuration Changes

```bash
# Update a config file mounted into the pod
echo "new_setting=true" >> /tmp/app-config/settings.conf

# Restart the pod so containers pick up the change
podman pod restart my-pod

# Verify the container sees the new configuration
podman exec web cat /etc/app/settings.conf
```

## Use Case: Recovering from a Failed Container

```bash
# Check which container in the pod has failed
podman ps -a --filter pod=my-pod --format "{{.Names}} {{.Status}}"

# Restart the entire pod to bring everything back up
podman pod restart my-pod
```

## Scripted Restart with Health Check

```bash
#!/bin/bash
# Restart a pod and verify health

POD_NAME="my-pod"

podman pod restart "$POD_NAME"
sleep 3

# Check that the main service is responding
if podman exec web wget -qO- http://localhost:80 > /dev/null 2>&1; then
  echo "Pod restarted and healthy"
else
  echo "Pod restarted but health check failed"
fi
```

## Summary

Use `podman pod restart` to stop and start running containers in a pod, while also starting stopped containers. This is the quickest way to apply mounted configuration changes or recover from container failures without recreating the pod. Combine with health checks to verify successful restarts.
