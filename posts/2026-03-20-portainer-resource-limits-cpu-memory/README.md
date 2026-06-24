# How to Set Container Resource Limits (CPU and Memory) in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Performance, DevOps

Description: Learn how to set CPU and memory resource limits and reservations on Docker containers in Portainer to prevent resource contention.

## Introduction

Without resource limits, a single runaway container can consume all available CPU or memory on a host, starving other containers and degrading system stability. Portainer provides a straightforward interface for setting memory reservations and both CPU and memory limits on standalone containers, and stack files can define reservations for Swarm services.

## Prerequisites

- Portainer installed with a connected Docker environment
- Basic understanding of CPU and memory concepts

## Understanding Limits vs. Reservations

Docker supports hard limits and soft constraints, but CPU and memory reservations do not behave identically:

| Type | CPU | Memory | Description |
|------|-----|--------|-------------|
| **Limit** (hard) | `--cpus` | `--memory` | Maximum allowed - enforced as a ceiling |
| **Soft constraint / reservation** | `--cpu-shares` | `--memory-reservation` | `--cpu-shares` is a relative CPU weight; `--memory-reservation` is a soft memory limit used under host pressure |

- **Limit**: Container cannot exceed this amount. If memory pressure hits the limit, the kernel may OOM-kill processes in the container.
- **Memory reservation**: Soft limit activated when Docker detects low memory or contention on the host.
- **CPU shares**: Relative weight when CPU is contended; it does not guarantee a minimum amount of CPU.

## Step 1: Set Resources During Container Creation

1. Navigate to **Containers > Add container**.
2. Set the container name and image.
3. Scroll to **Advanced container settings**, then open **Runtime & Resources**.

## Step 2: Configure Memory Limits

### Memory Limit (Hard Limit)

Enter the maximum memory the container can use:

```text
Memory limit: 512   (MB)
# If the workload exceeds 512 MB, the kernel may OOM-kill processes in the container

```

Common values:
- Small service: 128-256 MB
- Medium application: 512 MB - 1 GB
- Large application (Java, Node): 1-2 GB
- Database: 2-4 GB

### Memory Reservation (Soft Limit)

Enter the soft memory reservation for the container:

```text
Memory reservation: 256   (MB)
# Used as a soft limit when Docker detects host memory contention
```

The reservation should be lower than the memory limit.

### Memory + Swap (CLI / Compose)

Portainer's current standalone container form exposes memory reservation and memory limit. If you are setting swap via Docker CLI or Compose, the values work like this:

```text
Memory limit:  512 MB
Memory swap:   1024 MB   (total memory + swap)
# Swap available = 1024 - 512 = 512 MB of swap
```

Setting swap to the same value as the memory limit disables swap:

```text
Memory limit: 512 MB
Memory swap:  512 MB   # No additional swap available
```

## Step 3: Configure CPU Limits

### CPU Limit

Specify how many CPUs the container can use:

```text
CPU limit: 0.5
# Container can use up to 50% of one CPU core

CPU limit: 2.0
# Container can use up to 2 full CPU cores
```

This maps to Docker's `--cpus` flag.

### CPU Reservation

For standalone containers, Portainer exposes **Maximum CPU usage** but not a separate CPU reservation field. Docker's `--cpu-shares` is a relative weight under CPU contention, not a guaranteed minimum. For Swarm services and stack files that use `deploy.resources.reservations`, CPU reservations can be defined there.

## Docker Compose Equivalent

For Swarm stacks (`docker stack deploy` / Portainer on Docker Swarm):

```yaml
version: "3.8"

services:
  # Web application with resource limits
  web:
    image: myorg/webapp:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'       # Max 0.5 CPU cores
          memory: 512M      # Max 512 MB RAM
        reservations:
          cpus: '0.25'      # Reserved 0.25 CPU cores
          memory: 256M      # Reserved 256 MB RAM

  # Database with higher limits
  postgres:
    image: postgres:15-alpine
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Background worker with CPU limit
  worker:
    image: myorg/worker:latest
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 256M
```

Note: On standalone Docker/Compose, the `deploy` section may be ignored if the platform does not implement it. For standalone Compose, place resource settings under the service:

```yaml
services:
  app:
    image: myapp:latest
    mem_limit: 512m
    mem_reservation: 256m
    memswap_limit: 512m
    cpus: 0.5
```

## Step 4: Monitor Resource Usage

After setting limits, verify containers are within bounds:

1. In Portainer, navigate to **Containers**.
2. Select a container, then open **Stats**.
3. View real-time CPU usage, memory usage, network usage, and I/O.

```bash
# Equivalent CLI command:
docker stats --no-stream --format \
  "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" \
  my-container
```

## Handling OOM (Out of Memory) Events

When a container exhausts its memory limit, the kernel may OOM-kill processes in the container:

```bash
# Check if a container was OOM-killed:
docker inspect -f '{{.State.OOMKilled}}' my-container
# Returns: true if the container was OOM-killed

# In Portainer: check container details for OOM status
# Navigate to container > Inspect tab > State.OOMKilled
```

If a container is being OOM-killed:
1. Increase the memory limit.
2. Or optimize the application's memory usage.
3. Check container logs for memory leak patterns.

## Best Practices

- **Always set memory limits** on production containers to prevent runaway processes.
- **Set realistic reservations** based on baseline memory usage observed in testing.
- **Use CPU limits for batch workers** to prevent them from starving real-time services.
- **Monitor for OOM kills** - they indicate the container needs more memory or has a leak.
- **Leave headroom on the host** - don't reserve 100% of host resources across containers.

## Conclusion

Resource limits in Portainer protect your host from container resource abuse and ensure fair resource distribution across workloads. By setting hard limits and, where supported, soft reservations, you create a stable multi-tenant container environment where each service gets what it needs without disrupting others.
