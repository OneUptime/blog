# How to Set Memory Limits for a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Memory, Resource Limit

Description: A detailed guide on configuring memory limits, swap limits, and memory reservations for Podman containers to prevent out-of-memory issues.

---

> Setting proper memory limits prevents a single container from consuming all available RAM and crashing your host or other containers.

Memory is one of the most critical resources to manage in containerized environments. Without memory limits, a container with a memory leak or an unexpected spike in usage can consume all available RAM, triggering the Linux OOM (Out-Of-Memory) killer and potentially bringing down other containers or even the host itself.

Podman provides several flags to control memory usage at different levels. This guide explains each option and when to use them.

---

## Understanding Container Memory Limits

Podman uses Linux cgroups to enforce memory constraints. There are three levels of memory control:

1. **Hard limit** (`--memory`): The absolute maximum memory a container can use
2. **Soft limit** (`--memory-reservation`): A target the kernel tries to enforce when memory is contended
3. **Swap limit** (`--memory-swap`): The combined memory plus swap the container can use

## Setting a Hard Memory Limit

The `--memory` (or `-m`) flag sets the maximum amount of RAM a container can use:

```bash
# Limit container to 256 megabytes

podman run -d --name app --memory 256m nginx:latest

# Limit container to 1 gigabyte
podman run -d --name big-app --memory 1g nginx:latest

# Limit container to 500 megabytes (various unit formats)
podman run -d --name test1 --memory 500m alpine sleep infinity    # megabytes
podman run -d --name test2 --memory 524288000 alpine sleep infinity # bytes
podman run -d --name test3 --memory 512000k alpine sleep infinity  # kilobytes
```

When a container exceeds its hard memory limit, the OOM killer terminates processes inside the container.

## Controlling Swap Usage

The `--memory-swap` flag controls how much combined memory and swap the container can use:

```bash
# 512MB RAM, 512MB of swap (1g total minus 512m memory = 512m swap)
podman run -d --name with-swap \
  --memory 512m \
  --memory-swap 1g \
  alpine sleep infinity

# 512MB RAM, unlimited swap
podman run -d --name unlimited-swap \
  --memory 512m \
  --memory-swap -1 \
  alpine sleep infinity
```

The relationship between the flags:

| --memory | --memory-swap | Effective Swap |
|----------|---------------|----------------|
| 512m     | 1g            | 512m of swap   |
| 512m     | -1            | Unlimited swap |
| 512m     | (not set)     | 512m of swap (2x memory) |

Podman's current documentation requires `--memory-swap` to be larger than `--memory`, except when using `-1` for unlimited swap.

## Setting Memory Reservation (Soft Limit)

The `--memory-reservation` flag sets a soft limit that the kernel tries to maintain under memory pressure:

```bash
# Hard limit of 1GB, soft limit of 512MB
podman run -d --name soft-limited \
  --memory 1g \
  --memory-reservation 512m \
  alpine sleep infinity
```

The soft limit must be lower than the hard limit. Under normal conditions, the container can use up to the hard limit. When the host is under memory pressure, the kernel tries to reclaim memory from containers down to their reservation level.

## Setting Memory Swappiness

Control how aggressively the kernel swaps memory pages for a container:

```bash
# Minimize swapping for this container (value 0)
podman run -d --name low-swappiness \
  --memory 512m \
  --memory-swappiness 0 \
  alpine sleep infinity

# High swappiness (value 0-100, default is usually 60)
podman run -d --name swap-happy \
  --memory 512m \
  --memory-swappiness 100 \
  alpine sleep infinity
```

A value of 0 tells the kernel to avoid swapping unless absolutely necessary. A value of 100 makes the kernel swap aggressively.

The `--memory-swappiness` flag is only supported on cgroups v1 rootful systems.

## Disabling the OOM Killer

In some cases, you may want to prevent the OOM killer from terminating your container:

```bash
# Disable OOM killer for this container
podman run -d --name critical-app \
  --memory 1g \
  --oom-kill-disable \
  alpine sleep infinity
```

Use this cautiously. If the container exceeds its memory limit with OOM kill disabled, the container will hang rather than having a process killed. Always set a `--memory` limit when disabling OOM kill.

The `--oom-kill-disable` flag is not supported on cgroups v2 systems.

## Verifying Memory Limits

Check the memory limits applied to a container:

```bash
# Inspect the memory configuration
podman inspect app --format '
  Memory Limit: {{.HostConfig.Memory}}
  Memory Swap:  {{.HostConfig.MemorySwap}}
  Reservation:  {{.HostConfig.MemoryReservation}}
  Swappiness:   {{.HostConfig.MemorySwappiness}}
  OOM Disabled: {{.HostConfig.OomKillDisable}}
'

# View current memory usage
podman stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}" app
```

## Monitoring Memory Usage Over Time

Track memory consumption to inform your limit decisions:

```bash
# Stream real-time stats for a container
podman stats app

# One-shot stats for all containers
podman stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Read cgroup memory stats directly (cgroups v2, then cgroups v1)
podman exec app cat /sys/fs/cgroup/memory.current 2>/dev/null || \
podman exec app cat /sys/fs/cgroup/memory/memory.usage_in_bytes
```

## Updating Memory Limits at Runtime

Change memory limits without restarting the container:

```bash
# Increase memory limit on a running container
podman update --memory 2g app

# Decrease memory (only if current usage is below the new limit)
podman update --memory 128m app

# Update both memory and swap
podman update --memory 1g --memory-swap 2g app
```

## Practical Example: Setting Limits for a Web Application Stack

```bash
# Create containers with appropriate memory limits for each role
# Database - needs more memory for caching
podman run -d --name postgres \
  --memory 2g \
  --memory-reservation 1g \
  --memory-swap 3g \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# Application server - moderate memory
podman run -d --name app-server \
  --memory 512m \
  --memory-reservation 256m \
  --memory-swap 1g \
  node:20-slim sleep infinity

# Reverse proxy - lightweight
podman run -d --name proxy \
  --memory 128m \
  --memory-reservation 64m \
  --memory-swap 256m \
  nginx:latest

# Monitor all containers
podman stats --no-stream
```

## Testing Memory Limits

Verify that limits are enforced:

```bash
# This container will be OOM-killed when it exceeds its memory and swap allowance
podman run --rm --memory 64m python:3.12-alpine sh -c "
  echo 'Attempting to allocate beyond 64MB...'
  python -c 'data = bytearray(256 * 1024 * 1024)'
"

# Check if a container was OOM-killed
podman inspect --format '{{.State.OOMKilled}}' app
```

## Summary

Memory management in Podman revolves around these key flags:

- `--memory`: Hard upper limit on RAM usage
- `--memory-swap`: Combined RAM plus swap limit
- `--memory-reservation`: Soft limit for memory pressure scenarios
- `--memory-swappiness`: Controls kernel swap behavior (0-100, cgroups v1 rootful only)
- `--oom-kill-disable`: Prevents OOM killer (use with caution, not supported on cgroups v2)
- `podman update`: Adjust limits on running containers

Set memory limits based on actual observed usage plus a reasonable buffer. Start with monitoring, then apply limits that give your containers room to operate without wasting host resources.
