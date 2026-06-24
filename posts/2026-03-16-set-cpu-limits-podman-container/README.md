# How to Set CPU Limits for a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CPU, Resource Limit, Performance

Description: Learn how to control CPU allocation for Podman containers using CPU quotas, shares, pinning, and real-time scheduling options.

---

> CPU limits ensure that no single container can monopolize processor time and starve other workloads on the same host.

CPU management is essential when running multiple containers on the same host. Without limits, a CPU-intensive container can consume all available cores, causing latency spikes and degraded performance for other services. Podman offers multiple mechanisms to control CPU allocation, from hard limits to relative priorities.

This guide covers the most common CPU limiting options available in Podman.

---

## CPU Limiting Mechanisms

Podman provides several CPU control mechanisms, each suited for different use cases:

- **CPU quota** (`--cpus`): Hard limit on total CPU time
- **CPU shares** (`--cpu-shares`): Relative priority when CPUs are contended
- **CPU pinning** (`--cpuset-cpus`): Bind container to specific CPU cores
- **CPU period/quota** (`--cpu-period`, `--cpu-quota`): Fine-grained scheduling control

## Setting a CPU Quota with --cpus

The `--cpus` flag is the simplest way to limit CPU usage:

```bash
# Limit to 1 CPU core equivalent

podman run -d --name web --cpus 1 nginx:latest

# Limit to half a CPU core
podman run -d --name light-worker --cpus 0.5 alpine sleep 1d

# Limit to 2.5 CPU cores
podman run -d --name compute --cpus 2.5 alpine sleep 1d
```

A value of `1.0` means the container can use 100% of one CPU core. A value of `2.5` means 250% total across multiple cores.

## Using CPU Period and Quota Directly

The `--cpus` flag is actually a convenience wrapper around `--cpu-period` and `--cpu-quota`. You can set these directly for finer control:

```bash
# Equivalent to --cpus 1.5
# Period of 100000 microseconds (100ms), quota of 150000 microseconds
podman run -d --name custom-cpu \
  --cpu-period 100000 \
  --cpu-quota 150000 \
  alpine sleep 1d

# Equivalent to --cpus 0.25
# Allow 25ms of CPU time every 100ms
podman run -d --name quarter-cpu \
  --cpu-period 100000 \
  --cpu-quota 25000 \
  alpine sleep 1d
```

The formula is: `effective CPUs = cpu-quota / cpu-period`. With a period of 100000 and quota of 150000, the container gets 1.5 CPUs.

## Setting CPU Shares (Relative Priority)

CPU shares set the relative weight of a container when multiple containers compete for CPU time:

```bash
# Default CPU shares is 1024
# Low priority container (half the default)
podman run -d --name background-job --cpu-shares 512 alpine sleep 1d

# High priority container (double the default)
podman run -d --name critical-service --cpu-shares 2048 nginx:latest

# Very low priority
podman run -d --name batch-work --cpu-shares 256 alpine sleep 1d
```

CPU shares only matter when there is contention. If only one container needs CPU, it gets all available regardless of its share value.

```bash
# Demonstrate share ratios
# Container A gets 2x the CPU time of Container B when both are busy
podman run -d --name share-high --cpu-shares 2048 alpine sh -c "while true; do :; done"
podman run -d --name share-low --cpu-shares 1024 alpine sh -c "while true; do :; done"

# Monitor the difference
podman stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}"
```

## Pinning to Specific CPU Cores

Use `--cpuset-cpus` to bind a container to specific CPU cores:

```bash
# Pin to CPU core 0 only
podman run -d --name pinned-0 --cpuset-cpus "0" alpine sleep 1d

# Pin to cores 0 and 1
podman run -d --name pinned-01 --cpuset-cpus "0,1" alpine sleep 1d

# Pin to a range of cores (0 through 3)
podman run -d --name pinned-range --cpuset-cpus "0-3" alpine sleep 1d

# Pin to specific non-adjacent cores
podman run -d --name pinned-mix --cpuset-cpus "0,2,4" alpine sleep 1d
```

CPU pinning is useful for NUMA-aware workloads or when you want to isolate containers on separate cores.

```bash
# Check available CPUs on the host
nproc
# Or for more detail
lscpu | grep "CPU(s)"
```

## Pinning to Specific Memory Nodes

For NUMA systems, you can also pin the memory node:

```bash
# Pin to memory node 0
podman run -d --name numa-aware \
  --cpuset-cpus "0,1" \
  --cpuset-mems "0" \
  alpine sleep 1d
```

## Combining CPU Limits

You can combine multiple CPU controls:

```bash
# Pin to cores 0-1, with a hard limit of 1.5 CPUs, and high priority
podman run -d --name optimized-app \
  --cpus 1.5 \
  --cpuset-cpus "0,1" \
  --cpu-shares 2048 \
  nginx:latest
```

## Verifying CPU Limits

Inspect the CPU configuration of a running container:

```bash
# Check CPU limits via inspect
podman inspect optimized-app --format '
  CPU Quota:  {{.HostConfig.CpuQuota}}
  CPU Period: {{.HostConfig.CpuPeriod}}
  CPU Shares: {{.HostConfig.CpuShares}}
  Cpuset:     {{.HostConfig.CpusetCpus}}
'

# Monitor real-time CPU usage
podman stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}" optimized-app
```

## Updating CPU Limits at Runtime

Adjust CPU limits on a running container without restarting it:

```bash
# Increase CPU allocation
podman update --cpus 4 optimized-app

# Change CPU shares
podman update --cpu-shares 4096 optimized-app

# Verify the update
podman inspect optimized-app --format '{{.HostConfig.CpuQuota}}'
```

## Benchmarking CPU Limits

Test that your CPU limits are working as expected:

```bash
# Run a CPU benchmark with a limit of 1 CPU
podman run --rm --cpus 1 alpine sh -c "
  echo 'Starting CPU benchmark with 1 CPU limit...'
  time dd if=/dev/urandom bs=1M count=50 | md5sum
  echo 'Benchmark complete'
"

# Compare with a limit of 2 CPUs
podman run --rm --cpus 2 alpine sh -c "
  echo 'Starting CPU benchmark with 2 CPU limit...'
  time dd if=/dev/urandom bs=1M count=50 | md5sum
  echo 'Benchmark complete'
"
```

## Practical Example: Multi-Tier Application

```bash
# Reverse proxy - light CPU needs
podman run -d --name proxy \
  --cpus 0.5 \
  --cpu-shares 1024 \
  nginx:latest

# Application servers - moderate CPU
podman run -d --name app1 \
  --cpus 2 \
  --cpu-shares 2048 \
  node:20-slim sleep infinity

podman run -d --name app2 \
  --cpus 2 \
  --cpu-shares 2048 \
  node:20-slim sleep infinity

# Database - high CPU for queries
podman run -d --name db \
  --cpus 4 \
  --cpuset-cpus "4-7" \
  --cpu-shares 4096 \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# Monitor all containers
podman stats --no-stream
```

## Summary

CPU limits in Podman give you fine-grained control over processor allocation:

- `--cpus`: Simple hard limit on CPU time (e.g., 1.5 means 150% of one core)
- `--cpu-shares`: Relative priority between containers under contention
- `--cpuset-cpus`: Pin containers to specific CPU cores
- `--cpu-period` and `--cpu-quota`: Low-level scheduling control
- `--cpuset-mems`: NUMA memory node pinning
- `podman update`: Change CPU limits at runtime

Use `--cpus` for straightforward limits, add `--cpuset-cpus` for isolation, and use `--cpu-shares` for prioritization under load.
