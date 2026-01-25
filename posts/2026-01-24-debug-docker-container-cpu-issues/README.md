# How to Debug Docker Container CPU Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, CPU, Performance, Debugging, DevOps, Troubleshooting

Description: Identify and resolve Docker container CPU problems including high utilization, throttling, and resource starvation using practical diagnostic tools and optimization techniques.

---

CPU issues in Docker containers manifest as slow response times, timeouts, and degraded performance. Understanding how to diagnose whether a container is starved for CPU, being throttled, or simply running inefficient code helps you fix problems faster and right-size your deployments.

## Monitoring CPU Usage

Start with real-time stats to understand current CPU consumption:

```bash
# Live CPU stats for all containers
docker stats

# Format output for easier reading
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Single container, non-streaming
docker stats mycontainer --no-stream
```

Sample output:

```
NAME           CPU %     MEM USAGE / LIMIT
api            125.50%   256MiB / 512MiB
worker         45.23%    128MiB / 256MiB
database       12.10%    512MiB / 1GiB
```

CPU percentages above 100% indicate the container uses more than one CPU core.

## Understanding CPU Limits and Throttling

Docker can limit CPU using two mechanisms:

### CPU Shares (Relative Weight)

```bash
# Default is 1024, higher = more CPU in contention
docker run --cpu-shares=512 myapp  # Half the default priority
docker run --cpu-shares=2048 myapp # Double the default priority
```

CPU shares only matter when containers compete for CPU. If the host has spare capacity, shares are ignored.

### CPU Quota (Hard Limit)

```bash
# Limit to 1.5 CPU cores
docker run --cpus=1.5 myapp

# Alternative: specify period and quota directly
# 150000 microseconds of CPU time per 100000 microsecond period = 1.5 cores
docker run --cpu-period=100000 --cpu-quota=150000 myapp
```

## Detecting CPU Throttling

When a container exceeds its CPU quota, the kernel throttles it. Check throttling stats:

```bash
# Inside the container (cgroup v2)
cat /sys/fs/cgroup/cpu.stat

# Output shows throttling information
usage_usec 123456789
user_usec 100000000
system_usec 23456789
nr_periods 50000
nr_throttled 12000        # Number of times throttled
throttled_usec 30000000   # Time spent throttled (microseconds)
```

From the host:

```bash
# Find the container's cgroup
CONTAINER_ID=$(docker inspect mycontainer --format '{{.Id}}')

# Check throttling stats (cgroup v1)
cat /sys/fs/cgroup/cpu/docker/$CONTAINER_ID/cpu.stat
```

High `nr_throttled` values indicate the container needs more CPU allocation.

## Diagnosing High CPU Usage

### Identify the Process

```bash
# Top processes inside the container
docker exec mycontainer top -bn1

# Or use ps for a snapshot
docker exec mycontainer ps aux --sort=-%cpu | head -10
```

### Profile the Application

For Node.js applications:

```bash
# Start with profiling enabled
docker run -d \
  --name myapp \
  -e NODE_OPTIONS="--prof" \
  myapp:latest

# Generate CPU profile
docker exec myapp node --cpu-prof --cpu-prof-interval=100 -e "require('./app')"
```

For Python applications:

```bash
# Profile with py-spy (no code changes needed)
docker exec mycontainer pip install py-spy
docker exec mycontainer py-spy top --pid 1
```

For Java applications:

```bash
# Take thread dump
docker exec mycontainer jstack 1

# Continuous profiling with async-profiler
docker exec mycontainer ./profiler.sh -d 30 -f /tmp/flamegraph.svg 1
```

### Check for CPU-Intensive Operations

Common causes of high CPU:

1. **Busy loops or polling**: Look for tight loops without proper delays
2. **Inefficient algorithms**: O(n^2) operations on large datasets
3. **Excessive logging**: String formatting overhead
4. **Serialization/deserialization**: JSON parsing large objects
5. **Regular expressions**: Catastrophic backtracking

## Setting Appropriate CPU Limits

Base limits on observed usage plus headroom:

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    image: myapi:latest
    deploy:
      resources:
        limits:
          cpus: '2.0'      # Hard limit: 2 cores
        reservations:
          cpus: '0.5'      # Guaranteed minimum

  worker:
    image: myworker:latest
    deploy:
      resources:
        limits:
          cpus: '4.0'      # CPU-intensive work
        reservations:
          cpus: '1.0'
```

### Right-Sizing Guidelines

```bash
# Monitor peak CPU over time
docker stats mycontainer --format "{{.CPUPerc}}" | while read cpu; do
    echo "$(date +%s),$cpu" >> cpu_log.csv
    sleep 5
done

# Analyze the data
# Peak usage + 20% headroom = recommended limit
```

## CPU Pinning for Performance

Pin containers to specific CPU cores for cache efficiency:

```bash
# Run on cores 0 and 1 only
docker run --cpuset-cpus="0,1" myapp

# Run on cores 0-3
docker run --cpuset-cpus="0-3" myapp
```

This helps when:

- Running latency-sensitive workloads
- Isolating noisy neighbors
- Optimizing NUMA-aware applications

```yaml
# docker-compose.yml
services:
  latency-critical:
    image: myapp:latest
    cpuset: "0,1"
```

## Troubleshooting Specific Issues

### Issue: Container Shows 0% CPU But Is Slow

The process might be waiting on I/O, not CPU:

```bash
# Check I/O wait
docker exec mycontainer top -bn1 | grep "Cpu(s)"
# Look for %wa (I/O wait)

# Check disk I/O
docker exec mycontainer iostat -x 1 3
```

### Issue: Erratic CPU Spikes

Look for periodic tasks or cron jobs:

```bash
# Monitor CPU over time with timestamps
while true; do
    echo "$(date): $(docker stats mycontainer --no-stream --format '{{.CPUPerc}}')"
    sleep 10
done
```

### Issue: All Containers Slow on Host

Check if the host itself is overloaded:

```bash
# Host CPU usage
top -bn1 | head -5

# Check for CPU steal (in virtualized environments)
# High %st means hypervisor is taking CPU from your VM
vmstat 1 5
```

### Issue: Container Throttled Despite Low Average CPU

Burst patterns cause throttling even with low average:

```bash
# The container might spike to 400% CPU briefly, then idle
# Average looks low but throttling occurs during spikes

# Solution: Increase limit to accommodate bursts
docker update --cpus=4 mycontainer
```

## Optimizing Application CPU Usage

### Use Worker Pools Appropriately

```javascript
// Node.js: Don't exceed available CPUs
const os = require('os');
const cluster = require('cluster');

// In container, this might be limited by cgroup
const numWorkers = parseInt(process.env.WORKERS) || os.cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
}
```

### Implement Backpressure

```python
# Python: Limit concurrent processing
from concurrent.futures import ThreadPoolExecutor
import os

# Match pool size to CPU allocation
max_workers = int(os.environ.get('MAX_WORKERS', 4))

with ThreadPoolExecutor(max_workers=max_workers) as executor:
    results = executor.map(process_item, items)
```

### Profile and Optimize Hot Paths

```go
// Go: Use pprof for CPU profiling
import (
    "net/http"
    _ "net/http/pprof"
)

func main() {
    // Expose profiling endpoint
    go func() {
        http.ListenAndServe("localhost:6060", nil)
    }()

    // Your application code
}

// Access profile: go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
```

---

CPU debugging in Docker requires understanding both the container's resource limits and the application's behavior. Start with `docker stats` to identify high-CPU containers, check for throttling in cgroup stats, and profile your application to find inefficient code. Set CPU limits based on observed usage patterns, and consider CPU pinning for performance-critical workloads.
