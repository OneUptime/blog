# How to Implement Docker Container Resource Limits

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Performance, DevOps, Resource Management

Description: Configure CPU, memory, and I/O resource limits for Docker containers to prevent resource exhaustion and ensure fair allocation across workloads.

---

Running containers without resource limits is a recipe for trouble. A single misbehaving container can consume all available memory or CPU cycles, bringing down your entire host system. This guide walks through the practical steps to implement resource constraints on Docker containers.

## Why Resource Limits Matter

Consider a scenario where you run multiple containers on a single host. Without limits:

- One container running a memory leak can trigger the Linux OOM killer
- A CPU-intensive process can starve other containers
- Disk I/O from one container can bottleneck the entire system
- Production workloads become unpredictable

Resource limits provide isolation guarantees that make containerized workloads production-ready.

## Understanding Linux Control Groups (cgroups)

Docker uses Linux cgroups (control groups) under the hood to enforce resource constraints. When you set a memory limit on a container, Docker configures the appropriate cgroup parameters. You can verify cgroup support on your system.

Check if your system supports cgroups v2:

```bash
# Check cgroup version
cat /sys/fs/cgroup/cgroup.controllers

# Expected output on cgroups v2:
# cpuset cpu io memory hugetlb pids rdma misc
```

Verify Docker can enforce limits:

```bash
# Check Docker info for cgroup driver
docker info | grep -i cgroup

# Output should show:
# Cgroup Driver: systemd
# Cgroup Version: 2
```

---

## Memory Limits

Memory limits prevent containers from consuming more RAM than allocated. Docker provides several flags to control memory usage.

### Basic Memory Limit

The `--memory` flag sets a hard limit on container memory. When the container exceeds this limit, the kernel OOM killer terminates processes inside the container.

Set a 512MB memory limit:

```bash
# Run nginx with 512MB memory limit
docker run -d \
  --name nginx-limited \
  --memory=512m \
  nginx:latest

# Verify the limit is applied
docker inspect nginx-limited --format='{{.HostConfig.Memory}}'
# Output: 536870912 (bytes = 512MB)
```

### Memory and Swap Limits

The `--memory-swap` flag controls the total memory plus swap available to a container. The relationship between `--memory` and `--memory-swap` determines swap behavior.

| --memory | --memory-swap | Result |
|----------|---------------|--------|
| 512m | 1g | 512MB RAM + 512MB swap |
| 512m | 512m | 512MB RAM + 0 swap |
| 512m | -1 | 512MB RAM + unlimited swap |
| 512m | (unset) | 512MB RAM + 512MB swap (default) |

Configure memory with swap limits:

```bash
# Allow 512MB RAM with no swap
docker run -d \
  --name no-swap-container \
  --memory=512m \
  --memory-swap=512m \
  nginx:latest

# Allow 512MB RAM with 256MB swap (total 768MB)
docker run -d \
  --name limited-swap-container \
  --memory=512m \
  --memory-swap=768m \
  nginx:latest

# Allow 512MB RAM with unlimited swap
docker run -d \
  --name unlimited-swap-container \
  --memory=512m \
  --memory-swap=-1 \
  nginx:latest
```

### Soft Memory Limit (Memory Reservation)

The `--memory-reservation` flag sets a soft limit. Docker attempts to keep container memory under this value but allows bursting above it when the system has free memory.

Configure soft and hard limits:

```bash
# Set 256MB soft limit with 512MB hard limit
docker run -d \
  --name soft-limit-container \
  --memory=512m \
  --memory-reservation=256m \
  nginx:latest
```

This configuration tells Docker:
- Try to keep the container at or below 256MB
- Allow bursting up to 512MB when memory is available
- Never exceed 512MB under any circumstances

### Kernel Memory Limit

Kernel memory includes stack pages, slab pages, and socket memory buffers. You can limit kernel memory separately from user memory.

Set kernel memory limit:

```bash
# Limit kernel memory to 50MB within a 512MB container
docker run -d \
  --name kernel-limited \
  --memory=512m \
  --kernel-memory=50m \
  nginx:latest
```

Note: Kernel memory limits are deprecated in cgroups v2 and may not work on newer systems.

---

## CPU Limits

Docker provides multiple mechanisms for CPU allocation, each suited for different use cases.

### CPU Count Limit

The `--cpus` flag limits how many CPU cores a container can use. This is the simplest way to constrain CPU usage.

Limit container to 1.5 CPU cores:

```bash
# Container can use up to 1.5 CPU cores
docker run -d \
  --name cpu-limited \
  --cpus=1.5 \
  nginx:latest

# Verify the limit
docker inspect cpu-limited --format='{{.HostConfig.NanoCpus}}'
# Output: 1500000000 (nanoseconds = 1.5 CPUs)
```

### CPU Shares (Relative Weight)

The `--cpu-shares` flag sets relative CPU priority between containers. The default value is 1024. A container with 2048 shares gets twice the CPU time as one with 1024 when both compete for resources.

Configure relative CPU priority:

```bash
# High priority container (2x default)
docker run -d \
  --name high-priority \
  --cpu-shares=2048 \
  nginx:latest

# Low priority container (0.5x default)
docker run -d \
  --name low-priority \
  --cpu-shares=512 \
  nginx:latest

# Normal priority (default)
docker run -d \
  --name normal-priority \
  --cpu-shares=1024 \
  nginx:latest
```

CPU shares only matter when containers compete for CPU time. If only one container needs CPU, it gets full access regardless of its share value.

### CPU Period and Quota

For fine-grained control, use `--cpu-period` and `--cpu-quota`. The quota specifies how many microseconds per period the container can use.

Set CPU quota manually:

```bash
# Allow 50% of one CPU (50000us quota per 100000us period)
docker run -d \
  --name quota-limited \
  --cpu-period=100000 \
  --cpu-quota=50000 \
  nginx:latest

# Allow 2 full CPUs (200000us quota per 100000us period)
docker run -d \
  --name two-cpu-quota \
  --cpu-period=100000 \
  --cpu-quota=200000 \
  nginx:latest
```

The formula: `--cpus` = `--cpu-quota` / `--cpu-period`

### CPU Pinning (cpuset)

Pin containers to specific CPU cores using `--cpuset-cpus`. This is useful for NUMA-aware applications or isolating workloads to specific cores.

Pin container to specific cores:

```bash
# Pin to CPU cores 0 and 1
docker run -d \
  --name pinned-container \
  --cpuset-cpus="0,1" \
  nginx:latest

# Pin to CPU cores 0 through 3
docker run -d \
  --name pinned-range \
  --cpuset-cpus="0-3" \
  nginx:latest

# Pin to specific cores (0, 2, 4)
docker run -d \
  --name pinned-specific \
  --cpuset-cpus="0,2,4" \
  nginx:latest
```

### Combined CPU Limits

For production workloads, combine multiple CPU constraints:

```bash
# Production-ready CPU configuration
docker run -d \
  --name production-container \
  --cpus=2 \
  --cpu-shares=1024 \
  --cpuset-cpus="0-3" \
  nginx:latest
```

---

## I/O Limits

Disk I/O limits prevent containers from saturating storage bandwidth. Docker supports both block I/O weight and direct bandwidth limits.

### Block I/O Weight

Similar to CPU shares, `--blkio-weight` sets relative I/O priority between containers. Values range from 10 to 1000, with 500 as default.

Set I/O priority:

```bash
# High I/O priority
docker run -d \
  --name high-io-priority \
  --blkio-weight=900 \
  nginx:latest

# Low I/O priority
docker run -d \
  --name low-io-priority \
  --blkio-weight=100 \
  nginx:latest
```

### Device Read/Write Bandwidth Limits

Limit the bytes per second a container can read or write from specific devices.

Find your block device:

```bash
# List block devices
lsblk

# Typical output:
# NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
# sda      8:0    0   500G  0 disk
# vda    252:0    0   100G  0 disk
```

Set bandwidth limits:

```bash
# Limit read speed to 10MB/s on /dev/sda
docker run -d \
  --name read-limited \
  --device-read-bps=/dev/sda:10mb \
  nginx:latest

# Limit write speed to 5MB/s on /dev/sda
docker run -d \
  --name write-limited \
  --device-write-bps=/dev/sda:5mb \
  nginx:latest

# Combined read and write limits
docker run -d \
  --name io-limited \
  --device-read-bps=/dev/sda:10mb \
  --device-write-bps=/dev/sda:5mb \
  nginx:latest
```

### Device IOPS Limits

Limit the number of I/O operations per second instead of bandwidth.

Set IOPS limits:

```bash
# Limit to 100 read operations per second
docker run -d \
  --name read-iops-limited \
  --device-read-iops=/dev/sda:100 \
  nginx:latest

# Limit to 50 write operations per second
docker run -d \
  --name write-iops-limited \
  --device-write-iops=/dev/sda:50 \
  nginx:latest

# Combined IOPS limits
docker run -d \
  --name iops-limited \
  --device-read-iops=/dev/sda:100 \
  --device-write-iops=/dev/sda:50 \
  nginx:latest
```

---

## Out of Memory (OOM) Behavior

When a container exceeds its memory limit, the kernel OOM killer terminates processes. Docker provides options to customize this behavior.

### OOM Kill Priority

The `--oom-score-adj` flag adjusts the OOM killer priority. Values range from -1000 (never kill) to 1000 (kill first). The default is 0.

Configure OOM priority:

```bash
# Make container less likely to be killed
docker run -d \
  --name oom-protected \
  --memory=512m \
  --oom-score-adj=-500 \
  nginx:latest

# Make container more likely to be killed
docker run -d \
  --name oom-expendable \
  --memory=512m \
  --oom-score-adj=500 \
  nginx:latest
```

### Disable OOM Killer

You can disable the OOM killer for a container. The container will hang instead of having processes killed.

Disable OOM killer (use with caution):

```bash
# Container hangs instead of OOM kill
docker run -d \
  --name oom-disabled \
  --memory=512m \
  --oom-kill-disable \
  nginx:latest
```

Warning: Disabling OOM killer can cause the entire host to become unresponsive if the container exhausts memory. Only use this with strict memory limits.

### OOM Events

Monitor OOM events in container logs and Docker events.

Check for OOM kills:

```bash
# Check if container was OOM killed
docker inspect nginx-limited --format='{{.State.OOMKilled}}'

# Watch Docker events for OOM
docker events --filter 'event=oom'

# Check container exit code (137 indicates OOM kill)
docker inspect nginx-limited --format='{{.State.ExitCode}}'
```

---

## Monitoring Resource Usage

Docker provides built-in tools to monitor container resource consumption.

### Real-time Stats

The `docker stats` command shows live resource usage:

```bash
# Show stats for all running containers
docker stats

# Output format:
# CONTAINER ID   NAME      CPU %   MEM USAGE / LIMIT   MEM %   NET I/O       BLOCK I/O
# abc123def456   nginx     0.50%   15.2MiB / 512MiB    2.97%   1.2kB / 0B    0B / 0B

# Show stats for specific containers
docker stats nginx-limited cpu-limited

# Show stats without streaming (single snapshot)
docker stats --no-stream

# Custom format output
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Inspect Resource Limits

View configured limits for a running container:

```bash
# Show all resource limits
docker inspect nginx-limited --format='
Memory Limit: {{.HostConfig.Memory}}
Memory Swap: {{.HostConfig.MemorySwap}}
CPU Shares: {{.HostConfig.CpuShares}}
CPU Quota: {{.HostConfig.CpuQuota}}
CPU Period: {{.HostConfig.CpuPeriod}}
CPUs: {{.HostConfig.NanoCpus}}
'
```

### cgroup Files (Direct Access)

For advanced debugging, read cgroup files directly:

```bash
# Find container's cgroup path
CONTAINER_ID=$(docker inspect nginx-limited --format='{{.Id}}')

# Read memory stats (cgroups v2)
cat /sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope/memory.current
cat /sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope/memory.max

# Read CPU stats (cgroups v2)
cat /sys/fs/cgroup/system.slice/docker-${CONTAINER_ID}.scope/cpu.stat
```

### Prometheus Metrics

For production monitoring, use cAdvisor with Prometheus:

```bash
# Run cAdvisor
docker run -d \
  --name cadvisor \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8080:8080 \
  gcr.io/cadvisor/cadvisor:latest

# Access metrics at http://localhost:8080/metrics
```

---

## Docker Compose Resource Configuration

Docker Compose supports resource limits through the `deploy` section (Swarm mode) or `resources` under services.

### Compose File with Resource Limits

Complete docker-compose.yml with resource constraints:

```yaml
version: '3.8'

services:
  web:
    image: nginx:latest
    container_name: web-server
    # Resource limits for docker-compose up (requires compose v2)
    mem_limit: 512m
    mem_reservation: 256m
    memswap_limit: 512m
    cpus: 1.5
    cpu_shares: 1024
    # Deploy section for Swarm mode
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    ports:
      - "80:80"

  api:
    image: node:18-alpine
    container_name: api-server
    mem_limit: 1g
    mem_reservation: 512m
    cpus: 2
    cpu_shares: 2048
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
    environment:
      - NODE_ENV=production
    ports:
      - "3000:3000"

  database:
    image: postgres:15
    container_name: postgres-db
    mem_limit: 2g
    mem_reservation: 1g
    cpus: 2
    cpu_shares: 1536
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=secretpassword

  cache:
    image: redis:7-alpine
    container_name: redis-cache
    mem_limit: 256m
    mem_reservation: 128m
    cpus: 0.5
    cpu_shares: 512
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

volumes:
  postgres_data:
```

### Compose Resource Limit Reference

| Compose Key | Docker Flag | Description |
|-------------|-------------|-------------|
| mem_limit | --memory | Hard memory limit |
| mem_reservation | --memory-reservation | Soft memory limit |
| memswap_limit | --memory-swap | Memory + swap limit |
| cpus | --cpus | Number of CPUs |
| cpu_shares | --cpu-shares | Relative CPU weight |
| cpu_count | --cpus | CPU count (Windows) |
| cpu_percent | N/A | CPU percentage (Windows) |

### Running with Compose

Start services with resource limits:

```bash
# Start all services
docker-compose up -d

# Verify resource limits are applied
docker stats --no-stream

# Check specific service limits
docker inspect web-server --format='Memory: {{.HostConfig.Memory}}, CPUs: {{.HostConfig.NanoCpus}}'
```

---

## Production Configuration Examples

### Web Application Stack

A typical production configuration for a web application:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:latest
    mem_limit: 128m
    mem_reservation: 64m
    cpus: 0.5
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  app:
    image: myapp:latest
    mem_limit: 1g
    mem_reservation: 512m
    cpus: 2
    restart: unless-stopped
    environment:
      - NODE_OPTIONS=--max-old-space-size=768

  worker:
    image: myapp:latest
    command: ["node", "worker.js"]
    mem_limit: 512m
    mem_reservation: 256m
    cpus: 1
    restart: unless-stopped

  postgres:
    image: postgres:15
    mem_limit: 2g
    mem_reservation: 1g
    cpus: 2
    restart: unless-stopped
    command:
      - "postgres"
      - "-c"
      - "shared_buffers=512MB"
      - "-c"
      - "max_connections=200"

  redis:
    image: redis:7-alpine
    mem_limit: 512m
    mem_reservation: 256m
    cpus: 0.5
    restart: unless-stopped
    command: ["redis-server", "--maxmemory", "400mb", "--maxmemory-policy", "allkeys-lru"]
```

### Java Application Configuration

Java applications require careful memory tuning:

```yaml
version: '3.8'

services:
  java-app:
    image: openjdk:17-slim
    mem_limit: 2g
    mem_reservation: 1g
    cpus: 2
    environment:
      # Set JVM heap to 75% of container memory limit
      - JAVA_OPTS=-Xms1g -Xmx1536m -XX:+UseG1GC -XX:MaxGCPauseMillis=200
    command: ["java", "-jar", "/app/application.jar"]
```

The JVM heap should be set below the container memory limit to account for:
- JVM metaspace
- Native memory allocations
- Thread stacks
- Direct byte buffers

---

## Troubleshooting Resource Limits

### Container Keeps Getting Killed

If your container repeatedly gets OOM killed:

```bash
# Check OOM status
docker inspect mycontainer --format='{{.State.OOMKilled}}'

# View container logs before death
docker logs mycontainer --tail 100

# Check memory usage at death
docker events --filter 'container=mycontainer' --filter 'event=oom'
```

Solutions:
- Increase memory limit
- Fix memory leaks in your application
- Add swap space

### Container Not Using All Allocated CPU

CPU limits only cap usage, they do not guarantee allocation:

```bash
# Check if CPU limit is set
docker inspect mycontainer --format='{{.HostConfig.NanoCpus}}'

# Check actual CPU usage
docker stats mycontainer --no-stream

# Verify no cpuset restriction
docker inspect mycontainer --format='{{.HostConfig.CpusetCpus}}'
```

### I/O Limits Not Working

Block I/O limits require the correct device path and may not work on all storage drivers:

```bash
# Verify device path exists
ls -la /dev/sda

# Check storage driver
docker info | grep "Storage Driver"

# Note: I/O limits may not work with overlay2 on some configurations
```

---

## Resource Limit Best Practices

### Memory

1. Always set memory limits in production
2. Set reservation to typical usage, limit to maximum acceptable
3. Consider disabling swap for predictable performance
4. Leave headroom for kernel buffers and overhead

### CPU

1. Use `--cpus` for hard limits in production
2. Use `--cpu-shares` for relative priority between containers
3. Consider CPU pinning for latency-sensitive workloads
4. Leave at least one core for the host system

### Monitoring

1. Set up alerting on resource usage approaching limits
2. Track OOM events and container restarts
3. Review and adjust limits based on actual usage patterns
4. Use Prometheus and Grafana for visualization

### Sizing Guidelines

| Workload Type | Memory | CPU | Notes |
|---------------|--------|-----|-------|
| Static web server | 64-256MB | 0.25-0.5 | Minimal resources needed |
| Node.js API | 256MB-1GB | 0.5-2 | Depends on traffic and complexity |
| Java application | 1-4GB | 1-4 | JVM needs significant memory |
| Database (small) | 1-2GB | 1-2 | More memory = better cache |
| Database (large) | 4-16GB | 2-8 | Scale based on dataset size |
| Redis cache | 256MB-2GB | 0.5-1 | Depends on data size |

---

## Summary

Docker resource limits are critical for running production workloads. The key flags to remember:

| Resource | Flag | Example |
|----------|------|---------|
| Memory limit | --memory | --memory=512m |
| Memory + swap | --memory-swap | --memory-swap=1g |
| Soft memory limit | --memory-reservation | --memory-reservation=256m |
| CPU cores | --cpus | --cpus=1.5 |
| CPU priority | --cpu-shares | --cpu-shares=1024 |
| CPU pinning | --cpuset-cpus | --cpuset-cpus="0,1" |
| I/O priority | --blkio-weight | --blkio-weight=500 |
| I/O bandwidth | --device-read-bps | --device-read-bps=/dev/sda:10mb |

Start with conservative limits and adjust based on monitoring data. Memory limits are the most important as they prevent OOM conditions that can crash your host. CPU limits prevent noisy neighbor problems and ensure fair resource distribution.

Test your resource limits under load before deploying to production. Use tools like `stress` or your application's load testing suite to verify containers behave correctly at their limits.
