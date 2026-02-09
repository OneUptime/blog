# How to Diagnose Kubernetes Container Memory Leaks Using Memory Profiling Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Performance, Debugging

Description: Learn how to diagnose and fix memory leaks in Kubernetes containers using profiling tools with practical examples for different programming languages.

---

Memory leaks in containerized applications cause pods to be OOMKilled repeatedly, degrading application availability. Traditional debugging approaches don't work well in containers, requiring specialized profiling techniques. Understanding how to profile memory usage in Kubernetes environments helps you identify and fix leaks before they impact production.

## Symptoms of Memory Leaks

Memory leaks manifest as steadily increasing memory usage over time. Pods restart due to OOMKill events. Application performance degrades as the garbage collector works harder. Request latency increases and throughput decreases as memory pressure builds.

Check pod events for OOMKilled containers.

```bash
# View pod events
kubectl describe pod my-app-abc123 -n production | grep -A 5 Events

# Check for OOMKilled containers
kubectl get events -n production | grep OOMKilling

# View pod restart count
kubectl get pods -n production -o wide

# Check container exit codes (137 indicates OOMKill)
kubectl get pod my-app-abc123 -n production -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}'
```

Exit code 137 (128 + 9 for SIGKILL) confirms OOMKill.

## Monitoring Memory Usage Trends

Track memory usage over time to identify leaks.

```bash
# Check current memory usage
kubectl top pod my-app-abc123 -n production --containers

# Get memory metrics from metrics-server
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/production/pods/my-app-abc123
```

Use Prometheus to track memory trends over days or weeks.

```yaml
# Prometheus query for memory growth
container_memory_working_set_bytes{pod="my-app-abc123", namespace="production"}

# Rate of memory increase
rate(container_memory_working_set_bytes{pod="my-app-abc123"}[1h])

# Alert on steady memory growth
increase(container_memory_working_set_bytes{pod="my-app-abc123"}[6h]) > 500000000
```

Steadily increasing memory without corresponding load increases indicates a leak.

## Profiling Node.js Applications

Node.js provides heap snapshots and profiling through the inspector protocol.

```javascript
// Add profiling endpoint to your application
const v8 = require('v8');
const fs = require('fs');
const express = require('express');

const app = express();

// Endpoint to trigger heap snapshot
app.get('/debug/heapsnapshot', (req, res) => {
  const filename = `/tmp/heapsnapshot-${Date.now()}.heapsnapshot`;
  const snapshot = v8.writeHeapSnapshot(filename);
  res.json({ snapshot: filename });
});

// Endpoint to get memory usage
app.get('/debug/memory', (req, res) => {
  const usage = process.memoryUsage();
  res.json({
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
    external: Math.round(usage.external / 1024 / 1024) + ' MB',
  });
});

app.listen(8080);
```

Take heap snapshots and analyze them with Chrome DevTools.

```bash
# Port forward to pod
kubectl port-forward my-app-abc123 -n production 8080:8080

# Trigger heap snapshot
curl http://localhost:8080/debug/heapsnapshot

# Copy snapshot from pod
kubectl cp production/my-app-abc123:/tmp/heapsnapshot-xxx.heapsnapshot ./snapshot.heapsnapshot

# Open in Chrome DevTools Memory profiler
# chrome://inspect > Open dedicated DevTools for Node
```

Compare snapshots taken at different times to identify growing objects.

## Profiling Python Applications

Python's memory_profiler and tracemalloc help identify memory leaks.

```python
import tracemalloc
import os
from flask import Flask, jsonify

app = Flask(__name__)

# Start memory tracking
tracemalloc.start()

@app.route('/debug/memory')
def memory_stats():
    # Get current memory usage
    current, peak = tracemalloc.get_traced_memory()

    # Get top memory allocations
    snapshot = tracemalloc.take_snapshot()
    top_stats = snapshot.statistics('lineno')

    top_allocations = []
    for stat in top_stats[:10]:
        top_allocations.append({
            'file': stat.traceback.format()[0],
            'size_mb': stat.size / 1024 / 1024
        })

    return jsonify({
        'current_mb': current / 1024 / 1024,
        'peak_mb': peak / 1024 / 1024,
        'top_allocations': top_allocations
    })

@app.route('/debug/memory/snapshot')
def take_snapshot():
    snapshot = tracemalloc.take_snapshot()
    filename = f'/tmp/memory-snapshot-{os.getpid()}.pickle'

    # Save snapshot for later analysis
    import pickle
    with open(filename, 'wb') as f:
        pickle.dump(snapshot, f)

    return jsonify({'snapshot': filename})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Analyze snapshots to find memory leaks.

```python
# Compare two snapshots
import tracemalloc
import pickle

# Load snapshots
with open('snapshot1.pickle', 'rb') as f:
    snapshot1 = pickle.load(f)

with open('snapshot2.pickle', 'rb') as f:
    snapshot2 = pickle.load(f)

# Compare and find top differences
top_stats = snapshot2.compare_to(snapshot1, 'lineno')

for stat in top_stats[:10]:
    print(f"{stat.size_diff / 1024 / 1024:.2f} MB - {stat.traceback.format()}")
```

## Profiling Go Applications

Go's pprof provides comprehensive profiling capabilities.

```go
package main

import (
    "net/http"
    _ "net/http/pprof"
    "runtime"
    "time"
)

func main() {
    // Enable memory profiling
    runtime.MemProfileRate = 1

    // Expose pprof endpoints
    go func() {
        http.ListenAndServe("localhost:6060", nil)
    }()

    // Your application code
    runApplication()
}

func runApplication() {
    // Add periodic memory stats logging
    go func() {
        ticker := time.NewTicker(30 * time.Second)
        for range ticker.C {
            var m runtime.MemStats
            runtime.ReadMemStats(&m)

            log.Printf("Memory Stats:")
            log.Printf("  Alloc = %v MB", m.Alloc / 1024 / 1024)
            log.Printf("  TotalAlloc = %v MB", m.TotalAlloc / 1024 / 1024)
            log.Printf("  Sys = %v MB", m.Sys / 1024 / 1024)
            log.Printf("  NumGC = %v", m.NumGC)
        }
    }()

    // Application logic here
}
```

Access pprof endpoints to analyze memory.

```bash
# Port forward to pod
kubectl port-forward my-go-app-abc123 -n production 6060:6060

# Get heap profile
curl http://localhost:6060/debug/pprof/heap > heap.prof

# Get allocation profile
curl http://localhost:6060/debug/pprof/allocs > allocs.prof

# Analyze with pprof
go tool pprof heap.prof

# Interactive pprof commands
(pprof) top10
(pprof) list functionName
(pprof) web  # Generate visual graph
```

Compare profiles taken at different times to find growing allocations.

## Profiling Java/JVM Applications

JVM applications use heap dumps and profilers like VisualVM or YourKit.

```java
import com.sun.management.HotSpotDiagnosticMXBean;
import java.lang.management.ManagementFactory;
import javax.management.MBeanServer;

public class MemoryDiagnostics {
    public static void dumpHeap(String filePath) {
        try {
            MBeanServer server = ManagementFactory.getPlatformMBeanServer();
            HotSpotDiagnosticMXBean mxBean = ManagementFactory.newPlatformMXBeanProxy(
                server,
                "com.sun.management:type=HotSpotDiagnostic",
                HotSpotDiagnosticMXBean.class
            );
            mxBean.dumpHeap(filePath, true);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void printMemoryStats() {
        Runtime runtime = Runtime.getRuntime();
        long maxMemory = runtime.maxMemory();
        long allocatedMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = allocatedMemory - freeMemory;

        System.out.println("Max Memory: " + (maxMemory / 1024 / 1024) + " MB");
        System.out.println("Allocated Memory: " + (allocatedMemory / 1024 / 1024) + " MB");
        System.out.println("Used Memory: " + (usedMemory / 1024 / 1024) + " MB");
        System.out.println("Free Memory: " + (freeMemory / 1024 / 1024) + " MB");
    }
}
```

Trigger heap dump and analyze with Eclipse MAT.

```bash
# Trigger heap dump via JMX
kubectl exec -it my-java-app-abc123 -n production -- \
  jcmd 1 GC.heap_dump /tmp/heap.hprof

# Copy heap dump from pod
kubectl cp production/my-java-app-abc123:/tmp/heap.hprof ./heap.hprof

# Analyze with Eclipse MAT or VisualVM
```

## Using Ephemeral Debug Containers

Kubernetes ephemeral containers allow attaching debugging tools to running pods.

```bash
# Attach ephemeral debug container with profiling tools
kubectl debug -it my-app-abc123 -n production \
  --image=nicolaka/netshoot \
  --target=app-container

# Inside debug container, access process namespace
# Install and run profiling tools
```

This approach works when you can't modify the application container.

## Analyzing Core Dumps

Configure pods to generate core dumps on crash for post-mortem analysis.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-coredump
spec:
  containers:
  - name: app
    image: myapp:1.0
    resources:
      limits:
        core: "1"
    securityContext:
      allowPrivilegeEscalation: false
    volumeMounts:
    - name: coredump
      mountPath: /cores
  volumes:
  - name: coredump
    hostPath:
      path: /var/cores
      type: DirectoryOrCreate
```

Set ulimit for core dumps in the container.

```dockerfile
# In Dockerfile
RUN echo "* soft core unlimited" >> /etc/security/limits.conf && \
    echo "* hard core unlimited" >> /etc/security/limits.conf
```

## Continuous Memory Profiling

Use continuous profiling tools like Pyroscope or Parca for production monitoring.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pyroscope
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pyroscope
  template:
    metadata:
      labels:
        app: pyroscope
    spec:
      containers:
      - name: pyroscope
        image: pyroscope/pyroscope:latest
        ports:
        - containerPort: 4040
        env:
        - name: PYROSCOPE_LOG_LEVEL
          value: "info"
```

Instrument applications to push profiles to Pyroscope.

## Common Memory Leak Patterns

Event listeners not removed cause leaks in JavaScript applications.

```javascript
// Bad: Leak through unreleased event listener
function addListener() {
  const data = new Array(1000000);  // Large allocation
  window.addEventListener('resize', () => {
    console.log(data.length);  // Closure keeps data alive
  });
}

// Good: Remove listener when done
function addListener() {
  const data = new Array(1000000);
  const handler = () => console.log(data.length);
  window.addEventListener('resize', handler);

  // Cleanup
  return () => window.removeEventListener('resize', handler);
}
```

Caches without eviction policies grow unbounded.

```python
# Bad: Unbounded cache
cache = {}

def get_data(key):
    if key not in cache:
        cache[key] = expensive_operation(key)
    return cache[key]

# Good: LRU cache with size limit
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_data(key):
    return expensive_operation(key)
```

## Best Practices

Add memory profiling endpoints to applications during development. Don't wait for production leaks to add instrumentation.

Set appropriate memory limits on containers. Limits should be based on profiled memory usage plus headroom.

Monitor memory trends continuously. Set alerts for unexpected growth patterns.

Test applications under realistic load for extended periods. Many leaks only appear after hours or days.

Use memory profilers regularly during development. Catching leaks early is cheaper than debugging production issues.

## Conclusion

Memory leaks in Kubernetes containers are diagnosable with proper profiling tools and techniques. Add profiling endpoints to applications, monitor memory trends with Prometheus, and use language-specific profilers to identify leak sources. Compare heap snapshots or profiles taken over time to find growing allocations. Fix common patterns like unreleased event listeners and unbounded caches. With continuous profiling and monitoring, you can catch and fix memory leaks before they impact production workloads.
