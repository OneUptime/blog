# How to Run a Container with Resource Limits in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Resource Limit, Performance

Description: Learn how to set CPU, memory, and I/O resource limits on Podman containers to prevent resource starvation and ensure stable multi-container environments.

---

> Resource limits are the guardrails that keep a single container from consuming all host resources and impacting everything else running on the system.

Running containers without resource limits is fine for development, but in production you need to control how much CPU, memory, and I/O each container can consume. Without limits, a misbehaving container can starve other workloads, cause out-of-memory kills, or bring down the entire host.

Podman leverages Linux cgroups to enforce resource constraints. This guide covers the most important resource limit options you can apply when running containers.

---

## Understanding Resource Limits in Podman

Podman uses Linux Control Groups (cgroups) to enforce resource limits. When you set limits, the kernel enforces them transparently. There are two cgroup versions:

```bash
# Check which cgroup version your system uses

podman info --format '{{.Host.CgroupVersion}}'
```

Cgroups v2 is the modern standard and provides more granular controls. Most options work with both versions.

## Setting Memory Limits

Restrict the maximum amount of memory a container can use:

```bash
# Limit the container to 256MB of RAM
podman run -d --name web --memory 256m nginx:latest

# Limit memory and set a swap limit
podman run -d --name app --memory 512m --memory-swap 1g python:3.12-slim sleep infinity

# Set a soft limit (memory reservation) alongside a hard limit
podman run -d --name worker \
  --memory 1g \
  --memory-reservation 512m \
  alpine sleep infinity
```

The `--memory-reservation` is a soft limit that the kernel tries to honor when memory is contended.

## Setting CPU Limits

Control how much CPU time a container can use:

```bash
# Limit the container to 1.5 CPUs worth of processing time
podman run -d --name compute --cpus 1.5 alpine sleep infinity

# Pin the container to specific CPU cores (cores 0 and 1)
podman run -d --name pinned --cpuset-cpus "0,1" alpine sleep infinity

# Set relative CPU shares (default is 1024)
podman run -d --name low-priority --cpu-shares 512 alpine sleep infinity
podman run -d --name high-priority --cpu-shares 2048 alpine sleep infinity
```

The `--cpus` flag is the most straightforward way to limit CPU. CPU shares only matter when there is contention.

## Setting I/O Limits

Restrict disk I/O to prevent a container from saturating storage:

```bash
# Limit read throughput to 10MB/s from a specific device
podman run -d --name io-limited \
  --device-read-bps /dev/sda:10mb \
  alpine sleep infinity

# Limit write throughput to 5MB/s
podman run -d --name write-limited \
  --device-write-bps /dev/sda:5mb \
  alpine sleep infinity

# Limit read IOPS (operations per second)
podman run -d --name iops-limited \
  --device-read-iops /dev/sda:1000 \
  alpine sleep infinity

# Set the block I/O weight (relative priority, 10-1000)
podman run -d --name io-weighted \
  --blkio-weight 300 \
  alpine sleep infinity
```

## Setting PID Limits

Prevent fork bombs and runaway process creation:

```bash
# Limit the container to a maximum of 100 processes
podman run -d --name safe-container --pids-limit 100 alpine sleep infinity

# Verify the PID limit
podman inspect safe-container --format '{{.HostConfig.PidsLimit}}'
```

## Combining Multiple Resource Limits

In practice, you set multiple limits together:

```bash
# Run a web server with comprehensive resource limits
podman run -d \
  --name production-web \
  --memory 512m \
  --memory-reservation 256m \
  --memory-swap 1g \
  --cpus 2 \
  --cpuset-cpus "0,1" \
  --pids-limit 200 \
  --blkio-weight 500 \
  nginx:latest

# Verify all limits are applied
podman inspect production-web --format '
  Memory Limit: {{.HostConfig.Memory}}
  Memory Reservation: {{.HostConfig.MemoryReservation}}
  CPU Period: {{.HostConfig.CpuPeriod}}
  CPU Quota: {{.HostConfig.CpuQuota}}
  PID Limit: {{.HostConfig.PidsLimit}}
'
```

## Monitoring Resource Usage

After setting limits, monitor actual usage:

```bash
# View real-time resource usage stats
podman stats production-web

# View stats for all running containers
podman stats --all --no-stream

# Get stats in a specific format
podman stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.PIDs}}"
```

## Updating Resource Limits on Running Containers

You can update certain resource limits without restarting:

```bash
# Update memory limit on a running container
podman update --memory 1g production-web

# Update CPU limit
podman update --cpus 4 production-web

# Update multiple limits at once
podman update --memory 2g --cpus 3 --pids-limit 500 production-web
```

## Testing Resource Limits

Verify that your limits actually work:

```bash
# Test memory limit by allocating more than the configured limit
podman run --rm --memory 128m python:3.12-slim \
  python -c "data = bytearray(256 * 1024 * 1024); print('Memory test complete')"

# Test CPU limit - this should be throttled to 1 CPU
podman run --rm --cpus 1 alpine sh -c "
  # Run a CPU-intensive task
  time dd if=/dev/urandom bs=1M count=100 | md5sum
"
```

Resource Limits in Pod Context

When running pods, you can set limits on individual containers within the pod:

```bash
# Create a pod
podman pod create --name my-pod

# Add containers with individual resource limits
podman run -d --pod my-pod --name web --memory 256m --cpus 1 nginx:latest
podman run -d --pod my-pod --name api --memory 512m --cpus 2 node:20-slim sleep infinity

# View stats for all containers in the pod
podman pod stats --no-stream my-pod
```

## Summary

Setting resource limits on Podman containers protects your host and ensures fair resource distribution. The key flags are:

- `--memory` and `--memory-swap` for memory constraints
- `--cpus` and `--cpuset-cpus` for CPU constraints
- `--device-read-bps` and `--device-write-bps` for I/O constraints
- `--pids-limit` for process count constraints
- `podman stats` for monitoring actual usage
- `podman update` for adjusting limits on running containers

Always set resource limits in production to prevent a single container from destabilizing your environment.
