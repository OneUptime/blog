# How to Debug Memory Leaks in Production Using OpenTelemetry Runtime Metrics and Heap Profiling Correlation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Memory Leaks, Runtime Metrics, Debugging

Description: Debug production memory leaks by combining OpenTelemetry runtime metrics with heap profiling data to identify the exact code paths causing memory growth.

Memory leaks in production are insidious. Your service starts fine, handles traffic for hours, then pods start getting OOMKilled. Restarting buys you time but does not fix the problem. OpenTelemetry runtime metrics give you the visibility to detect memory leaks early, and correlating those metrics with heap profiles points you to the exact code that is leaking.

## Setting Up Runtime Metrics

OpenTelemetry SDKs can export runtime metrics that track memory usage, garbage collection, and other JVM/runtime statistics. Enable them in your service:

### Java / JVM

```java
import io.opentelemetry.instrumentation.runtimemetrics.java17.RuntimeMetrics;

// In your application startup
public class Application {
    public static void main(String[] args) {
        // This registers all JVM runtime metrics:
        // - jvm.memory.used (by memory pool)
        // - jvm.memory.committed
        // - jvm.gc.duration
        // - jvm.threads.count
        // - jvm.classes.loaded
        RuntimeMetrics runtimeMetrics = RuntimeMetrics.create(openTelemetry);

        // Start your application
        startServer();

        // Clean up on shutdown
        Runtime.getRuntime().addShutdownHook(new Thread(runtimeMetrics::close));
    }
}
```

### Node.js

```javascript
// Install: npm install @opentelemetry/instrumentation-runtime-node
const { RuntimeNodeInstrumentation } = require('@opentelemetry/instrumentation-runtime-node');

// Add to your SDK instrumentation list
const sdk = new NodeSDK({
  instrumentations: [
    new RuntimeNodeInstrumentation({
      // Emit metrics every 5 seconds
      monitoringPrecision: 5000,
    }),
    // ... other instrumentations
  ],
});

// This provides metrics like:
// - nodejs.memory.heap.used
// - nodejs.memory.heap.total
// - nodejs.memory.rss
// - nodejs.event_loop.delay
// - nodejs.gc.duration
```

### Python

```python
# Install: pip install opentelemetry-instrumentation-system-metrics
from opentelemetry.instrumentation.system_metrics import SystemMetricsInstrumentor

# This instruments process-level metrics
SystemMetricsInstrumentor().instrument()

# Provides metrics like:
# - process.runtime.cpython.memory (RSS, VMS)
# - process.runtime.cpython.gc_count
# - system.memory.usage
```

## Detecting a Memory Leak

Once runtime metrics are flowing, set up a dashboard and alert for memory growth:

```promql
# Dashboard query: heap memory usage over time, per pod
process_runtime_jvm_memory_used_bytes{type="heap", service_name="order-service"}

# Alert: memory usage growing steadily over 4 hours
# This detects a positive trend in heap usage
deriv(
  process_runtime_jvm_memory_used_bytes{type="heap", service_name="order-service"}[4h]
) > 0
```

A healthy service has a sawtooth memory pattern: memory grows as objects are allocated, then drops sharply when garbage collection runs. A leaking service shows a sawtooth with an upward trend, where each GC cycle reclaims less and less memory.

```
Healthy memory pattern:
  /\    /\    /\    /\
 /  \  /  \  /  \  /  \
/    \/    \/    \/    \

Leaking memory pattern:
                        /\
                    /\ /  \
                /\ /  \
            /\ /  \
        /\ /  \
    /\ /  \
/\ /  \
```

## Correlating with GC Metrics

When you suspect a leak, look at garbage collection metrics to confirm:

```promql
# GC pause duration is increasing over time
# This means the GC is working harder to reclaim memory
rate(process_runtime_jvm_gc_duration_seconds_sum{service_name="order-service"}[5m])

# GC frequency is increasing
# More frequent GC cycles indicate memory pressure
rate(process_runtime_jvm_gc_duration_seconds_count{service_name="order-service"}[5m])

# The amount of memory freed per GC cycle is decreasing
# This strongly suggests retained objects are growing
```

## Triggering a Heap Dump

Once you have confirmed a memory leak through metrics, you need a heap dump to identify the leaking objects. You can trigger this remotely:

### Java

```bash
# Trigger a heap dump on a running pod
kubectl exec -it order-service-pod-abc123 -- \
  jcmd 1 GC.heap_dump /tmp/heapdump.hprof

# Copy the dump locally for analysis
kubectl cp order-service-pod-abc123:/tmp/heapdump.hprof ./heapdump.hprof

# Analyze with Eclipse MAT or jhat
# Look for the "Leak Suspects" report in Eclipse MAT
```

### Node.js

```javascript
// Add an endpoint to trigger a heap snapshot (protect this with auth)
const v8 = require('v8');
const fs = require('fs');

app.post('/debug/heapdump', authMiddleware, (req, res) => {
  const filename = `/tmp/heapdump-${Date.now()}.heapsnapshot`;
  const snapshotStream = v8.writeHeapSnapshot(filename);
  res.json({ file: snapshotStream });
});
```

```bash
# Trigger the heap dump
kubectl exec -it order-service-pod -- \
  curl -X POST http://localhost:3000/debug/heapdump

# Copy and open in Chrome DevTools Memory tab
```

## Correlating Heap Data with Traces

The heap dump tells you what is leaking (e.g., "10 million String objects retained by a HashMap in CacheManager"). Now you need to find which code path is filling that cache. This is where trace correlation comes in.

```python
# If you suspect a specific code path is causing the leak,
# add memory metrics around it

import tracemalloc
from opentelemetry import trace, metrics

meter = metrics.get_meter("order-service")
tracer = trace.get_tracer("order-service")

# Track memory allocated per operation type
memory_allocated = meter.create_histogram(
    "app.memory.allocated_bytes",
    description="Memory allocated during an operation",
    unit="bytes",
)

def process_large_order(order):
    # Take a memory snapshot before the operation
    tracemalloc.start()
    snapshot_before = tracemalloc.take_snapshot()

    with tracer.start_as_current_span("order.process_large") as span:
        span.set_attribute("order.id", order.id)
        span.set_attribute("order.item_count", len(order.items))

        result = do_processing(order)

        # Measure memory difference
        snapshot_after = tracemalloc.take_snapshot()
        stats = snapshot_after.compare_to(snapshot_before, 'lineno')

        total_allocated = sum(s.size_diff for s in stats if s.size_diff > 0)
        span.set_attribute("memory.allocated_bytes", total_allocated)

        memory_allocated.record(total_allocated, {
            "operation": "process_large_order",
        })

        if total_allocated > 10_000_000:  # More than 10MB allocated
            span.add_event("high_memory_allocation", {
                "bytes": total_allocated,
                "top_allocator": str(stats[0]) if stats else "unknown",
            })

    tracemalloc.stop()
    return result
```

## Building a Debugging Timeline

Combine your metrics and traces into a timeline:

```markdown
## Memory Leak Investigation: order-service

### Timeline
- 08:00 UTC: Pod started, heap usage at 256MB
- 10:30 UTC: Heap usage at 512MB (normal for this load)
- 14:00 UTC: Heap usage at 1.2GB (abnormal growth detected)
- 14:15 UTC: GC pause duration increased from 50ms to 400ms
- 14:30 UTC: Triggered heap dump
- 14:35 UTC: Heap dump analysis shows 8M Order objects retained by ResponseCache

### Root Cause
The response cache in OrderController is not evicting entries.
Cache entries are keyed by order ID (high cardinality).
The cache was added in commit abc123 (deployed 2 days ago)
and has no max size or TTL configured.

### Trace Evidence
Traces show the process.order span allocating 2-5MB per request,
correlating with cache growth. The memory.allocated_bytes metric
confirms a linear increase matching the request rate.

### Fix
Add TTL and max size to the response cache configuration.
```

## Alerting on Memory Trends

Set up alerts that catch leaks before they cause OOM kills:

```yaml
groups:
  - name: memory-leak-detection
    rules:
      - alert: MemoryLeakSuspected
        expr: |
          deriv(process_runtime_jvm_memory_used_bytes{type="heap"}[2h]) > 1000000
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Heap memory growing steadily in {{ $labels.service_name }}"
          description: "Heap usage has been increasing by >1MB/sec for the last hour"
```

Runtime metrics make memory leaks visible. Heap dumps make them diagnosable. Trace correlation makes them attributable to specific code paths. Use all three together, and memory leaks go from mysterious restarts to solvable engineering problems.
