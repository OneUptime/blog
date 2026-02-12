# How to Fix ECS 'OutOfMemoryError' in Container Tasks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Docker, Containers, Debugging

Description: Diagnose and resolve ECS OutOfMemoryError issues including container memory limits, JVM heap sizing, memory reservation vs hard limits, and monitoring strategies.

---

When an ECS task gets killed with an OutOfMemoryError (OOM), it means the container tried to use more memory than it was allowed. The Linux kernel's OOM killer steps in and terminates the process. In ECS, this usually shows up as an exit code 137 or a clear OOM error message in the task's stopped reason.

This is one of the more common production issues with containerized applications, and getting the memory configuration right requires understanding how ECS, Docker, and your application all interact.

## How ECS Memory Limits Work

ECS has two memory settings per container: `memory` (hard limit) and `memoryReservation` (soft limit).

- **memory** (hard limit): The maximum amount of memory the container can use. If the container exceeds this, the Docker daemon kills it.
- **memoryReservation** (soft limit): The amount of memory reserved during task placement. The container can use more than this as long as it doesn't hit the hard limit.

```json
{
    "containerDefinitions": [
        {
            "name": "app",
            "image": "my-app:latest",
            "memory": 1024,
            "memoryReservation": 512
        }
    ]
}
```

For Fargate, there's also a task-level memory setting that defines the total memory available to all containers in the task:

```json
{
    "cpu": "512",
    "memory": "1024",
    "containerDefinitions": [
        {
            "name": "app",
            "memory": 900
        },
        {
            "name": "sidecar",
            "memory": 100
        }
    ]
}
```

## Finding the OOM Cause

First, confirm it's actually an OOM kill:

```bash
# Check the stopped task details
aws ecs describe-tasks \
    --cluster my-cluster \
    --tasks <task-arn> \
    --query 'tasks[0].containers[].{Name:name,ExitCode:exitCode,Reason:reason}'
```

Exit code 137 means SIGKILL, which is what the OOM killer uses. The reason field might say "OutOfMemoryError: Container killed due to memory usage."

Check CloudWatch metrics for memory utilization history:

```bash
# Get memory utilization for the service
aws cloudwatch get-metric-statistics \
    --namespace AWS/ECS \
    --metric-name MemoryUtilization \
    --dimensions Name=ClusterName,Value=my-cluster Name=ServiceName,Value=my-service \
    --start-time 2026-02-11T00:00:00Z \
    --end-time 2026-02-12T00:00:00Z \
    --period 300 \
    --statistics Maximum Average
```

If memory utilization consistently approaches 100% before the OOM kill, the container simply needs more memory. If it spikes suddenly, you may have a memory leak.

## Java Applications and JVM Heap

Java applications are the most common culprit for OOM kills in containers because the JVM allocates a heap that can easily exceed container limits. Modern JVMs are container-aware, but you still need to configure them properly.

```dockerfile
# Set JVM to respect container memory limits
FROM eclipse-temurin:21-jre

# Option 1: Use container-aware flags (default in Java 10+)
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseContainerSupport"

# Option 2: Set explicit heap size
# ENV JAVA_OPTS="-Xmx768m -Xms512m"

COPY app.jar /app.jar
CMD ["sh", "-c", "java $JAVA_OPTS -jar /app.jar"]
```

The `-XX:MaxRAMPercentage=75.0` tells the JVM to use at most 75% of available memory for the heap. The remaining 25% is for non-heap memory (metaspace, thread stacks, native memory, etc.).

Don't set this to 100% - the JVM uses memory outside the heap:

```
Total JVM Memory = Heap + Metaspace + Thread Stacks + Native Memory + Code Cache
```

For a container with 1024 MB limit:

```
Heap (75%):          768 MB
Metaspace:           ~64 MB
Thread stacks:       ~50 MB (50 threads x 1MB each)
Native memory:       ~50 MB
Code cache:          ~50 MB
Other:               ~42 MB
Total:               ~1024 MB
```

## Node.js Memory Limits

Node.js has its own default heap limit (about 1.5 GB on 64-bit systems). If your container limit is lower, Node will try to allocate more memory than available:

```dockerfile
FROM node:20-slim

# Set Node.js heap limit to fit within container memory
ENV NODE_OPTIONS="--max-old-space-size=768"

COPY . /app
WORKDIR /app
CMD ["node", "server.js"]
```

Set `--max-old-space-size` to about 75-80% of your container's memory limit.

## Python Memory Issues

Python doesn't have a built-in memory limit, but it's prone to memory leaks through circular references and large data structures:

```python
import tracemalloc
import gc

# Enable memory tracking for debugging
tracemalloc.start()

# Periodically check memory usage
def log_memory_usage():
    snapshot = tracemalloc.take_snapshot()
    top_stats = snapshot.statistics('lineno')

    print("Top 10 memory allocations:")
    for stat in top_stats[:10]:
        print(f"  {stat}")

# Force garbage collection for circular references
gc.collect()
```

## Right-Sizing Container Memory

Don't just double the memory and call it a day. Profile your application to understand its actual needs:

```bash
# Run the container locally and monitor memory
docker run -d --name test --memory 1g my-app:latest

# Watch memory usage in real time
docker stats test --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

Load test the container to find peak memory usage:

```bash
# Run a load test and monitor memory
docker stats test --no-stream --format '{{.MemUsage}}'
# Run this periodically during your load test
```

Then set your container limits based on peak usage plus a buffer:

```
Hard limit = Peak usage * 1.25 (25% buffer)
Soft limit = Average usage * 1.1 (10% buffer)
```

## Fargate Memory Configurations

Fargate has specific CPU/memory combinations. You can't set arbitrary values:

| CPU | Memory Options |
|-----|---------------|
| 256 | 512, 1024, 2048 |
| 512 | 1024 - 4096 (in 1024 increments) |
| 1024 | 2048 - 8192 (in 1024 increments) |
| 2048 | 4096 - 16384 (in 1024 increments) |
| 4096 | 8192 - 30720 (in 1024 increments) |

Pick the right combination for your workload.

## Detecting Memory Leaks

If your container gradually uses more memory over time until it's killed, you have a memory leak. Set up monitoring to track memory over time:

```python
# Flask example: add a memory usage endpoint
import psutil
import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/debug/memory')
def memory_usage():
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    return jsonify({
        'rss_mb': mem_info.rss / 1024 / 1024,
        'vms_mb': mem_info.vms / 1024 / 1024,
        'percent': process.memory_percent()
    })
```

Use CloudWatch Container Insights for continuous monitoring:

```bash
# Enable Container Insights on your cluster
aws ecs update-cluster-settings \
    --cluster my-cluster \
    --settings name=containerInsights,value=enabled
```

For comprehensive monitoring of your containerized applications, including memory trends and OOM detection, consider setting up [proper alerting](https://oneuptime.com/blog/post/aws-cloudwatch-alerting-best-practices/view) so you catch memory issues before they cause outages.

## Summary

ECS OOM kills happen when containers exceed their memory limits. Set appropriate hard and soft limits based on actual profiling, configure your runtime's memory settings (JVM heap, Node max-old-space-size), and leave headroom for non-heap memory. Monitor memory trends to catch leaks early, and use Container Insights for ongoing visibility. Don't blindly increase limits - profile first, then right-size.
