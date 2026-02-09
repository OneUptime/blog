# How to Understand Docker Container Cgroups in Depth

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, cgroups, resource limits, Linux kernel, containers, CPU, memory, performance

Description: Understand how Docker uses Linux cgroups to control container resources, including CPU, memory, I/O limits, and cgroups v2 features.

---

Every Docker resource limit you set - memory caps, CPU quotas, I/O throttling - works because of a Linux kernel feature called cgroups (control groups). When you pass `--memory=512m` or `--cpus=2` to `docker run`, Docker creates a cgroup for the container and configures the kernel to enforce those limits. Understanding cgroups gives you the ability to debug resource issues, fine-tune performance, and understand what Docker is actually doing under the hood.

## What Are Cgroups

Cgroups are a Linux kernel mechanism that organizes processes into hierarchical groups and applies resource constraints to those groups. The kernel enforces these constraints at the lowest level, so there is no way for a process to bypass them without root access to the host.

Cgroups control several resource types, called subsystems or controllers:

- **cpu** - CPU time allocation and scheduling
- **memory** - Memory usage limits and accounting
- **blkio/io** - Block device I/O throttling
- **cpuset** - CPU and memory node affinity
- **pids** - Limits on the number of processes

Two versions of cgroups exist: cgroups v1 and cgroups v2. Most modern Linux distributions now default to cgroups v2.

Check which version your system uses:

```bash
# Check if cgroups v2 is active
# If this directory has files like cgroup.controllers, you are on v2
ls /sys/fs/cgroup/cgroup.controllers 2>/dev/null && echo "cgroups v2" || echo "cgroups v1"

# More detailed check
stat -fc %T /sys/fs/cgroup/
# "cgroup2fs" means v2, "tmpfs" means v1
```

## How Docker Creates Cgroups

When Docker starts a container, it creates a new cgroup under the Docker cgroup hierarchy. You can see this directly in the filesystem.

```bash
# Start a test container with resource limits
docker run -d --name test_cgroup \
    --memory=256m \
    --cpus=0.5 \
    --pids-limit=100 \
    nginx:alpine

# Find the container's cgroup path
CONTAINER_ID=$(docker inspect --format '{{.Id}}' test_cgroup)

# On cgroups v2, Docker creates cgroups under this path
ls /sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope/
```

On cgroups v2, all resource controllers live under a single hierarchy:

```bash
# List the cgroup directory contents for the container
ls /sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope/

# You will see files like:
# cgroup.controllers   - Active controllers
# cpu.max              - CPU limit
# memory.max           - Memory limit
# memory.current       - Current memory usage
# pids.max             - Process count limit
# io.max               - I/O limits
```

## Memory Cgroup in Detail

Docker memory limits translate directly to cgroup memory controller settings.

```bash
# Run a container with specific memory constraints
docker run -d --name mem_test \
    --memory=256m \
    --memory-swap=512m \
    --memory-reservation=128m \
    nginx:alpine

# Inspect the cgroup memory settings
CGROUP_PATH=$(docker inspect --format '{{.HostConfig.CgroupParent}}' mem_test)
CONTAINER_ID=$(docker inspect --format '{{.Id}}' mem_test)
SCOPE="/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope"

# Read the memory limit (in bytes)
cat "${SCOPE}/memory.max"
# Output: 268435456 (which is 256 MB)

# Read current memory usage
cat "${SCOPE}/memory.current"

# Read memory usage statistics
cat "${SCOPE}/memory.stat"
```

The memory.stat file provides detailed breakdown:

```bash
# Parse key memory statistics for the container
cat "${SCOPE}/memory.stat" | grep -E "^(anon|file|slab|sock|shmem|kernel)"

# Key fields:
# anon       - Anonymous memory (heap, stack, mmap)
# file       - Page cache (files read from disk)
# slab       - Kernel slab allocator memory
# sock       - Network socket buffers
```

When a container exceeds its memory limit, the kernel's OOM killer terminates processes in the cgroup:

```bash
# Check if the OOM killer has been triggered for this container
cat "${SCOPE}/memory.events"
# Look for the "oom" and "oom_kill" counters

# Monitor OOM events in real time
docker events --filter event=oom
```

## CPU Cgroup in Detail

Docker CPU limits work through two mechanisms: CFS (Completely Fair Scheduler) quotas and CPU shares.

```bash
# Run a container with CPU constraints
docker run -d --name cpu_test \
    --cpus=1.5 \
    --cpu-shares=1024 \
    nginx:alpine

CONTAINER_ID=$(docker inspect --format '{{.Id}}' cpu_test)
SCOPE="/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope"

# Read the CPU bandwidth limit
cat "${SCOPE}/cpu.max"
# Output: 150000 100000
# This means: 150000 microseconds per 100000 microsecond period = 1.5 CPUs
```

The `cpu.max` file contains two numbers: quota and period. The container can use `quota` microseconds of CPU time per `period` microseconds.

```bash
# --cpus=0.5 translates to:
# 50000 100000 (50ms per 100ms period)

# --cpus=2 translates to:
# 200000 100000 (200ms per 100ms period)

# Read CPU usage statistics
cat "${SCOPE}/cpu.stat"
# usage_usec   - Total CPU time consumed
# user_usec    - CPU time in user mode
# system_usec  - CPU time in kernel mode
# nr_periods   - Number of enforcement periods
# nr_throttled - Number of times the container was throttled
# throttled_usec - Total time spent throttled
```

CPU throttling is a common performance problem. A throttled container has its processes paused by the scheduler until the next period starts:

```bash
#!/bin/bash
# check-throttling.sh
# Checks CPU throttling for all running Docker containers

echo "Container CPU Throttling Report"
echo "================================"

for CONTAINER_ID in $(docker ps -q); do
    NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//')
    SCOPE="/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope"

    if [ -f "${SCOPE}/cpu.stat" ]; then
        THROTTLED=$(grep nr_throttled "${SCOPE}/cpu.stat" | awk '{print $2}')
        THROTTLED_TIME=$(grep throttled_usec "${SCOPE}/cpu.stat" | awk '{print $2}')

        if [ "$THROTTLED" -gt 0 ]; then
            THROTTLED_SEC=$((THROTTLED_TIME / 1000000))
            echo "$NAME: throttled $THROTTLED times (${THROTTLED_SEC}s total)"
        else
            echo "$NAME: no throttling"
        fi
    fi
done
```

## cpuset Controller

The cpuset controller pins containers to specific CPU cores, which is useful for latency-sensitive workloads.

```bash
# Pin a container to CPUs 0 and 1 only
docker run -d --name pinned_test \
    --cpuset-cpus="0,1" \
    --cpuset-mems="0" \
    nginx:alpine

CONTAINER_ID=$(docker inspect --format '{{.Id}}' pinned_test)
SCOPE="/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope"

# Verify the CPU affinity
cat "${SCOPE}/cpuset.cpus"
# Output: 0-1

cat "${SCOPE}/cpuset.mems"
# Output: 0
```

## I/O Cgroup

Control disk I/O bandwidth per container:

```bash
# Limit a container's I/O to 10MB/s read and 5MB/s write
docker run -d --name io_test \
    --device-read-bps /dev/sda:10mb \
    --device-write-bps /dev/sda:5mb \
    nginx:alpine

CONTAINER_ID=$(docker inspect --format '{{.Id}}' io_test)
SCOPE="/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope"

# Check I/O limits
cat "${SCOPE}/io.max"

# Monitor I/O usage in real time
cat "${SCOPE}/io.stat"
```

## PIDs Cgroup

Prevent fork bombs by limiting the number of processes a container can create:

```bash
# Limit a container to 100 processes
docker run -d --name pid_test \
    --pids-limit=100 \
    nginx:alpine

CONTAINER_ID=$(docker inspect --format '{{.Id}}' pid_test)
SCOPE="/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope"

# Check the PID limit
cat "${SCOPE}/pids.max"
# Output: 100

# Check current process count
cat "${SCOPE}/pids.current"
```

## Cgroups v2 vs v1 Differences

Cgroups v2 introduces a unified hierarchy with important changes:

```bash
# Cgroups v1: separate hierarchies per controller
/sys/fs/cgroup/memory/docker/CONTAINER_ID/memory.limit_in_bytes
/sys/fs/cgroup/cpu/docker/CONTAINER_ID/cpu.cfs_quota_us

# Cgroups v2: single unified hierarchy
/sys/fs/cgroup/system.slice/docker-CONTAINER_ID.scope/memory.max
/sys/fs/cgroup/system.slice/docker-CONTAINER_ID.scope/cpu.max
```

Key naming changes from v1 to v2:

| cgroups v1 | cgroups v2 |
|-----------|-----------|
| memory.limit_in_bytes | memory.max |
| memory.usage_in_bytes | memory.current |
| cpu.cfs_quota_us | cpu.max (first field) |
| cpu.cfs_period_us | cpu.max (second field) |
| blkio.throttle.* | io.max |

## Building a Cgroup Monitoring Tool

```bash
#!/bin/bash
# cgroup-monitor.sh
# Displays real-time cgroup resource data for all Docker containers

while true; do
    clear
    echo "=== Docker Cgroup Monitor ($(date)) ==="
    printf "%-20s %10s %10s %8s %10s %8s\n" \
        "CONTAINER" "MEM_USAGE" "MEM_LIMIT" "MEM%" "CPU_THROT" "PIDS"

    for CONTAINER_ID in $(docker ps -q); do
        NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//' | cut -c1-20)
        SCOPE="/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope"

        if [ ! -d "$SCOPE" ]; then
            continue
        fi

        # Memory
        MEM_CURRENT=$(cat "${SCOPE}/memory.current" 2>/dev/null || echo 0)
        MEM_MAX=$(cat "${SCOPE}/memory.max" 2>/dev/null || echo "max")
        MEM_MB=$((MEM_CURRENT / 1048576))

        if [ "$MEM_MAX" != "max" ]; then
            MEM_LIMIT_MB=$((MEM_MAX / 1048576))
            MEM_PCT=$((MEM_CURRENT * 100 / MEM_MAX))
        else
            MEM_LIMIT_MB="unlim"
            MEM_PCT="-"
        fi

        # CPU throttling
        THROTTLED=$(grep -s nr_throttled "${SCOPE}/cpu.stat" | awk '{print $2}' || echo 0)

        # PIDs
        PIDS=$(cat "${SCOPE}/pids.current" 2>/dev/null || echo "-")

        printf "%-20s %8dMB %8sMB %7s%% %10s %8s\n" \
            "$NAME" "$MEM_MB" "$MEM_LIMIT_MB" "$MEM_PCT" "$THROTTLED" "$PIDS"
    done

    sleep 5
done
```

## Debugging Cgroup Issues

When containers behave unexpectedly, cgroups data helps you diagnose the root cause:

```bash
# Check if a container is being memory-throttled (swapping)
SCOPE="/sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope"
grep -E "pgfault|pgmajfault" "${SCOPE}/memory.stat"
# High pgmajfault means the container is heavily swapping

# Check if CPU throttling is causing latency
grep nr_throttled "${SCOPE}/cpu.stat"
# If this number grows quickly, your CPU limit is too low

# Check memory pressure (cgroups v2 feature)
cat "${SCOPE}/memory.pressure"
# Shows how much time processes spend waiting for memory
```

## Summary

Cgroups are the enforcement mechanism behind every Docker resource limit. They operate at the kernel level, providing hard guarantees about CPU time, memory usage, I/O bandwidth, and process counts. Understanding how Docker translates `--memory`, `--cpus`, and other flags into cgroup configurations helps you debug performance issues, optimize resource allocation, and understand what happens when containers hit their limits. Read the cgroup filesystem directly for real-time data that is more detailed than what `docker stats` provides. This knowledge is especially valuable when diagnosing CPU throttling problems or memory pressure situations that affect application performance.
