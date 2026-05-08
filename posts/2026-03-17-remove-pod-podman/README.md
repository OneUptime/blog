# How to Remove a Pod with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Cleanup

Description: Learn how to remove Podman pods and their containers to free up system resources.

---

> Removing a pod deletes the pod and all of its containers, including the infra container.

When you no longer need a pod, removing it cleans up all associated containers and reclaims system resources. Podman requires the pod to be stopped before removal unless you force it.

---

## Removing a Stopped Pod

```bash
# Stop the pod first

podman pod stop my-pod

# Remove the pod and all its containers
podman pod rm my-pod

# Verify the pod is gone
podman pod ls
```

## Force Removing a Running Pod

```bash
# Remove a running pod without stopping it first
podman pod rm --force my-pod

# This stops running containers and removes them before removing the pod
```

## Removing a Pod by ID

```bash
# Get the pod ID
POD_ID=$(podman pod ls --filter name=my-pod --format '{{.Id}}')

# Remove using the ID
podman pod rm "$POD_ID"
```

## Removing Multiple Pods

```bash
# Remove specific pods by name
podman pod rm pod-a pod-b pod-c

# Remove pods with Exited status
podman pod ls --filter status=exited -q | xargs -r podman pod rm
```

## What Gets Removed

When you remove a pod, the following are deleted:
- The infra container
- All member containers
- The pod metadata

```bash
# Before removal, list everything in the pod
podman ps -a --filter pod=my-pod
podman pod inspect my-pod --format '{{.NumContainers}} containers'

# After removal, none of these containers exist
podman pod rm --force my-pod
podman ps -a --filter pod=my-pod
# No output
```

## Volumes Are Not Removed

Named volumes used by containers in the pod are not removed when the pod is deleted.

```bash
# Volumes persist after pod removal
podman volume ls

# Remove orphaned named volumes manually
podman volume prune --all
```

## Scripted Pod Cleanup

```bash
#!/bin/bash
# Clean up a pod and verify removal

POD_NAME="my-pod"

if podman pod exists "$POD_NAME" 2>/dev/null; then
  podman pod rm --force "$POD_NAME"
  echo "Pod $POD_NAME removed"
else
  echo "Pod $POD_NAME does not exist"
fi
```

## Summary

Use `podman pod rm` to remove a pod and all its containers. Stop the pod first or use `--force` to remove it while running. Named volumes persist after pod removal and must be cleaned up separately if no longer needed.
