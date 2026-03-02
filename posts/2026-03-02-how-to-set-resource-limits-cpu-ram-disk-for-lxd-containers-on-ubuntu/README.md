# How to Set Resource Limits (CPU, RAM, Disk) for LXD Containers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, Container, Resource Management, Performance

Description: Configure CPU, memory, and disk resource limits for LXD containers on Ubuntu using lxc config commands and profiles for consistent resource allocation.

---

Without resource limits, a single misbehaving container can consume all CPU, RAM, or disk on a host, starving other containers. LXD uses Linux cgroups (control groups) to enforce CPU and memory limits, and storage backend quotas for disk limits. This guide covers setting up effective resource limits.

## Understanding How LXD Implements Limits

LXD translates its resource configuration into kernel-level controls:

- **CPU limits** - cgroup `cpu.shares`, `cpuset.cpus`, or `cpu.max`
- **Memory limits** - cgroup `memory.max` and `memory.swap.max`
- **Disk limits** - ZFS quotas, btrfs limits, or LVM volume sizing

These limits are enforced at the kernel level, not by the container process itself.

## CPU Limits

### Limiting by CPU Count

```bash
# Allow a container to use at most 2 CPUs worth of time
lxc config set mycontainer limits.cpu 2

# Verify
lxc config get mycontainer limits.cpu

# Check inside the container (appears as 2 CPUs in /proc/cpuinfo)
lxc exec mycontainer -- nproc
```

### Pinning to Specific CPU Cores

Pin a container to specific physical cores to guarantee dedicated CPU access:

```bash
# Pin to cores 0 and 1 only
lxc config set mycontainer limits.cpu 0,1

# Pin to a range
lxc config set mycontainer limits.cpu 0-3

# Pin to non-contiguous cores
lxc config set mycontainer limits.cpu 0,2,4,6
```

CPU pinning prevents the container from using other cores, which is useful for latency-sensitive workloads where you want to avoid CPU scheduler interference.

### CPU Priority (Shares)

CPU shares set relative priority when there is CPU contention. Higher shares means the container gets proportionally more CPU time during contention:

```bash
# Set high priority (default is 1024)
lxc config set mycontainer limits.cpu.priority 10

# Set low priority (background/batch container)
lxc config set mycontainer limits.cpu.priority 1

# Allowed values: 0-10 (LXD translates to cgroup shares 1-9999)
```

### CPU Allowance (Hard Limit)

Allowance sets a hard cap as a percentage of time per period:

```bash
# Allow container to use at most 50% of one core
lxc config set mycontainer limits.cpu.allowance 50%

# Allow 200ms out of every 500ms (40% of one core)
lxc config set mycontainer limits.cpu.allowance 200ms/500ms
```

## Memory Limits

### Hard Memory Limit

```bash
# Set hard memory limit - container is OOM-killed if exceeded
lxc config set mycontainer limits.memory 4GiB

# Check inside container
lxc exec mycontainer -- free -h
# Total shows 4GB regardless of host's actual RAM

# Remove a limit
lxc config unset mycontainer limits.memory
```

### Swap Limits

By default, containers can use swap if memory is exhausted. Disable this for containers where swap would cause performance issues:

```bash
# Disable swap for this container
lxc config set mycontainer limits.memory.swap false

# Or limit the swap amount
lxc config set mycontainer limits.memory.swap.priority 0  # lowest priority for swap
```

### Memory Priority (Soft Limit)

Memory priority affects which containers are targeted first when the host needs to reclaim memory:

```bash
# High priority (last to be affected by memory pressure)
lxc config set mycontainer limits.memory.priority 10

# Low priority (first to have memory reclaimed)
lxc config set mycontainer limits.memory.priority 0
```

### OOM Behavior

Control what happens when a container hits its memory limit:

```bash
# Kill the entire container when memory is exceeded (not just the OOM process)
lxc config set mycontainer limits.memory.enforce hard

# Allow temporary overcommit (soft limit)
lxc config set mycontainer limits.memory.enforce soft
```

## Disk Limits

### Root Disk Quota

```bash
# Set a 20GiB limit on the container's root filesystem
lxc config device set mycontainer root size=20GiB

# Check current device configuration
lxc config device show mycontainer

# Verify inside the container
lxc exec mycontainer -- df -h /
```

### Disk I/O Limits

For LVM-backed storage, LXD can throttle disk I/O:

```bash
# Limit read speed to 50MB/s
lxc config set mycontainer limits.disk.priority 5

# Note: granular I/O limits (IOPS, bandwidth) require LVM backend
# and are set on the device level
lxc config device set mycontainer root limits.read 50MB
lxc config device set mycontainer root limits.write 25MB
lxc config device set mycontainer root limits.read.iops 1000
lxc config device set mycontainer root limits.write.iops 500
```

## Viewing All Current Limits

```bash
# Show all config for a container
lxc config show mycontainer

# Filter to just limits
lxc config show mycontainer | grep limits

# Detailed info including effective resource usage
lxc info mycontainer

# Check cgroup values directly from host
CONTAINER_PID=$(lxc info mycontainer | grep Pid | awk '{print $2}')
cat /proc/$CONTAINER_PID/cgroup
```

## Setting Limits via Profiles

Profiles let you define resource tiers and apply them to multiple containers:

```bash
# Create a "small" profile
lxc profile create small
lxc profile set small limits.cpu 1
lxc profile set small limits.memory 1GiB
lxc profile device add small root disk pool=default size=10GiB path=/

# Create a "medium" profile
lxc profile create medium
lxc profile set medium limits.cpu 2
lxc profile set medium limits.memory 4GiB
lxc profile device add medium root disk pool=default size=30GiB path=/

# Create a "large" profile
lxc profile create large
lxc profile set large limits.cpu 4
lxc profile set large limits.memory 8GiB
lxc profile device add large root disk pool=default size=80GiB path=/

# Apply profiles at launch
lxc launch ubuntu:24.04 small-app --profile small
lxc launch ubuntu:24.04 medium-app --profile medium
lxc launch ubuntu:24.04 big-db --profile large
```

### Overriding Profile Settings

Container-level settings override profile settings:

```bash
# Container launched with "medium" profile but needs more memory
lxc launch ubuntu:24.04 special-app --profile medium
lxc config set special-app limits.memory 6GiB  # overrides profile's 4GiB
```

## Live Resource Changes

Most resource limits can be changed on a running container without restart:

```bash
# Change CPU limit on running container
lxc config set mycontainer limits.cpu 4

# Change memory limit on running container
lxc config set mycontainer limits.memory 8GiB

# Disk quota changes typically require container restart
lxc config device set mycontainer root size=50GiB
lxc restart mycontainer
```

## Monitoring Resource Usage

```bash
# Real-time resource usage for all containers
watch -n 2 'lxc list --format csv | while IFS=, read name state rest; do
  [ "$state" = "Running" ] && echo "=== $name ===" && lxc info $name | grep -E "CPU|Memory|Disk"
done'

# Check if a container is hitting its memory limit
lxc exec mycontainer -- bash -c "
  # Total memory limit vs current usage
  free -h
  # OOM kill count
  cat /proc/meminfo | grep -i oom
"

# Check CPU throttling (cgroup v2)
lxc exec mycontainer -- cat /sys/fs/cgroup/cpu.stat | grep throttled
```

## Example: Multi-Tier Application Resource Plan

A practical example for a 32GB RAM host with a web application stack:

```bash
# Database container - dedicated cores, large memory, large disk
lxc launch ubuntu:24.04 postgres-db \
  -c limits.cpu=0,1 \
  -c limits.memory=16GiB \
  -d root,size=100GiB

# Application server - flexible CPU, moderate memory
lxc launch ubuntu:24.04 app-server \
  -c limits.cpu=2 \
  -c limits.memory=8GiB \
  -d root,size=30GiB

# Cache (Redis) - minimal CPU, limited memory (eviction kicks in)
lxc launch ubuntu:24.04 redis-cache \
  -c limits.cpu=3 \
  -c limits.memory=2GiB \
  -c limits.memory.swap=false \
  -d root,size=10GiB

# Monitoring - low priority
lxc launch ubuntu:24.04 monitoring \
  -c limits.cpu.priority=1 \
  -c limits.memory=2GiB \
  -d root,size=20GiB
```

Resource limits are a defense against both accidents (a runaway process) and malicious behavior (denial of service). Set them on every container in production environments, and use profiles to keep the configuration consistent and maintainable.
