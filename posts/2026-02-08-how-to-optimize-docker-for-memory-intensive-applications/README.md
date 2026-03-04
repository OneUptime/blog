# How to Optimize Docker for Memory-Intensive Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Performance, Memory, Optimization, Linux, Cgroups, Database, DevOps

Description: Learn how to configure Docker memory limits, swap behavior, OOM handling, and kernel parameters for applications that need large amounts of RAM.

---

Memory-intensive applications like in-memory databases, data processing pipelines, machine learning inference servers, and large JVM applications push Docker's default memory configuration to its limits. Without proper tuning, you get OOM kills, swap thrashing, and unpredictable performance. This guide covers every aspect of Docker memory management, from basic limits to advanced kernel tuning.

## Understanding Docker Memory Limits

Docker uses Linux cgroups to enforce memory limits. When a container tries to use more memory than its limit, the kernel's OOM (Out of Memory) killer terminates the process. Understanding this mechanism is essential for tuning.

```bash
# Check the current memory limit for a running container
docker inspect --format '{{.HostConfig.Memory}}' mycontainer
# 0 means unlimited

# Check actual memory usage
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

## Setting Memory Limits Correctly

### Basic Memory Limits

```bash
# Set a hard memory limit of 8 GB
docker run -d --memory=8g --name memapp myapp:latest

# Set memory with swap limit
# --memory-swap = total (memory + swap)
# 8g memory + 4g swap = 12g total
docker run -d --memory=8g --memory-swap=12g --name memapp myapp:latest

# Disable swap entirely for the container
# Set memory-swap equal to memory
docker run -d --memory=8g --memory-swap=8g --name memapp myapp:latest
```

### Memory Reservation (Soft Limit)

Memory reservation sets a soft limit. Docker tries to keep the container under this amount but allows bursting up to the hard limit when memory is available:

```bash
# Hard limit 16 GB, soft limit 8 GB
# Container normally uses up to 8 GB but can burst to 16 GB
docker run -d \
  --memory=16g \
  --memory-reservation=8g \
  --name memapp myapp:latest
```

This is useful for applications with variable memory usage, like caches that grow under load.

## Controlling OOM Behavior

### Disable the OOM Killer

For critical applications where you never want the container killed, disable the OOM killer. Use this carefully, as it can lead to system-wide issues if the container consumes all available memory.

```bash
# Disable OOM killer for this container
docker run -d --oom-kill-disable --memory=16g --name critical-app myapp:latest
```

You must set a memory limit when disabling the OOM killer. Without a limit, the container could consume all host memory and freeze the system.

### Adjust OOM Priority

Instead of disabling OOM entirely, adjust the priority. Lower scores mean the container is less likely to be killed:

```bash
# Set OOM score adjustment (-1000 to 1000, lower = less likely to be killed)
docker run -d --oom-score-adj=-500 --memory=16g --name important-app myapp:latest
```

## Swap Configuration

### Understanding Docker Swap Behavior

Docker's swap behavior is controlled by two parameters:

```bash
# --memory-swap controls total memory + swap
# --memory-swappiness controls how aggressively the kernel swaps (0-100)

# Scenario 1: No swap at all
docker run -d --memory=8g --memory-swap=8g --name noswap myapp:latest

# Scenario 2: Equal swap (8g memory + 8g swap = 16g total)
docker run -d --memory=8g --memory-swap=16g --name withswap myapp:latest

# Scenario 3: Unlimited swap (dangerous in production)
docker run -d --memory=8g --memory-swap=-1 --name unlimitedswap myapp:latest
```

### Swappiness Tuning

Swappiness controls the kernel's tendency to swap memory pages versus reclaiming page cache:

```bash
# Set swappiness to 0 - avoid swap unless absolutely necessary
# Good for in-memory databases (Redis, Memcached)
docker run -d --memory=8g --memory-swap=8g --memory-swappiness=0 \
  --name redis redis:7-alpine

# Set swappiness to 10 - light swapping for general workloads
docker run -d --memory=8g --memory-swap=12g --memory-swappiness=10 \
  --name app myapp:latest

# Set swappiness to 60 - default, more aggressive swapping
docker run -d --memory=8g --memory-swap=16g --memory-swappiness=60 \
  --name batch-job batch:latest
```

For memory-intensive applications, set swappiness to 0 or 1. Swapping is almost always worse than reclaiming page cache for these workloads.

## Kernel Memory Tuning

### Overcommit Settings

Linux can overcommit memory, promising more than physically available. This helps containers that allocate memory but do not immediately use it (like JVM applications):

```bash
# Check current overcommit settings
cat /proc/sys/vm/overcommit_memory
# 0 = heuristic (default), 1 = always overcommit, 2 = never overcommit

# For memory-intensive apps, strict overcommit prevents surprises
echo 2 | sudo tee /proc/sys/vm/overcommit_memory
echo 80 | sudo tee /proc/sys/vm/overcommit_ratio

# Make persistent
echo "vm.overcommit_memory = 2" | sudo tee -a /etc/sysctl.d/memory.conf
echo "vm.overcommit_ratio = 80" | sudo tee -a /etc/sysctl.d/memory.conf
sudo sysctl -p /etc/sysctl.d/memory.conf
```

### Page Cache Pressure

Control how aggressively the kernel reclaims page cache memory:

```bash
# Lower values keep more page cache (good for I/O-heavy apps)
# Higher values free page cache faster (good for memory-heavy apps)
echo 150 | sudo tee /proc/sys/vm/vfs_cache_pressure

# Make persistent
echo "vm.vfs_cache_pressure = 150" | sudo tee -a /etc/sysctl.d/memory.conf
```

### Dirty Page Ratios

For applications that write large amounts of data, tune when the kernel flushes dirty pages to disk:

```bash
# Start flushing when 5% of memory has dirty pages
echo 5 | sudo tee /proc/sys/vm/dirty_ratio

# Background flushing at 2%
echo 2 | sudo tee /proc/sys/vm/dirty_background_ratio

# Make persistent
echo "vm.dirty_ratio = 5" | sudo tee -a /etc/sysctl.d/memory.conf
echo "vm.dirty_background_ratio = 2" | sudo tee -a /etc/sysctl.d/memory.conf
```

## Application-Specific Memory Configuration

### JVM Applications

The JVM manages its own heap, and Docker memory limits must account for both heap and non-heap memory:

```bash
# Run a JVM app with proper memory settings
# Container memory should be 20-30% more than heap to cover
# metaspace, thread stacks, native memory, and OS overhead
docker run -d \
  --memory=8g \
  --memory-swap=8g \
  -e JAVA_OPTS="-Xms6g -Xmx6g -XX:MaxMetaspaceSize=512m -XX:+UseG1GC" \
  --name java-app java-app:latest
```

Modern JVMs detect container memory limits automatically:

```bash
# JVM 17+ respects container memory limits by default
docker run -d \
  --memory=8g \
  -e JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC" \
  --name java-app java-app:latest
```

### Python/NumPy/Pandas Applications

Python data processing applications often allocate large arrays:

```bash
# Set generous memory limits for data processing
docker run -d \
  --memory=32g \
  --memory-swap=32g \
  --shm-size=8g \
  --name data-pipeline data-app:latest
```

The `--shm-size` flag is important for multiprocessing applications. Python's `multiprocessing` module uses shared memory in `/dev/shm`, which defaults to 64 MB.

### Redis and In-Memory Databases

```bash
# Redis with proper memory management
docker run -d \
  --memory=16g \
  --memory-swap=16g \
  --memory-swappiness=0 \
  --sysctl net.core.somaxconn=65535 \
  --name redis redis:7-alpine \
  redis-server \
    --maxmemory 14g \
    --maxmemory-policy allkeys-lru \
    --save "" \
    --appendonly no
```

Set Redis `maxmemory` to about 85-90% of the container memory limit. The remaining 10-15% covers Redis overhead, OS buffers, and child processes for RDB snapshots.

## Monitoring Memory Usage

### Real-Time Monitoring

```bash
# Docker stats with memory details
docker stats --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}"

# Detailed memory breakdown inside the container
docker exec mycontainer cat /proc/meminfo

# Check cgroup memory stats
docker exec mycontainer cat /sys/fs/cgroup/memory.current 2>/dev/null || \
docker exec mycontainer cat /sys/fs/cgroup/memory/memory.usage_in_bytes
```

### Memory Usage Breakdown Script

```bash
#!/bin/bash
# mem-breakdown.sh
# Shows detailed memory breakdown for a container

CONTAINER=$1

if [ -z "$CONTAINER" ]; then
    echo "Usage: $0 <container-name>"
    exit 1
fi

PID=$(docker inspect --format '{{.State.Pid}}' "$CONTAINER")

echo "=== Memory Breakdown for $CONTAINER (PID: $PID) ==="

# RSS (Resident Set Size)
RSS=$(cat /proc/$PID/status | grep VmRSS | awk '{print $2}')
echo "RSS: ${RSS} kB"

# Virtual memory
VIRT=$(cat /proc/$PID/status | grep VmSize | awk '{print $2}')
echo "Virtual: ${VIRT} kB"

# Shared memory
SHR=$(cat /proc/$PID/status | grep RssFile | awk '{print $2}')
echo "Shared: ${SHR} kB"

# Cgroup memory usage
CGROUP_USAGE=$(docker exec "$CONTAINER" cat /sys/fs/cgroup/memory.current 2>/dev/null || echo "N/A")
echo "Cgroup current: ${CGROUP_USAGE} bytes"

# Cgroup memory limit
CGROUP_LIMIT=$(docker exec "$CONTAINER" cat /sys/fs/cgroup/memory.max 2>/dev/null || echo "N/A")
echo "Cgroup limit: ${CGROUP_LIMIT} bytes"

# OOM events
OOM_COUNT=$(docker exec "$CONTAINER" cat /sys/fs/cgroup/memory.events 2>/dev/null | grep oom_kill | awk '{print $2}')
echo "OOM kills: ${OOM_COUNT:-0}"
```

### Detecting Memory Leaks

```bash
# Track memory usage over time
while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    mem=$(docker stats --no-stream --format '{{.MemUsage}}' mycontainer)
    echo "$timestamp $mem" >> /var/log/container-memory.log
    sleep 60
done
```

## Docker Compose for Memory-Intensive Stack

```yaml
# docker-compose.yml - memory-optimized configuration
services:
  analytics-engine:
    image: analytics:latest
    deploy:
      resources:
        limits:
          memory: 32G
        reservations:
          memory: 16G
    shm_size: '4g'
    tmpfs:
      - /tmp:size=2G
    environment:
      - MALLOC_ARENA_MAX=2
    ulimits:
      memlock:
        soft: -1
        hard: -1

  redis-cache:
    image: redis:7-alpine
    command: redis-server --maxmemory 14g --maxmemory-policy allkeys-lru
    deploy:
      resources:
        limits:
          memory: 16G
    sysctls:
      - net.core.somaxconn=65535

  postgres:
    image: postgres:16-alpine
    shm_size: '4g'
    deploy:
      resources:
        limits:
          memory: 16G
    environment:
      POSTGRES_SHARED_BUFFERS: 8GB
      POSTGRES_EFFECTIVE_CACHE_SIZE: 12GB
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Wrapping Up

Memory tuning for Docker containers requires attention at multiple levels: container memory limits, swap configuration, OOM behavior, kernel parameters, and application-specific settings. Start by setting explicit memory limits on every container. Then tune swappiness and swap limits based on your workload type. For in-memory databases, disable swap and set swappiness to zero. For JVM applications, give 20-30% headroom above the heap size. Monitor continuously and watch for OOM events, which signal that your limits need adjustment.
