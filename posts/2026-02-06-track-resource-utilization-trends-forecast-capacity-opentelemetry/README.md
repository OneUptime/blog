# How to Track Resource Utilization Trends and Forecast Capacity with OpenTelemetry Time-Series Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Capacity Planning, Time-Series, Resource Utilization

Description: Learn how to collect resource utilization metrics with OpenTelemetry and build forecasting models that predict when you will need more capacity.

If you have ever been caught off guard by a service running out of memory or CPU at 2 AM, you already know why capacity forecasting matters. The good news is that OpenTelemetry gives you a standardized way to collect exactly the metrics you need, and with some straightforward time-series analysis, you can predict capacity shortfalls before they cause incidents.

This post walks through setting up resource utilization collection, storing the data properly, and building a basic linear regression forecast that actually works in production.

## Collecting Resource Metrics with OpenTelemetry

The OpenTelemetry Collector has a built-in `hostmetrics` receiver that captures CPU, memory, disk, and network utilization. Here is a collector configuration that grabs what we need.

The following config sets up the hostmetrics receiver to scrape system metrics every 30 seconds and exports them to a Prometheus-compatible backend:

```yaml
# otel-collector-config.yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
      disk:
        metrics:
          system.disk.io:
            enabled: true
      network:
        metrics:
          system.network.io:
            enabled: true

processors:
  # Add resource attributes so we can group by host later
  resource:
    attributes:
      - key: environment
        value: production
        action: upsert
      - key: team
        value: platform
        action: upsert

exporters:
  prometheusremotewrite:
    endpoint: "http://prometheus:9090/api/v1/write"

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      processors: [resource]
      exporters: [prometheusremotewrite]
```

## Adding Application-Level Resource Metrics

System-level metrics are useful, but you also want to track application-specific resource consumption. Here is how to instrument a Python service to report its own memory and thread pool usage.

This Python snippet creates two custom metrics - one for tracking heap memory and another for active thread count:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import psutil
import threading

# Set up the meter provider with a 30-second export interval
exporter = OTLPMetricExporter(endpoint="http://otel-collector:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=30000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("capacity.tracker", version="1.0.0")

# Observable gauges call the callback on each collection cycle
def get_memory_usage(options):
    process = psutil.Process()
    mem_info = process.memory_info()
    yield metrics.Observation(
        value=mem_info.rss / (1024 * 1024),  # Convert to MB
        attributes={"metric_type": "heap_memory_mb"}
    )

def get_thread_count(options):
    yield metrics.Observation(
        value=threading.active_count(),
        attributes={"metric_type": "active_threads"}
    )

meter.create_observable_gauge(
    name="app.memory.heap_mb",
    callbacks=[get_memory_usage],
    description="Application heap memory usage in megabytes"
)

meter.create_observable_gauge(
    name="app.threads.active",
    callbacks=[get_thread_count],
    description="Number of active application threads"
)
```

## Building a Capacity Forecast

Once you have a few weeks of data, you can run a linear regression to project when a resource will hit its limit. The idea is simple: fit a line to your historical utilization data and see where it crosses your threshold.

This script queries Prometheus for 30 days of CPU utilization data and uses linear regression to predict when it will hit 80%:

```python
import numpy as np
from datetime import datetime, timedelta
import requests

# Pull 30 days of hourly CPU utilization from Prometheus
end_time = datetime.now()
start_time = end_time - timedelta(days=30)

response = requests.get("http://prometheus:9090/api/v1/query_range", params={
    "query": 'avg(system_cpu_utilization{environment="production"})',
    "start": start_time.timestamp(),
    "end": end_time.timestamp(),
    "step": "1h"
})

results = response.json()["data"]["result"][0]["values"]

# Convert to numpy arrays for regression
timestamps = np.array([float(v[0]) for v in results])
utilizations = np.array([float(v[1]) for v in results])

# Fit a linear regression: utilization = slope * time + intercept
slope, intercept = np.polyfit(timestamps, utilizations, 1)

# Predict when utilization hits 80%
threshold = 0.80
if slope > 0:
    time_to_threshold = (threshold - intercept) / slope
    forecast_date = datetime.fromtimestamp(time_to_threshold)
    days_remaining = (forecast_date - datetime.now()).days
    print(f"CPU will reach {threshold*100}% in {days_remaining} days ({forecast_date.date()})")
else:
    print("Utilization is trending downward - no capacity concern detected")
```

## Setting Up Automated Alerts

You do not want to run this script manually. Set up a recording rule in Prometheus that keeps a rolling forecast, and alert when the projected date falls within your planning window.

This Prometheus rule computes a 30-day linear forecast and fires an alert when the projected time to reach 80% utilization is less than 14 days:

```yaml
# prometheus-rules.yaml
groups:
  - name: capacity_forecasting
    interval: 1h
    rules:
      # Record the linear trend slope for CPU
      - record: cpu:utilization:trend_slope_30d
        expr: |
          deriv(
            avg(system_cpu_utilization{environment="production"})[30d:1h]
          )

      # Alert when projected to hit 80% within 14 days
      - alert: CPUCapacityForecastWarning
        expr: |
          (0.80 - avg(system_cpu_utilization{environment="production"}))
          /
          cpu:utilization:trend_slope_30d
          < 14 * 24 * 3600
        for: 6h
        labels:
          severity: warning
        annotations:
          summary: "CPU projected to reach 80% within 14 days"
```

## Practical Tips

After running this kind of forecasting for a while, here are a few things I have learned:

- **Filter out deploy spikes.** Deployments cause temporary resource spikes that throw off your trend line. Use a median or percentile filter rather than a straight average.
- **Separate weekday and weekend patterns.** Many services have cyclical load. If you blend them together, your forecast will be off. Run separate regressions or use seasonal decomposition.
- **Track the forecast accuracy.** Log what your model predicted versus what actually happened. Over time, you can calibrate your alert thresholds based on the model's error rate.
- **Combine with business metrics.** If your product team tells you they expect a 30% traffic increase next quarter, add that to your forecast. Pure time-series extrapolation cannot account for planned events.

The combination of OpenTelemetry's standardized metric collection with even basic statistical methods gives you a reliable early warning system. You do not need a machine learning platform to start. A simple linear regression on well-collected data gets you most of the way there.
