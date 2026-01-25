# How to Debug Docker Container Memory Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Memory, Debugging, DevOps, Performance, Troubleshooting

Description: Diagnose and resolve Docker container memory problems including OOM kills, memory leaks, and resource misconfiguration using practical debugging techniques and monitoring tools.

---

Memory issues in Docker containers cause crashes, poor performance, and unpredictable behavior. When a container gets killed by the OOM (Out of Memory) killer, it often happens without warning. Understanding how to diagnose and fix these problems helps you build more reliable containerized applications.

## Understanding Container Memory Limits

Docker uses cgroups to enforce memory limits. When a container exceeds its limit, the kernel's OOM killer terminates processes inside the container.

Check if a container was OOM killed:

```bash
# Inspect container state
docker inspect mycontainer --format='{{.State.OOMKilled}}'

# Get more details about the exit
docker inspect mycontainer --format='{{json .State}}' | jq
```

The output shows whether OOM killed the container:

```json
{
  "Status": "exited",
  "Running": false,
  "OOMKilled": true,
  "ExitCode": 137
}
```

Exit code 137 (128 + 9) indicates the process received SIGKILL, usually from the OOM killer.

## Monitoring Real-Time Memory Usage

Watch memory consumption in real time:

```bash
# Live stats for all containers
docker stats

# Stats for specific container
docker stats mycontainer --no-stream
```

Output shows current memory usage versus the limit:

```
CONTAINER ID   NAME         CPU %     MEM USAGE / LIMIT     MEM %
a1b2c3d4e5f6   mycontainer  2.34%     456MiB / 512MiB       89.06%
```

For more detailed analysis, examine cgroup files directly:

```bash
# Shell into the container
docker exec -it mycontainer sh

# Check memory limits (cgroup v2)
cat /sys/fs/cgroup/memory.max

# Check current usage
cat /sys/fs/cgroup/memory.current

# Check memory events (including OOM events)
cat /sys/fs/cgroup/memory.events
```

## Setting Appropriate Memory Limits

Always set memory limits in production. Without limits, a single container can consume all host memory.

```bash
# Run with memory limit
docker run -d \
  --name myapp \
  --memory=512m \
  --memory-swap=512m \
  myapp:latest
```

The `--memory-swap` flag set equal to `--memory` disables swap, which is recommended for consistent performance.

In Docker Compose:

```yaml
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## Diagnosing Memory Leaks

Memory leaks cause gradual increases in usage until the container crashes. Profile your application to find the source.

### Node.js Memory Profiling

```javascript
// Enable heap snapshots via command line
// docker run -e NODE_OPTIONS="--expose-gc" myapp

// In your application code
const v8 = require('v8');
const fs = require('fs');

// Take heap snapshot for analysis
function takeHeapSnapshot() {
  const snapshotFile = `/tmp/heap-${Date.now()}.heapsnapshot`;
  const snapshotStream = v8.writeHeapSnapshot(snapshotFile);
  console.log(`Heap snapshot written to ${snapshotFile}`);
}

// Trigger via API endpoint or signal
process.on('SIGUSR2', takeHeapSnapshot);
```

Extract and analyze the snapshot:

```bash
# Copy snapshot from container
docker cp mycontainer:/tmp/heap-1234567890.heapsnapshot ./

# Open in Chrome DevTools (Memory tab)
```

### Python Memory Profiling

```python
# Install memory-profiler in your container
# pip install memory-profiler

from memory_profiler import profile

@profile
def memory_intensive_function():
    # Your code here
    data = []
    for i in range(1000000):
        data.append(i * 2)
    return data
```

Run with memory profiler:

```bash
docker exec mycontainer python -m memory_profiler app.py
```

### Using tracemalloc for Python

```python
import tracemalloc

# Start tracing
tracemalloc.start()

# Your application code runs here
process_data()

# Get memory statistics
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')

print("Top 10 memory allocations:")
for stat in top_stats[:10]:
    print(stat)
```

## Analyzing Memory Usage Patterns

Create a simple memory monitoring script:

```bash
#!/bin/bash
# monitor-memory.sh

CONTAINER=$1
INTERVAL=${2:-5}

echo "timestamp,memory_bytes,memory_percent" > memory_log.csv

while true; do
    STATS=$(docker stats $CONTAINER --no-stream --format "{{.MemUsage}}")
    MEM_USED=$(echo $STATS | awk -F'/' '{print $1}' | tr -d ' ')
    TIMESTAMP=$(date +%s)

    echo "$TIMESTAMP,$MEM_USED" >> memory_log.csv
    sleep $INTERVAL
done
```

Visualize with a simple Python script:

```python
import pandas as pd
import matplotlib.pyplot as plt

# Read memory log
df = pd.read_csv('memory_log.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')

# Plot memory usage over time
plt.figure(figsize=(12, 6))
plt.plot(df['timestamp'], df['memory_bytes'])
plt.xlabel('Time')
plt.ylabel('Memory Usage')
plt.title('Container Memory Usage Over Time')
plt.savefig('memory_usage.png')
```

## Investigating OOM Events

When containers die from OOM, gather evidence:

```bash
# Check Docker events for OOM kills
docker events --filter 'event=oom' --since 1h

# Check system logs for OOM killer activity
dmesg | grep -i "killed process"
journalctl -k | grep -i "out of memory"
```

The kernel log shows which process was killed and why:

```
[12345.678901] Memory cgroup out of memory: Killed process 1234 (node)
total-vm:1234567kB, anon-rss:456789kB, file-rss:12345kB
```

## Common Causes and Solutions

### Cause 1: Insufficient Memory Limit

Symptoms: Container works initially but crashes under load.

```yaml
# Increase memory limit based on profiling results
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G  # Increased from 512M
```

### Cause 2: Memory Leaks in Application Code

Symptoms: Memory grows steadily over time, regardless of load.

Common patterns to check:

```javascript
// Node.js: Event listeners not removed
class MyClass {
  constructor() {
    // BAD: Listener accumulates on every instantiation
    process.on('uncaughtException', this.handleError);
  }

  // GOOD: Clean up in destructor
  destroy() {
    process.removeListener('uncaughtException', this.handleError);
  }
}
```

```python
# Python: Large objects held in global scope
# BAD: Cache grows indefinitely
cache = {}

def process_request(request_id):
    result = expensive_computation()
    cache[request_id] = result  # Never cleaned up
    return result

# GOOD: Use LRU cache with max size
from functools import lru_cache

@lru_cache(maxsize=1000)
def process_request(request_id):
    return expensive_computation()
```

### Cause 3: JVM Heap Misconfiguration

Java applications need explicit heap sizing to respect container limits:

```dockerfile
FROM eclipse-temurin:21-jre

# Let JVM detect container limits automatically
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

COPY app.jar /app/app.jar
CMD ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
```

### Cause 4: Too Many Processes or Threads

```bash
# Check process count inside container
docker exec mycontainer ps aux | wc -l

# Check thread count
docker exec mycontainer cat /proc/*/status | grep Threads | awk '{sum+=$2} END {print sum}'
```

Limit thread pools appropriately:

```javascript
// Node.js: Limit worker threads
const { Worker } = require('worker_threads');
const os = require('os');

// Use fewer workers in containers
const MAX_WORKERS = parseInt(process.env.MAX_WORKERS) || Math.min(os.cpus().length, 4);
```

## Setting Memory Alerts

Integrate with monitoring systems to alert before OOM:

```yaml
# docker-compose.yml with health check
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          memory: 512M
    healthcheck:
      test: ["CMD", "/app/memory-check.sh"]
      interval: 30s
      timeout: 5s
      retries: 3
```

```bash
#!/bin/bash
# memory-check.sh - Fail health check if memory is too high

THRESHOLD=80
CURRENT=$(cat /sys/fs/cgroup/memory.current)
MAX=$(cat /sys/fs/cgroup/memory.max)

PERCENT=$((CURRENT * 100 / MAX))

if [ $PERCENT -gt $THRESHOLD ]; then
  echo "Memory usage at ${PERCENT}% (threshold: ${THRESHOLD}%)"
  exit 1
fi

exit 0
```

---

Memory issues in Docker containers require systematic debugging. Start by confirming OOM kills with `docker inspect`, monitor usage with `docker stats`, and profile your application to find leaks. Set appropriate memory limits based on observed usage patterns, and implement monitoring to catch problems before they cause outages.
