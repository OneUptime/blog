# How to Create a Pod with Resource Limits in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Resource, Cgroups, Limit

Description: Learn how to set CPU and memory resource limits for containers within a Podman pod.

---

> Resource limits prevent containers in a pod from consuming more CPU and memory than allocated, protecting host stability.

Without resource limits, a misbehaving container can starve other workloads of CPU or exhaust system memory. In Podman, you can set resource limits on individual containers within a pod. This guide shows how to configure CPU, memory, and other resource constraints.

---

## Setting Memory Limits

```bash
# Create a pod

podman pod create --name limited-pod -p 8080:80

# Run a container with a 256MB memory limit
podman run -d --pod limited-pod --name web \
  --memory 256m \
  docker.io/library/nginx:alpine

# Run a container with a 512MB memory limit and swap
podman run -d --pod limited-pod --name app \
  --memory 512m \
  --memory-swap 1g \
  docker.io/library/alpine sleep 3600
```

## Setting CPU Limits

```bash
# Limit a container to 0.5 CPUs
podman run -d --pod limited-pod --name worker \
  --cpus 0.5 \
  docker.io/library/alpine \
  sh -c "while true; do echo working; sleep 1; done"

# Limit to specific CPU cores
podman run -d --pod limited-pod --name pinned \
  --cpuset-cpus 0,1 \
  docker.io/library/alpine sleep 3600

# Set CPU shares for relative weighting
podman run -d --pod limited-pod --name low-priority \
  --cpu-shares 256 \
  docker.io/library/alpine sleep 3600
```

## Combining CPU and Memory Limits

```bash
# Set both CPU and memory limits for a production-like configuration
podman run -d --pod limited-pod --name api \
  --cpus 1.0 \
  --memory 512m \
  --memory-reservation 256m \
  docker.io/library/node:20-alpine sleep 3600
```

## Setting PIDs Limit

```bash
# Limit the number of processes a container can create
podman run -d --pod limited-pod --name safe \
  --pids-limit 100 \
  docker.io/library/alpine sleep 3600
```

## Monitoring Resource Usage Against Limits

```bash
# View resource usage for all containers in the pod
podman pod stats limited-pod --no-stream

# Check memory limit and current usage for a specific container
podman inspect web --format '{{.HostConfig.Memory}}'
podman stats web --no-stream --format "{{.MemUsage}} / {{.MemLimit}}"
```

## Updating Resource Limits at Runtime

```bash
# Update memory limit for a running container
podman update --memory 1g web

# Update CPU limit
podman update --cpus 2.0 worker
```

## Testing Memory Limits

```bash
# Attempt to allocate more memory than the limit
podman run --rm --pod limited-pod --name stress \
  --memory 64m \
  docker.io/library/python:3.12-alpine \
  python -c "a = bytearray(128 * 1024 * 1024); import time; time.sleep(10)"

# The container will be OOM-killed if it exceeds the limit
```

## Summary

Set resource limits on individual containers within a Podman pod using `--memory`, `--cpus`, `--cpu-shares`, and `--pids-limit`. Monitor usage with `podman pod stats` and update limits at runtime with `podman update`. Resource limits protect host stability and ensure fair sharing between containers.
