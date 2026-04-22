# How to Configure Service Resource Limits in Portainer on Swarm - Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker Swarm, Portainer, Resource Limit, Container Management, Performance

Description: Learn how to set CPU and memory resource reservations and limits for Docker Swarm services in Portainer.

## Why Set Resource Limits?

Without resource limits, a single runaway container can consume all CPU and memory on a node, starving other services. Resource limits protect cluster stability by capping how much a service can consume.

Resource Concepts

- **Reservation**: Minimum resources guaranteed to a task.
- **Limit**: Maximum resources a task can use.

## Setting Resources in Portainer

When creating or editing a Swarm service in Portainer:

1. Open the **Resources** section during service creation or editing.
2. Set **CPU reservation**, **CPU limit**, **Memory reservation**, and **Memory limit**.
3. Values for CPU are in units of CPU cores (e.g., `0.5` = half a core). Memory is in bytes (Portainer accepts MB/GB notation).

## Equivalent Compose File Configuration

```yaml
version: "3.8"

services:
  web:
    image: nginx:alpine
    deploy:
      replicas: 2
      resources:
        # Reserve at least 0.25 CPU and 128MB RAM per task
        reservations:
          cpus: "0.25"
          memory: 128M
        # Hard limit: cap at 0.5 CPU and 256MB RAM per task
        limits:
          cpus: "0.5"
          memory: 256M
```

## CLI Equivalent

```bash
# Create a service with resource limits using the CLI

docker service create \
  --name web \
  --reserve-cpu 0.25 \
  --reserve-memory 128m \
  --limit-cpu 0.5 \
  --limit-memory 256m \
  nginx:alpine

# Update resource limits on an existing service
docker service update \
  --limit-cpu 1.0 \
  --limit-memory 512m \
  web
```

## Monitoring Resource Usage

After deploying with limits, monitor usage using Portainer's built-in stats on the container detail page, or use `docker stats` on the node running the task:

```bash
# View live resource usage for running containers on the current Docker host
docker stats --no-stream

# View stats for a specific container by name
docker stats --no-stream my-container-name
```

## Tips

- Always set reservations so the scheduler can make intelligent placement decisions.
- Memory limits trigger OOM (Out of Memory) kills - set them slightly above expected peak usage.
- CPU limits cap CPU usage, but setting them too low can cause throttling and latency spikes.

## Conclusion

Configuring resource limits in Portainer is straightforward and essential for stable multi-tenant Swarm clusters. Always pair limits with reservations to ensure the scheduler distributes workloads efficiently.
