# How to Configure Memory Swap Limits for Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Memory, Swap, Container, Performance, Cgroups, Linux, DevOps, Resource Management

Description: Learn how to configure memory and swap limits for Podman containers to prevent OOM kills, control resource usage, and optimize application performance with cgroups v2.

---

> Unconstrained container memory usage is a ticking time bomb. One runaway process can consume all available memory, triggering OOM kills that cascade across your entire host. Memory and swap limits are your defense.

Memory management is one of the most critical aspects of running containers in production. Without limits, a single container can consume all available host memory, causing the Linux Out-of-Memory (OOM) killer to terminate processes unpredictably. Podman uses Linux cgroups to enforce memory and swap limits, giving you precise control over how much memory each container can use. This guide covers everything from basic limits to advanced memory management strategies.

---

## Understanding Memory Limits in Podman

Podman containers inherit Linux cgroup memory controls. There are three key parameters:

- **Memory limit** (`--memory`): Maximum amount of RAM the container can use
- **Swap limit** (`--memory-swap`): Maximum combined RAM + swap the container can use
- **Memory reservation** (`--memory-reservation`): Soft limit that triggers reclaim when the host is under pressure

```bash
# Set a hard memory limit of 512MB

podman run --memory=512m your-image

# Set memory limit with swap
# --memory-swap includes RAM, so 1g swap means 512m RAM + 512m swap
podman run --memory=512m --memory-swap=1g your-image

# Disable swap entirely for this container
podman run --memory=512m --memory-swap=512m your-image

# Unlimited swap (container can swap as much as host allows)
podman run --memory=512m --memory-swap=-1 your-image
```

The relationship between `--memory` and `--memory-swap`:

| --memory | --memory-swap | RAM Limit | Swap Available |
|----------|--------------|-----------|----------------|
| 512m | not set | 512m | 512m (equal to RAM) |
| 512m | 1g | 512m | 512m (1g - 512m) |
| 512m | 512m | 512m | 0 (swap disabled) |
| 512m | -1 | 512m | Unlimited |

---

## Check cgroups v2 Support

On cgroups v2 systems, verify that the memory controller exposes swap accounting:

```bash
# Check cgroup version
stat -fc %T /sys/fs/cgroup/
# "cgroup2fs" means cgroups v2

# For cgroups v2, verify the swap control file exists on a non-root cgroup
find /sys/fs/cgroup -name memory.swap.max -print -quit 2>/dev/null
# If a path is printed, cgroup swap accounting is available

# Enable cgroups v2 if not active (requires reboot)
# Add to kernel command line: systemd.unified_cgroup_hierarchy=1

# On older cgroups v1 systems, enable swap accounting if needed
# swapaccount=1
```

Verify on your host:

```bash
# Check kernel command line for cgroup settings
cat /proc/cmdline | tr ' ' '\n' | grep -E "cgroup|swap"

# For Fedora/RHEL (cgroups v2 is default)
podman info --format '{{.Host.CgroupsVersion}}'
```

---

## Set Memory Limits

Configure appropriate memory limits based on your application's needs:

```bash
# Basic memory limit
podman run -d --name web \
  --memory=256m \
  nginx:alpine

# Check current memory usage against limit
podman stats --no-stream --format \
  "{{.Name}}: {{.MemUsage}} ({{.MemPerc}})"

# Inspect the configured limits
podman inspect --format '
  Memory Limit: {{.HostConfig.Memory}}
  Swap Limit: {{.HostConfig.MemorySwap}}
  Reservation: {{.HostConfig.MemoryReservation}}' web
```

For Java applications, coordinate container limits with JVM heap settings:

```bash
# Java container with aligned memory settings
podman run -d --name java-app \
  --memory=1g \
  --memory-swap=1g \
  -e JAVA_OPTS="-Xmx768m -Xms256m -XX:MaxMetaspaceSize=128m" \
  your-java-app

# Modern JVMs auto-detect container limits
podman run -d --name java-app \
  --memory=1g \
  -e JAVA_OPTS="-XX:MaxRAMPercentage=75.0" \
  your-java-app
```

For Node.js applications:

```bash
# Node.js with memory limit
podman run -d --name node-app \
  --memory=512m \
  --memory-swap=512m \
  -e NODE_OPTIONS="--max-old-space-size=384" \
  your-node-app
```

---

## Configure Swap Limits

Control swap usage to balance between OOM protection and performance:

```bash
# Strategy 1: No swap (fail fast on memory pressure)
# Best for latency-sensitive applications
podman run --memory=512m --memory-swap=512m your-image

# Strategy 2: Limited swap (graceful degradation)
# Allows temporary memory spikes without OOM
podman run --memory=512m --memory-swap=768m your-image

# Strategy 3: Double swap (generous overflow)
# Good for batch processing with variable memory needs
podman run --memory=512m --memory-swap=1536m your-image
```

Control swap priority with memory swappiness:

> **Note:** The `--memory-swappiness` flag is only supported on cgroups v1 rootful systems. It is not available on cgroups v2, which is the default on most modern Linux distributions (Fedora 31+, Ubuntu 21.10+, RHEL 9+). Check your cgroup version with `stat -fc %T /sys/fs/cgroup/`.

```bash
# Reduce swap tendency (0-100, lower = less swapping)
# Only works on cgroups v1 rootful systems
podman run --memory=512m \
  --memory-swappiness=10 \
  your-image

# Disable swapping entirely (prefer OOM over swap)
podman run --memory=512m \
  --memory-swap=512m \
  --memory-swappiness=0 \
  your-image

# Default swappiness (60)
podman run --memory=512m \
  --memory-swappiness=60 \
  your-image
```

---

## Use Memory Reservations

Memory reservations are soft limits. The container can exceed them, but the kernel will try to reclaim memory when the host is under pressure:

```bash
# Hard limit of 1GB, soft reservation of 512MB
podman run -d --name app \
  --memory=1g \
  --memory-reservation=512m \
  your-image

# Under normal conditions: container can use up to 1GB
# Under host memory pressure: kernel tries to reclaim down to 512MB
```

Reservations are useful for workloads with variable memory patterns:

```bash
# Web server: normal operation uses ~200MB, spikes to ~800MB
podman run -d --name web \
  --memory=1g \
  --memory-reservation=256m \
  --memory-swap=1g \
  web-server:latest

# Worker: normally uses ~1GB, batch jobs spike to ~3GB
podman run -d --name worker \
  --memory=4g \
  --memory-reservation=1g \
  --memory-swap=6g \
  worker:latest
```

---

## Handle OOM Events

Configure how containers behave when they hit memory limits:

```bash
# Disable OOM killer (container pauses instead of dying)
# Note: --oom-kill-disable is NOT supported on cgroups v2 systems.
# On cgroups v2 (default on modern distros), this flag will produce an error.
# It only works on cgroups v1 rootful systems.
podman run --memory=512m --oom-kill-disable your-image

# Set OOM score adjustment (-1000 to 1000, lower = less likely to be killed)
podman run --memory=512m --oom-score-adj=-500 your-image
```

Monitor for OOM events:

```bash
# Watch for container died events (includes OOM kills)
# Note: Podman does not have a dedicated "oom" event type.
# Use the "died" event and check exit codes or OOMKilled status.
podman events --filter event=died

# Check if a container was OOM-killed
podman inspect --format '{{.State.OOMKilled}}' my-container

# Check cgroup OOM events
CID=$(podman inspect --format '{{.Id}}' my-container)
CGROUP=$(find /sys/fs/cgroup -name "libpod-${CID}*" -type d 2>/dev/null | head -1)
cat $CGROUP/memory.events 2>/dev/null
```

Create an OOM monitoring script:

```bash
#!/bin/bash
# oom-monitor.sh - Alert on container OOM events
echo "Monitoring for OOM events..."

podman events --filter event=died --format json | while read event; do
  CONTAINER=$(echo "$event" | jq -r '.Name // .ID')
  TIME=$(echo "$event" | jq -r '.Time')
  OOM=$(podman inspect --format '{{.State.OOMKilled}}' "$CONTAINER" 2>/dev/null || true)

  [ "$OOM" = "true" ] || continue

  echo "[OOM ALERT] Container: $CONTAINER at $TIME"

  # Log memory stats at time of OOM
  podman inspect --format '
    Memory Limit: {{.HostConfig.Memory}}
    Swap Limit: {{.HostConfig.MemorySwap}}' "$CONTAINER" 2>/dev/null

  # Optionally restart the container
  # podman restart "$CONTAINER"
done
```

---

## Right-Size Memory Limits

Use profiling to determine the right memory limits:

```bash
#!/bin/bash
# memory-sizer.sh - Profile container memory usage over time
CONTAINER=$1
DURATION=${2:-3600}  # Default 1 hour
INTERVAL=10

echo "Profiling memory usage for $CONTAINER over ${DURATION}s"
echo "timestamp,mem_usage_limit,mem_percent" > memory-profile.csv

MAX_MEM=0
END=$(($(date +%s) + DURATION))

while [ $(date +%s) -lt $END ]; do
  STATS=$(podman stats --no-stream --format json "$CONTAINER" 2>/dev/null)

  MEM_USAGE=$(echo "$STATS" | jq -r '.[0].mem_usage' 2>/dev/null)
  MEM_PCT=$(echo "$STATS" | jq -r '.[0].mem_percent' 2>/dev/null)

  echo "$(date +%s),$MEM_USAGE,$MEM_PCT" >> memory-profile.csv

  sleep $INTERVAL
done

echo ""
echo "Profile saved to memory-profile.csv"
echo "Recommendation: Set --memory to 1.5x the observed peak usage"
```

---

## Update Limits on Running Containers

Podman supports updating memory limits on running containers:

```bash
# Increase memory limit without restart
podman update --memory=1g --memory-swap=2g my-container

# Decrease memory (be careful, may trigger OOM)
podman update --memory=256m my-container

# Verify the update
podman inspect --format '{{.HostConfig.Memory}}' my-container
```

---

## Configuration in Pod Specs

For pod-based deployments, configure memory limits in the pod spec:

```bash
# Create a pod with resource limits
podman pod create --name my-pod \
  --memory=2g \
  --memory-swap=3g

# Containers inherit pod limits
podman run -d --pod my-pod --name web nginx:alpine
podman run -d --pod my-pod --name api your-api:latest

# Individual container limits within the pod
podman run -d --pod my-pod --name db \
  --memory=1g \
  --memory-swap=1g \
  postgres:16
```

---

## Conclusion

Configuring memory and swap limits is essential for running Podman containers reliably in production. Start by profiling your application to understand its actual memory needs. Set hard limits at 1.5x the observed peak to allow headroom for spikes. Disable swap for latency-sensitive workloads, or provide limited swap for batch processing that can tolerate swap overhead. Use memory reservations for workloads with variable memory patterns. Monitor for OOM events proactively, and use `podman update` to adjust limits based on real-world data. Proper memory limits prevent cascading failures and ensure predictable performance across all containers on your host.
