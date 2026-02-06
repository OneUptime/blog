# Docker CPU & Memory Limits: Prevent Container Resource Exhaustion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Performance, Resource Management

Description: Set Docker container CPU and memory limits to prevent crashes. Learn --memory, --cpus flags, soft limits, and production best practices.

---

Running containers without resource limits is a recipe for disaster. A single runaway process can consume all available CPU or memory, bringing down your entire host system. Docker provides built-in mechanisms to constrain container resource usage, and understanding how to use them correctly is essential for production deployments.

## Why Resource Limits Matter

Without limits, containers compete for resources on a first-come, first-served basis. This leads to:

- **Noisy neighbor problems** where one container starves others
- **Out-of-memory (OOM) kills** that crash containers unexpectedly
- **System instability** when the host runs out of resources
- **Unpredictable performance** under load

## Memory Limits

### Setting Hard Memory Limits

The `--memory` or `-m` flag sets the maximum amount of memory a container can use.

```bash
# Limit container to 512MB of memory
docker run -m 512m nginx

# Limit to 2GB
docker run --memory 2g my-app

# Using docker-compose
# services:
#   app:
#     image: my-app
#     mem_limit: 512m
```

When a container exceeds its memory limit, Docker's behavior depends on your configuration. By default, the container is killed with an OOM error.

### Memory Reservation (Soft Limits)

Memory reservation sets a soft limit that Docker tries to honor when the system is under memory pressure.

```bash
# Set hard limit of 1GB, soft limit of 512MB
docker run -m 1g --memory-reservation 512m my-app
```

The container can use up to 1GB normally, but when the host is low on memory, Docker attempts to shrink the container's memory to 512MB.

### Swap Limits

By default, containers can use swap equal to their memory limit. Control this with `--memory-swap`.

```bash
# 512MB memory, no swap allowed
docker run -m 512m --memory-swap 512m my-app

# 512MB memory, 512MB swap (1GB total)
docker run -m 512m --memory-swap 1g my-app

# 512MB memory, unlimited swap
docker run -m 512m --memory-swap -1 my-app
```

For production, disable or limit swap to prevent slow performance when containers exceed memory limits.

### Disabling OOM Killer

In rare cases, you might want to prevent the OOM killer from terminating a critical container.

```bash
# Disable OOM killer for this container
docker run -m 512m --oom-kill-disable my-critical-app
```

Use this cautiously as it can cause the entire system to hang if memory is exhausted.

## CPU Limits

### CPU Shares (Relative Weight)

CPU shares set relative priority between containers. The default is 1024.

```bash
# Double the CPU priority relative to default containers
docker run --cpu-shares 2048 high-priority-app

# Half the priority
docker run --cpu-shares 512 background-task
```

CPU shares only matter when containers compete for CPU. If the system has idle CPU, all containers can use as much as they need.

### CPU Period and Quota

For hard CPU limits, use `--cpus` or the period/quota mechanism.

```bash
# Limit to 1.5 CPUs worth of processing
docker run --cpus 1.5 my-app

# Equivalent using period/quota (100000 microseconds = 100ms period)
docker run --cpu-period 100000 --cpu-quota 150000 my-app
```

This means the container gets 150ms of CPU time for every 100ms period, equivalent to 1.5 CPUs.

### Pinning to Specific CPUs

Bind containers to specific CPU cores for performance isolation.

```bash
# Use only CPU cores 0 and 1
docker run --cpuset-cpus "0,1" my-app

# Use cores 0 through 3
docker run --cpuset-cpus "0-3" my-app
```

CPU pinning helps with:
- Preventing cache thrashing
- NUMA-aware workloads
- Isolating latency-sensitive applications

## Docker Compose Configuration

Here's a complete example with both CPU and memory limits.

```yaml
version: '3.8'

services:
  web:
    image: nginx
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  app:
    image: my-app
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M

  worker:
    image: my-worker
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

Note: The `deploy` section requires `docker-compose` version 3+ and is primarily for Swarm mode. For standalone Docker Compose, use the older syntax:

```yaml
version: '2.4'

services:
  app:
    image: my-app
    mem_limit: 1g
    mem_reservation: 512m
    cpus: 2
    cpu_shares: 1024
```

## Monitoring Resource Usage

Check if your limits are appropriate by monitoring actual usage.

```bash
# Real-time resource stats
docker stats

# Stats for specific container
docker stats my-container

# One-time snapshot without streaming
docker stats --no-stream
```

Example output:

```
CONTAINER ID   NAME      CPU %     MEM USAGE / LIMIT   MEM %     NET I/O          BLOCK I/O
a1b2c3d4e5f6   my-app    45.32%    234.5MiB / 512MiB   45.80%    1.23MB / 456kB   12.3MB / 0B
```

## Recommended Limits by Workload Type

| Workload Type | Memory | CPU | Notes |
|--------------|--------|-----|-------|
| Static web server (nginx) | 64-256MB | 0.25-0.5 | Low resource needs |
| Node.js API | 256MB-1GB | 0.5-2 | Single-threaded, memory varies |
| Java application | 512MB-4GB | 1-4 | JVM heap + overhead |
| Python/Django | 256MB-1GB | 0.5-2 | Depends on workers |
| PostgreSQL | 1-8GB | 1-4 | Memory-intensive |
| Redis | 256MB-4GB | 0.5-1 | Depends on dataset size |

## Common Mistakes

### Setting Limits Too Low

If limits are too restrictive, containers will be OOM killed or throttled constantly.

```bash
# Too restrictive for a Java app
docker run -m 128m java-app  # Will likely OOM

# More realistic
docker run -m 1g java-app
```

### Ignoring Memory Overhead

Container memory includes more than just your application:
- Base image libraries
- Temporary files
- Network buffers
- Memory-mapped files

Add 20-30% headroom above your application's expected usage.

### Not Testing Under Load

Limits that work in development may fail in production. Load test your containers to find appropriate limits.

## Summary

Resource limits are essential for production Docker deployments. Start with generous limits and tune based on monitoring data:

1. **Always set memory limits** to prevent OOM situations
2. **Use CPU limits** when you need guaranteed performance isolation
3. **Monitor with `docker stats`** to validate your limits
4. **Test under load** before deploying to production

Proper resource limits ensure your containers coexist peacefully and your systems remain stable under pressure.
