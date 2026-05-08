# How to Pause and Unpause a Pod in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Lifecycle, Cgroups

Description: Learn how to pause and unpause all containers in a Podman pod using cgroup freezing.

---

> Pausing a pod freezes all container processes without stopping them, preserving their memory state.

Sometimes you need to temporarily suspend a workload without shutting it down. Pausing a pod uses cgroup freezing to halt all processes in every container. The containers remain in memory with their state intact, and you can unpause them to resume exactly where they left off.

---

## Pausing a Pod

```bash
# Create a pod with containers

podman pod create --name app-pod -p 8080:80
podman run -d --pod app-pod --name web docker.io/library/nginx:alpine
podman run -d --pod app-pod --name worker docker.io/library/alpine \
  sh -c "while true; do echo working; sleep 5; done"

# Pause the pod - all processes freeze
podman pod pause app-pod

# Check the status
podman pod ls --filter name=app-pod
# STATUS shows "Paused"
```

## Verifying Containers Are Paused

```bash
# List container states within the pod
podman ps --filter pod=app-pod --format "{{.Names}} {{.Status}}"
# web Paused
# worker Paused

# Attempting to exec into a paused container will fail
podman exec web ls
# Error: container is paused, unpause the container before exec
```

## Unpausing a Pod

```bash
# Resume all containers in the pod
podman pod unpause app-pod

# Verify containers are running again
podman ps --filter pod=app-pod --format "{{.Names}} {{.Status}}"
# web Up
# worker Up

# Processes resume from where they were frozen
podman logs --tail 5 worker
```

## Use Case: Freeing CPU During Heavy Operations

```bash
# Pause a development pod while running a build
podman pod pause dev-pod

# Run a resource-intensive build
make build-all

# Resume the development pod
podman pod unpause dev-pod
```

## Use Case: Reducing Writes During a Backup

```bash
# Pause to reduce writes before a file-level backup
podman pod pause app-pod

# Back up the volumes
tar czf /backup/app-volumes.tar.gz /var/lib/containers/storage/volumes/

# Resume the pod
podman pod unpause app-pod
```

## Pausing and Unpausing in Scripts

```bash
#!/bin/bash
# Pause a pod, do maintenance, then resume

POD_NAME="app-pod"

echo "Pausing $POD_NAME..."
podman pod pause "$POD_NAME"

echo "Performing maintenance..."
# Run maintenance tasks here
sleep 5

echo "Resuming $POD_NAME..."
podman pod unpause "$POD_NAME"

echo "Done. Pod status:"
podman pod ls --filter name="$POD_NAME"
```

## Summary

Use `podman pod pause` to freeze all containers in a pod and `podman pod unpause` to resume them. Pausing preserves container memory state and is useful for temporarily freeing CPU resources, reducing writes during file-level backups, or suspending workloads during maintenance windows. For databases and other stateful services, use the application's backup or quiescing mechanism for consistency.
