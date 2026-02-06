# How to Detect Memory Leak Trends in Production Using OpenTelemetry Runtime Metrics Over Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Memory Leaks, Runtime Metrics, Production Monitoring, Debugging

Description: Detect memory leak trends in production applications using OpenTelemetry runtime metrics to catch leaks before they cause outages or OOM kills.

Memory leaks in production are tricky. They do not crash your application immediately. Instead, memory usage grows slowly over hours or days until eventually the process gets OOM-killed or garbage collection pauses become unbearable. The key to catching them early is trending runtime memory metrics over time. OpenTelemetry runtime instrumentation gives you exactly the data you need.

## Enabling Runtime Metrics

Different language runtimes expose different memory metrics. Here is how to set up runtime metrics for the most common languages.

### Node.js Runtime Metrics

```javascript
// runtime-metrics.js
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { RuntimeNodeInstrumentation } = require('@opentelemetry/instrumentation-runtime-node');

const exporter = new OTLPMetricExporter({
  url: 'http://otel-collector:4317',
});

const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 15000, // collect every 15 seconds
    }),
  ],
});

// Enable built-in Node.js runtime metrics
const runtimeInstrumentation = new RuntimeNodeInstrumentation({
  monitoringPrecision: 10000, // collect every 10 seconds
});
runtimeInstrumentation.setMeterProvider(meterProvider);

// The instrumentation automatically collects:
// - process.runtime.nodejs.memory.heap.total (heap size)
// - process.runtime.nodejs.memory.heap.used (heap used)
// - process.runtime.nodejs.memory.rss (resident set size)
// - process.runtime.nodejs.memory.array_buffers (external memory)
// - process.runtime.nodejs.event_loop.delay (event loop lag)
// - process.runtime.nodejs.gc.duration (GC pause duration)
// - process.runtime.nodejs.gc.count (GC runs)
```

### Python Runtime Metrics

```python
# runtime_metrics.py
import gc
import tracemalloc
from opentelemetry import metrics

meter = metrics.get_meter("python-runtime")

# Track heap allocations using tracemalloc
tracemalloc.start()

def heap_callback(options):
    current, peak = tracemalloc.get_traced_memory()
    yield metrics.Observation(current, {"memory.type": "current_allocated"})
    yield metrics.Observation(peak, {"memory.type": "peak_allocated"})

def gc_callback(options):
    # Report garbage collector statistics
    for generation in range(3):
        stats = gc.get_stats()[generation]
        yield metrics.Observation(
            stats["collections"],
            {"gc.generation": str(generation), "gc.stat": "collections"},
        )
        yield metrics.Observation(
            stats["collected"],
            {"gc.generation": str(generation), "gc.stat": "collected_objects"},
        )
        yield metrics.Observation(
            stats["uncollectable"],
            {"gc.generation": str(generation), "gc.stat": "uncollectable_objects"},
        )

def object_count_callback(options):
    """Track the number of live objects by type - helps identify what is leaking."""
    import sys
    type_counts = {}
    for obj in gc.get_objects():
        type_name = type(obj).__name__
        type_counts[type_name] = type_counts.get(type_name, 0) + 1

    # Report top 10 object types by count
    for type_name, count in sorted(type_counts.items(), key=lambda x: -x[1])[:10]:
        yield metrics.Observation(count, {"object.type": type_name})

meter.create_observable_gauge(
    "process.runtime.python.memory",
    callbacks=[heap_callback],
    unit="By",
)
meter.create_observable_gauge(
    "process.runtime.python.gc",
    callbacks=[gc_callback],
)
meter.create_observable_gauge(
    "process.runtime.python.objects",
    callbacks=[object_count_callback],
)
```

## Detecting Leak Patterns with PromQL

The simplest leak detection is checking if memory usage trends upward over time, even when adjusted for request volume:

```promql
# Memory growth rate over the past 6 hours (bytes per second)
deriv(process_runtime_nodejs_memory_heap_used[6h])

# If this is consistently positive, memory is growing

# Memory per request (normalizes for traffic variation)
process_runtime_nodejs_memory_heap_used
/
rate(http_requests_total[5m])

# If memory per request increases over time, that is a leak

# GC reclamation efficiency
# Healthy: GC reclaims most memory
# Leaking: GC reclaims less and less over time
rate(process_runtime_nodejs_gc_duration_seconds_sum[5m])
/
abs(delta(process_runtime_nodejs_memory_heap_used[5m]))
```

## Building a Leak Detection Script

For more sophisticated detection, use a Python script that checks multiple signals:

```python
# detect_memory_leak.py
import requests
import numpy as np
import sys

PROMETHEUS_URL = "http://prometheus:9090"

def query_range(query, duration="24h", step="5m"):
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query_range", params={
        "query": query,
        "start": f"now()-{duration}",
        "end": "now()",
        "step": step,
    })
    results = resp.json().get("data", {}).get("result", [])
    if results:
        return [float(v[1]) for v in results[0]["values"]]
    return []

def detect_trend(values, label="metric"):
    """Detect if a time series has a statistically significant upward trend."""
    if len(values) < 10:
        return False, 0

    x = np.arange(len(values))
    slope, intercept = np.polyfit(x, values, 1)

    # Calculate R-squared to check if the trend is consistent
    y_pred = slope * x + intercept
    ss_res = np.sum((values - y_pred) ** 2)
    ss_tot = np.sum((values - np.mean(values)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    # A leak shows consistent upward trend (positive slope, high R-squared)
    is_leak = slope > 0 and r_squared > 0.7

    if is_leak:
        growth_per_hour = slope * (3600 / 300)  # convert per-sample to per-hour
        print(f"  [LEAK] {label}: slope={slope:.4f}, R2={r_squared:.3f}, growth={growth_per_hour:.1f}/hour")
    else:
        print(f"  [OK] {label}: slope={slope:.4f}, R2={r_squared:.3f}")

    return is_leak, r_squared

def main():
    print("Checking memory leak indicators over the past 24 hours...\n")

    leaks_found = []

    # Check heap memory
    heap_data = query_range('process_runtime_nodejs_memory_heap_used')
    is_leak, confidence = detect_trend(np.array(heap_data), "Heap Used")
    if is_leak:
        leaks_found.append(("Heap Memory", confidence))

    # Check RSS
    rss_data = query_range('process_runtime_nodejs_memory_rss')
    is_leak, confidence = detect_trend(np.array(rss_data), "RSS")
    if is_leak:
        leaks_found.append(("RSS", confidence))

    # Check memory per request ratio
    mem_per_req = query_range(
        'process_runtime_nodejs_memory_heap_used / rate(http_requests_total[5m])'
    )
    is_leak, confidence = detect_trend(np.array(mem_per_req), "Memory per Request")
    if is_leak:
        leaks_found.append(("Memory per Request", confidence))

    # Check GC frequency increase
    gc_rate = query_range('rate(process_runtime_nodejs_gc_count_total[5m])')
    is_leak, confidence = detect_trend(np.array(gc_rate), "GC Frequency")
    if is_leak:
        leaks_found.append(("GC Frequency", confidence))

    if leaks_found:
        print(f"\nPotential memory leak detected! {len(leaks_found)} indicator(s) positive.")
        for name, conf in leaks_found:
            print(f"  - {name} (confidence: {conf:.2f})")
        return 1
    else:
        print("\nNo memory leak indicators found.")
        return 0

if __name__ == "__main__":
    sys.exit(main())
```

## Alerting Rules for Memory Leaks

```yaml
# memory-leak-alerts.yaml
groups:
  - name: memory-leak-detection
    rules:
      - alert: MemoryLeakSuspected
        expr: |
          deriv(process_runtime_nodejs_memory_heap_used[6h]) > 1048576
        for: 2h
        labels:
          severity: warning
        annotations:
          summary: "Heap memory growing at over 1MB/hour for {{ $labels.service_name }}"

      - alert: MemoryLeakConfirmed
        expr: |
          deriv(process_runtime_nodejs_memory_heap_used[24h]) > 524288
          and
          increase(process_runtime_nodejs_gc_count_total[1h]) > increase(process_runtime_nodejs_gc_count_total[1h] offset 6h) * 1.5
        for: 6h
        labels:
          severity: critical
        annotations:
          summary: "Confirmed memory leak in {{ $labels.service_name }}: consistent growth with increasing GC pressure"
```

## What to Do When You Find a Leak

Once the metrics confirm a leak, use heap snapshots for diagnosis. Add an endpoint that triggers a heap dump:

```javascript
// debug-endpoint.js
const v8 = require('v8');
const fs = require('fs');

app.get('/debug/heapdump', (req, res) => {
  // Only allow in non-production or with auth
  const filename = `/tmp/heapdump-${Date.now()}.heapsnapshot`;
  const snapshotStream = v8.writeHeapSnapshot(filename);
  res.json({ file: snapshotStream, size: fs.statSync(snapshotStream).size });
});
```

Compare heap snapshots taken at different times to see which objects are accumulating. The OpenTelemetry metrics tell you there is a leak; heap snapshots tell you exactly what is leaking.

## Wrapping Up

Memory leaks are much easier to fix when caught early. OpenTelemetry runtime metrics give you continuous visibility into memory behavior without adding significant overhead. By trending heap usage, GC frequency, and memory-per-request ratios over time, you can catch leaks days before they cause production incidents. The combination of automated trend detection and alerting means you will know about a leak long before the OOM killer does.
