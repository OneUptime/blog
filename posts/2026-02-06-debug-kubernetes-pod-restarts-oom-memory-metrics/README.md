# How to Debug Kubernetes Pod Restarts by Correlating OOM Kill Events with OpenTelemetry Memory Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, OOM Kill, Memory Metrics, Debugging

Description: Correlate Kubernetes OOM kill events with OpenTelemetry memory metrics to identify the root cause of unexpected pod restarts.

Your pod keeps restarting. `kubectl describe pod` shows `OOMKilled` as the last termination reason. You increase the memory limit, the restarts stop for a week, then come back. This cycle continues until you actually figure out what is consuming the memory. OpenTelemetry runtime metrics give you the visibility to track memory usage over time and correlate it with the specific operations that cause the growth.

## Collecting Runtime Memory Metrics

First, instrument your application to export memory metrics. Here is a Python example:

```python
import psutil
import os
from opentelemetry import metrics

meter = metrics.get_meter("runtime-metrics")

# Create observable gauges for memory stats
def get_memory_stats(callback_options):
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()

    yield metrics.Observation(
        value=mem_info.rss,
        attributes={"memory.type": "rss"},
    )
    yield metrics.Observation(
        value=mem_info.vms,
        attributes={"memory.type": "vms"},
    )

meter.create_observable_gauge(
    name="process.memory.usage",
    callbacks=[get_memory_stats],
    description="Process memory usage in bytes",
    unit="bytes",
)

# Track memory allocation rate per endpoint
memory_delta = meter.create_histogram(
    name="request.memory.delta",
    description="Memory change during request processing",
    unit="bytes",
)


def track_memory_for_request(endpoint):
    """Decorator to track memory allocation during a request."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            process = psutil.Process(os.getpid())
            mem_before = process.memory_info().rss

            result = func(*args, **kwargs)

            mem_after = process.memory_info().rss
            delta = mem_after - mem_before

            memory_delta.record(delta, attributes={
                "http.route": endpoint,
                "memory.grew": str(delta > 0),
            })

            return result
        return wrapper
    return decorator


# Usage
@track_memory_for_request("/api/reports/generate")
def generate_report(request):
    # This endpoint might be the memory hog
    data = load_large_dataset(request.params)
    report = build_report(data)
    return report
```

## Correlating Memory Growth with Traces

The key technique is to record memory snapshots as span attributes so you can correlate memory growth with specific operations:

```python
from opentelemetry import trace
import psutil
import os

tracer = trace.get_tracer("memory-debugger")

class MemoryTracker:
    """Track memory changes within traced operations."""

    @staticmethod
    def start_tracking():
        process = psutil.Process(os.getpid())
        return process.memory_info().rss

    @staticmethod
    def record_on_span(span, label, mem_before):
        process = psutil.Process(os.getpid())
        mem_after = process.memory_info().rss
        delta_mb = (mem_after - mem_before) / (1024 * 1024)

        span.set_attribute(f"memory.{label}.before_mb", mem_before / (1024 * 1024))
        span.set_attribute(f"memory.{label}.after_mb", mem_after / (1024 * 1024))
        span.set_attribute(f"memory.{label}.delta_mb", round(delta_mb, 2))

        if delta_mb > 50:  # Alert threshold: 50MB growth
            span.add_event("memory.high_growth", attributes={
                "memory.delta_mb": round(delta_mb, 2),
                "memory.phase": label,
            })

        return mem_after


def process_order_with_memory_tracking(order):
    with tracer.start_as_current_span("process_order") as span:
        mem_start = MemoryTracker.start_tracking()

        # Track memory through each phase
        items = load_order_items(order.id)
        MemoryTracker.record_on_span(span, "after_load_items", mem_start)

        enriched = enrich_with_product_data(items)
        MemoryTracker.record_on_span(span, "after_enrich", mem_start)

        result = calculate_totals(enriched)
        MemoryTracker.record_on_span(span, "after_calculate", mem_start)

        return result
```

## Detecting Memory Leaks with Trend Analysis

Query your metrics backend to find endpoints where memory consistently grows without returning to baseline:

```python
def detect_memory_leak_endpoints(metric_data, window_hours=4):
    """
    Analyze request.memory.delta histograms to find endpoints
    where memory consistently grows.
    """
    endpoint_stats = {}

    for data_point in metric_data:
        endpoint = data_point["attributes"]["http.route"]
        delta = data_point["value"]

        if endpoint not in endpoint_stats:
            endpoint_stats[endpoint] = {
                "total_delta": 0,
                "positive_deltas": 0,
                "negative_deltas": 0,
                "request_count": 0,
            }

        stats = endpoint_stats[endpoint]
        stats["total_delta"] += delta
        stats["request_count"] += 1

        if delta > 0:
            stats["positive_deltas"] += 1
        elif delta < 0:
            stats["negative_deltas"] += 1

    # Flag endpoints where most requests increase memory
    leaky = []
    for endpoint, stats in endpoint_stats.items():
        if stats["request_count"] < 100:
            continue

        growth_ratio = stats["positive_deltas"] / stats["request_count"]
        if growth_ratio > 0.8:  # 80%+ of requests grow memory
            leaky.append({
                "endpoint": endpoint,
                "growth_ratio": round(growth_ratio, 2),
                "avg_growth_bytes": stats["total_delta"] / stats["request_count"],
                "total_growth_mb": stats["total_delta"] / (1024 * 1024),
            })

    leaky.sort(key=lambda x: x["total_growth_mb"], reverse=True)
    return leaky
```

## Linking Kubernetes Events to OpenTelemetry Data

Use the Kubernetes events API to pull OOM kill timestamps and correlate them with your memory metrics:

```python
from kubernetes import client, config

def get_oom_kill_events(namespace, pod_prefix, hours=24):
    """Fetch OOM kill events from Kubernetes API."""
    config.load_incluster_config()
    v1 = client.CoreV1Api()

    pods = v1.list_namespaced_pod(namespace)
    oom_events = []

    for pod in pods.items:
        if not pod.metadata.name.startswith(pod_prefix):
            continue

        for status in (pod.status.container_statuses or []):
            if status.last_state.terminated:
                term = status.last_state.terminated
                if term.reason == "OOMKilled":
                    oom_events.append({
                        "pod": pod.metadata.name,
                        "container": status.name,
                        "killed_at": term.finished_at.isoformat(),
                        "exit_code": term.exit_code,
                    })

    return oom_events
```

## Setting Up Proactive Alerts

Create alerts that fire before the OOM kill happens:

```yaml
- alert: MemoryUsageApproachingLimit
  expr: |
    process_memory_usage{memory_type="rss"} /
    kube_pod_container_resource_limits{resource="memory"} > 0.85
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Pod {{ $labels.pod }} memory at {{ $value | humanizePercentage }} of limit"
```

## Summary

OOM kills are the symptom, not the cause. The cause is usually a specific code path that allocates too much memory, a memory leak that accumulates over time, or simply an undersized memory limit for the actual workload. By combining OpenTelemetry runtime memory metrics with per-request memory tracking on spans, you can identify exactly which endpoints and operations are responsible for memory growth, fix them at the source, and stop the restart cycle for good.
