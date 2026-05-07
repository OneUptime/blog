# How to Start a Pod with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Lifecycle

Description: Learn how to start a Podman pod and bring all its containers online.

---

> Starting a pod brings up the infra container and all member containers in the correct order.

When a pod is stopped, all of its containers are in an exited state. The `podman pod start` command brings the entire pod back online, starting the infra container first to establish shared namespaces, then starting each member container.

---

## Starting a Stopped Pod

```bash
# Create a pod with containers

podman pod create --name app-pod -p 8080:80
podman run -d --pod app-pod --name web docker.io/library/nginx:alpine
podman run -d --pod app-pod --name cache docker.io/library/redis:7-alpine

# Stop the pod
podman pod stop app-pod

# Start it again
podman pod start app-pod
```

## Verifying the Pod Started

```bash
# Check the pod status
podman pod ls --filter name=app-pod

# Check that all containers are running
podman ps --filter pod=app-pod
```

## Starting a Pod by ID

```bash
# Get the pod ID
POD_ID=$(podman pod ls --filter name=app-pod --format '{{.Id}}')

# Start using the ID
podman pod start "$POD_ID"
```

## Starting Multiple Pods

```bash
# Start all exited pods
podman pod ls --filter status=exited -q | xargs -r podman pod start

# Start specific pods by name
podman pod start pod-a pod-b pod-c
```

## Handling Start Failures

```bash
# If a container fails to start, the pod still starts other containers
# Check which containers failed
podman ps -a --filter pod=app-pod --format "{{.Names}} {{.Status}}"

# View logs from the failed container
podman logs <container-name>
```

## Starting a Pod in a Script

```bash
#!/bin/bash
# Script to start a pod and verify it is healthy

POD_NAME="app-pod"

podman pod start "$POD_NAME"

# Wait a moment for containers to initialize
sleep 2

# Verify all containers are running
TOTAL=$(podman pod inspect "$POD_NAME" --format '{{.NumContainers}}')
RUNNING=$(podman ps --filter pod="$POD_NAME" --format '{{.Names}}' | wc -l)

echo "Running $RUNNING of $TOTAL containers in $POD_NAME"
```

## Summary

Use `podman pod start` to bring a stopped pod and all its containers back online. The infra container starts first, followed by each member container. Check pod and container status after starting to verify everything came up correctly.
