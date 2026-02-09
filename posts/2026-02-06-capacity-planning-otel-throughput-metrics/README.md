# How to Build a Capacity Planning Model from OpenTelemetry Throughput and Resource Utilization Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Capacity Planning, Throughput, Resource Utilization, Scaling

Description: Build a capacity planning model using OpenTelemetry throughput and resource utilization metrics to predict when you need to scale your infrastructure.

Running out of capacity during a traffic spike is painful. Overprovisioning to avoid that scenario is expensive. Capacity planning sits in the middle: using historical data to predict when you will need more resources and how much. OpenTelemetry gives you the throughput and utilization metrics you need to build accurate capacity models.

## Collecting the Right Metrics

For capacity planning, you need two categories of metrics: throughput (how much work the system handles) and resource utilization (how much of each resource is consumed). Here is how to instrument both:

```python
# capacity_metrics.py
import psutil
import os
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

exporter = OTLPMetricExporter(endpoint="otel-collector:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=15000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("capacity-planning")

# Throughput metrics
request_counter = meter.create_counter(
    "app.requests.total",
    description="Total incoming requests",
)
request_duration = meter.create_histogram(
    "app.request.duration",
    unit="s",
    description="Request processing duration",
)

# Resource utilization via observable gauges
def cpu_callback(options):
    yield metrics.Observation(
        psutil.cpu_percent(interval=None) / 100.0,
        {"cpu.state": "used"},
    )

def memory_callback(options):
    mem = psutil.virtual_memory()
    yield metrics.Observation(mem.percent / 100.0, {"memory.state": "used"})
    yield metrics.Observation(mem.available, {"memory.state": "available_bytes"})

def disk_callback(options):
    disk = psutil.disk_usage("/")
    yield metrics.Observation(disk.percent / 100.0, {"disk.state": "used"})

def connection_callback(options):
    connections = len(psutil.net_connections(kind="tcp"))
    yield metrics.Observation(connections, {"net.type": "tcp"})

meter.create_observable_gauge("system.cpu.utilization", callbacks=[cpu_callback])
meter.create_observable_gauge("system.memory.utilization", callbacks=[memory_callback])
meter.create_observable_gauge("system.disk.utilization", callbacks=[disk_callback])
meter.create_observable_gauge("system.network.connections", callbacks=[connection_callback])
```

## Building the Capacity Model

A capacity model answers the question: "At what throughput level will we exhaust a resource?" The simplest approach is linear regression on utilization vs. throughput:

```python
# capacity_model.py
import numpy as np
import requests
from datetime import datetime, timedelta

PROMETHEUS_URL = "http://prometheus:9090"

def query_range(query, start, end, step="5m"):
    """Query Prometheus for a time range of data."""
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query_range", params={
        "query": query,
        "start": start.timestamp(),
        "end": end.timestamp(),
        "step": step,
    })
    results = resp.json().get("data", {}).get("result", [])
    if results:
        values = [(float(ts), float(val)) for ts, val in results[0]["values"]]
        return values
    return []

def build_capacity_model(lookback_days=30):
    """Build a linear model of resource utilization vs throughput."""
    end = datetime.utcnow()
    start = end - timedelta(days=lookback_days)

    # Get throughput data (requests per second)
    throughput_data = query_range(
        'sum(rate(app_requests_total[5m]))',
        start, end
    )

    # Get CPU utilization data
    cpu_data = query_range(
        'avg(system_cpu_utilization{cpu_state="used"})',
        start, end
    )

    # Get memory utilization data
    memory_data = query_range(
        'avg(system_memory_utilization{memory_state="used"})',
        start, end
    )

    # Align timestamps and build the model
    throughput_values = np.array([v[1] for v in throughput_data])
    cpu_values = np.array([v[1] for v in cpu_data[:len(throughput_values)]])
    memory_values = np.array([v[1] for v in memory_data[:len(throughput_values)]])

    # Linear regression: utilization = slope * throughput + intercept
    cpu_slope, cpu_intercept = np.polyfit(throughput_values, cpu_values, 1)
    mem_slope, mem_intercept = np.polyfit(throughput_values, memory_values, 1)

    # Calculate the throughput at which each resource hits 80% utilization
    cpu_max_throughput = (0.80 - cpu_intercept) / cpu_slope if cpu_slope > 0 else float('inf')
    mem_max_throughput = (0.80 - mem_intercept) / mem_slope if mem_slope > 0 else float('inf')

    # The bottleneck is whichever resource saturates first
    max_safe_throughput = min(cpu_max_throughput, mem_max_throughput)
    bottleneck = "CPU" if cpu_max_throughput < mem_max_throughput else "Memory"

    return {
        "cpu": {
            "slope": round(cpu_slope, 6),
            "intercept": round(cpu_intercept, 4),
            "max_throughput_at_80pct": round(cpu_max_throughput, 1),
        },
        "memory": {
            "slope": round(mem_slope, 6),
            "intercept": round(mem_intercept, 4),
            "max_throughput_at_80pct": round(mem_max_throughput, 1),
        },
        "bottleneck_resource": bottleneck,
        "max_safe_throughput_rps": round(max_safe_throughput, 1),
    }

if __name__ == "__main__":
    model = build_capacity_model()
    print("Capacity Model Results:")
    print(f"  CPU saturates at: {model['cpu']['max_throughput_at_80pct']} req/s")
    print(f"  Memory saturates at: {model['memory']['max_throughput_at_80pct']} req/s")
    print(f"  Bottleneck: {model['bottleneck_resource']}")
    print(f"  Max safe throughput: {model['max_safe_throughput_rps']} req/s")
```

## Predicting Future Capacity Needs

Combine the capacity model with traffic growth projections:

```python
# capacity_forecast.py
from capacity_model import build_capacity_model, query_range
from datetime import datetime, timedelta
import numpy as np

def forecast_traffic_growth(lookback_days=90):
    """Estimate traffic growth rate from historical data."""
    end = datetime.utcnow()
    start = end - timedelta(days=lookback_days)

    # Get daily peak throughput
    daily_peaks = query_range(
        'max_over_time(sum(rate(app_requests_total[5m]))[1d:])',
        start, end, step="1d"
    )

    timestamps = np.array([v[0] for v in daily_peaks])
    peaks = np.array([v[1] for v in daily_peaks])

    # Linear fit to estimate daily growth
    days = (timestamps - timestamps[0]) / 86400
    slope, intercept = np.polyfit(days, peaks, 1)

    current_peak = peaks[-1]
    daily_growth_rps = slope

    return {
        "current_peak_rps": round(current_peak, 1),
        "daily_growth_rps": round(daily_growth_rps, 2),
        "weekly_growth_rps": round(daily_growth_rps * 7, 2),
    }

def days_until_capacity_exhaustion():
    """Calculate when current capacity will be exceeded."""
    model = build_capacity_model()
    growth = forecast_traffic_growth()

    max_throughput = model["max_safe_throughput_rps"]
    current_peak = growth["current_peak_rps"]
    daily_growth = growth["daily_growth_rps"]

    if daily_growth <= 0:
        return {"days_remaining": float("inf"), "message": "Traffic is not growing"}

    headroom = max_throughput - current_peak
    days = headroom / daily_growth

    return {
        "current_peak_rps": current_peak,
        "max_safe_rps": max_throughput,
        "daily_growth_rps": daily_growth,
        "days_remaining": round(days, 0),
        "bottleneck": model["bottleneck_resource"],
        "estimated_date": (datetime.utcnow() + timedelta(days=days)).strftime("%Y-%m-%d"),
    }

if __name__ == "__main__":
    result = days_until_capacity_exhaustion()
    print(f"Current peak: {result['current_peak_rps']} req/s")
    print(f"Max safe capacity: {result['max_safe_rps']} req/s")
    print(f"Daily growth: {result['daily_growth_rps']} req/s")
    print(f"Days until capacity exhaustion: {result['days_remaining']}")
    print(f"Bottleneck resource: {result['bottleneck']}")
    print(f"Estimated date: {result['estimated_date']}")
```

## Alerting Before You Run Out

Set up proactive alerts based on the capacity forecast:

```yaml
# capacity-alerts.yaml
groups:
  - name: capacity-planning
    rules:
      - alert: CapacityExhaustionIn30Days
        expr: |
          (0.80 - avg(system_cpu_utilization{cpu_state="used"}))
          /
          deriv(avg(system_cpu_utilization{cpu_state="used"})[7d:1h])
          < 30 * 24 * 3600
        for: 24h
        labels:
          severity: warning
        annotations:
          summary: "CPU capacity will reach 80% utilization within 30 days at current growth rate"

      - alert: CapacityExhaustionIn7Days
        expr: |
          (0.80 - avg(system_cpu_utilization{cpu_state="used"}))
          /
          deriv(avg(system_cpu_utilization{cpu_state="used"})[7d:1h])
          < 7 * 24 * 3600
        for: 6h
        labels:
          severity: critical
        annotations:
          summary: "CPU capacity will reach 80% utilization within 7 days - immediate scaling needed"
```

## Wrapping Up

Capacity planning is not about guessing. With OpenTelemetry throughput and resource utilization metrics, you can build data-driven models that predict exactly when you will run out of capacity and which resource will be the bottleneck. Run these models regularly, automate the alerts, and you will never be surprised by a capacity crunch again. The investment in collecting and modeling these metrics pays for itself the first time you scale proactively instead of reactively during an outage.
