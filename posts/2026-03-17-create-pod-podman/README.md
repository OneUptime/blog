# How to Create a Pod with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Orchestration

Description: Learn how to create pods in Podman to group related containers that share networking and resources.

---

> Pods in Podman group containers together so they share a network namespace, just like Kubernetes pods.

A pod is a group of one or more containers that share the same network namespace, meaning they can communicate over localhost. Podman borrowed this concept directly from Kubernetes. Pods are useful when you have tightly coupled services that need to share network interfaces, such as an application server and its sidecar proxy.

---

## Creating a Basic Pod

```bash
# Create a new empty pod

podman pod create --name my-pod

# Verify the pod was created
podman pod ls
```

When you create a pod, Podman automatically creates an infra container that holds the shared namespaces. This container runs a minimal pause process and stays alive while the pod is running.

## Adding Containers to the Pod

```bash
# Run a container inside the pod
podman run -d --pod my-pod --name web docker.io/library/nginx:alpine

# Run a second container inside the same pod
podman run -d --pod my-pod --name sidecar docker.io/library/alpine sleep 3600
```

## Verifying Shared Networking

```bash
# The sidecar can reach nginx on localhost because they share the network namespace
podman exec sidecar wget -qO- http://localhost:80

# Both containers see the same network interfaces
podman exec web ip addr show
podman exec sidecar ip addr show
```

## Listing Containers in a Pod

```bash
# List all containers that belong to the pod
podman ps --filter pod=my-pod

# Show pod details including container count
podman pod inspect my-pod --format '{{.NumContainers}} containers'
```

## Stopping and Removing a Pod

```bash
# Stop all containers in the pod
podman pod stop my-pod

# Remove the pod and all its containers
podman pod rm my-pod
```

## Creating a Pod and Containers in Sequence

```bash
# Create a pod and run containers in sequence
podman pod create --name app-pod
podman run -d --pod app-pod --name app docker.io/library/node:20-alpine sleep 3600
podman run -d --pod app-pod --name cache docker.io/library/redis:7-alpine
```

## Summary

Pods in Podman group containers into a shared network namespace. Create a pod with `podman pod create`, add containers with `--pod`, and they can communicate over localhost. This mirrors Kubernetes pod behavior and is ideal for tightly coupled services.
