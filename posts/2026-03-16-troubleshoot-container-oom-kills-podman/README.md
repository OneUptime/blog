# How to Troubleshoot Container OOM Kills in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Troubleshooting, Memory, Performance

Description: Learn how to detect, diagnose, and prevent Out-Of-Memory (OOM) kills in Podman containers by setting memory limits, monitoring usage, and tuning application memory behavior.

---

> An OOM kill is the kernel's last resort when a container consumes more memory than allowed. Prevention starts with understanding your application's actual memory needs.

Out-Of-Memory (OOM) kills happen when the Linux kernel terminates a process because the container has exceeded its memory limit. This guide covers how to detect OOM events, analyze memory usage, set appropriate limits, and prevent future occurrences.

---

## Detect OOM Kills

First, confirm that an OOM kill actually occurred.

```bash
# Check if a container was OOM-killed

podman inspect --format '{{.State.OOMKilled}}' my-container

# Check the exit code (137 = SIGKILL, often OOM)
podman inspect --format '{{.State.ExitCode}}' my-container

# View container state details
podman inspect --format '{{json .State}}' my-container | python3 -m json.tool

# Check kernel logs for OOM events
dmesg | grep -i "oom\|out of memory" | tail -20

# Check journald for OOM events
journalctl -k | grep -i "oom\|out of memory" | tail -20
```

## Check Current Memory Limits

See what memory limits are applied to your container.

```bash
# View memory limit for a running container
podman stats --no-stream my-container

# Get the exact memory limit
podman inspect --format '{{.HostConfig.Memory}}' my-container

# Check memory swap limit
podman inspect --format '{{.HostConfig.MemorySwap}}' my-container

# View all host configuration, including resource limits
podman inspect --format '{{json .HostConfig}}' my-container | python3 -m json.tool
```

## Monitor Memory Usage in Real Time

Track memory consumption to understand usage patterns before setting limits.

```bash
# Watch memory usage in real time
podman stats my-container

# Get a one-time snapshot of memory usage
podman stats --no-stream my-container

# Monitor all running containers
podman stats --no-stream

# Check memory usage from inside the container on cgroups v2
podman exec my-container cat /sys/fs/cgroup/memory.current

# Check the memory limit as seen by the container on cgroups v2
podman exec my-container cat /sys/fs/cgroup/memory.max
```

## Set Appropriate Memory Limits

Configure memory limits based on your observed usage patterns.

```bash
# Set a hard memory limit (container is killed if exceeded)
podman run -d --memory 512m my-image:latest

# Set memory with swap limit
# --memory-swap = total memory + swap
podman run -d --memory 512m --memory-swap 1g my-image:latest

# Set a larger total memory + swap limit
podman run -d --memory 512m --memory-swap 768m my-image:latest

# Set a soft memory limit (reservation)
podman run -d --memory 512m --memory-reservation 256m my-image:latest

# Update memory limits on a running container
podman update --memory 1g my-container
```

## Analyze Memory Usage Patterns

Understand what is consuming memory inside the container.

```bash
# Check process memory usage inside the container
podman exec my-container ps aux --sort=-%mem | head -10

# Get host-level memory info visible inside the container
podman exec my-container cat /proc/meminfo

# Check memory-mapped files for the container's main process
podman exec my-container cat /proc/1/maps | wc -l

# Check cgroup memory stats
podman exec my-container cat /sys/fs/cgroup/memory.stat
```

## Prevent OOM Kills

Strategies to avoid OOM kills in production.

```bash
# Strategy 1: Set memory limits with headroom (20-30% above normal usage)
# If your app normally uses 400MB, set the limit to ~520MB
podman run -d --memory 520m my-image:latest

# Strategy 2: Disable OOM killer and let the container handle memory pressure
# Note: --oom-kill-disable is not supported on cgroups V2 systems
podman run -d --memory 512m --oom-kill-disable my-image:latest

# Strategy 3: Set OOM score adjustment (lower = less likely to be killed)
podman run -d --oom-score-adj -500 my-image:latest

# Strategy 4: Use memory reservations for graceful degradation
podman run -d \
  --memory 1g \
  --memory-reservation 512m \
  --memory-swap 1536m \
  my-image:latest
```

## Debug Memory Leaks

If OOM kills happen gradually over time, you likely have a memory leak.

```bash
# Monitor memory growth over time
while true; do
  podman stats --no-stream --format "{{.MemUsage}}" my-container
  sleep 30
done

# Take heap dumps for Java applications
podman exec my-container jmap -dump:format=b,file=/tmp/heap.hprof 1
podman cp my-container:/tmp/heap.hprof ./heap.hprof

# For Node.js, cap V8 old-space below the container memory limit
podman run -d \
  --memory 1g \
  -e NODE_OPTIONS="--max-old-space-size=768" \
  my-node-app:latest
```

## Configure Podman Compose with Memory Limits

Set memory limits in your compose file for consistent deployments.

```yaml
# podman-compose.yml
services:
  app:
    image: my-image:latest
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    # Alternative syntax for Podman
    mem_limit: 512m
    memswap_limit: 768m
    mem_reservation: 256m
```

## Summary

OOM kills are detectable through `podman inspect`, exit code 137, and kernel logs. Set memory limits based on observed usage with 20-30% headroom, cap swap to make memory behavior predictable, and monitor usage over time to catch memory leaks early. The `podman stats` and `podman update` commands are your primary tools for ongoing memory management.
