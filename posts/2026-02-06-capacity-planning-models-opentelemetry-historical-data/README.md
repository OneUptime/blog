# How to Build Capacity Planning Models from OpenTelemetry Historical Resource Utilization Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Capacity Planning, Resource Utilization, Forecasting, Infrastructure

Description: Use historical OpenTelemetry resource metrics to build capacity planning models that predict when you will need more infrastructure.

Capacity planning is the practice of figuring out how much infrastructure you will need before you actually need it. Too little capacity and your services degrade under load. Too much and you waste money on idle resources. The sweet spot requires historical data and a model that accounts for growth trends, seasonal patterns, and headroom requirements.

OpenTelemetry gives you the raw material - standardized resource utilization metrics collected over time. This post covers how to collect the right metrics, store them long-term, and build capacity planning models from the data.

## What Metrics to Collect

Capacity planning requires resource utilization metrics at the service level, not just the host level. You need to understand how much of each resource a service consumes and how that consumption correlates with traffic volume.

```python
# capacity_metrics.py - Key metrics for capacity planning
from opentelemetry import metrics
import psutil

meter = metrics.get_meter("capacity.planning")

# CPU utilization as a gauge - sampled periodically
def get_cpu_observations(options):
    cpu_percent = psutil.cpu_percent(interval=1)
    yield metrics.Observation(
        value=cpu_percent,
        attributes={"host.name": hostname, "service.name": service_name},
    )

cpu_gauge = meter.create_observable_gauge(
    name="system.cpu.utilization",
    description="CPU utilization percentage",
    unit="%",
    callbacks=[get_cpu_observations],
)

# Memory utilization
def get_memory_observations(options):
    mem = psutil.virtual_memory()
    yield metrics.Observation(
        value=mem.percent,
        attributes={"host.name": hostname, "service.name": service_name},
    )

memory_gauge = meter.create_observable_gauge(
    name="system.memory.utilization",
    description="Memory utilization percentage",
    unit="%",
    callbacks=[get_memory_observations],
)

# Request throughput - the demand signal
request_counter = meter.create_counter(
    name="http.server.request.count",
    description="Total HTTP requests handled",
    unit="{request}",
)

# Track the ratio of resource usage to traffic volume
# This gives you the "cost per request" which is key for planning
resource_per_request = meter.create_histogram(
    name="capacity.cpu_seconds_per_request",
    description="CPU seconds consumed per request",
    unit="s",
)
```

## Long-Term Storage Configuration

Capacity planning needs months of data. Configure your metrics pipeline to retain data with appropriate downsampling. Raw 15-second resolution data is useful for real-time monitoring but wasteful for capacity planning - hourly averages are sufficient.

```yaml
# otel-collector-capacity.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  # Also collect host metrics directly
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
      memory:
      disk:
      network:

processors:
  batch:
    timeout: 15s

  # Add service and environment context
  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert

exporters:
  # Short-term storage - full resolution, 15 day retention
  prometheusremotewrite/shortterm:
    endpoint: http://prometheus-shortterm:9090/api/v1/write

  # Long-term storage - for capacity planning queries
  prometheusremotewrite/longterm:
    endpoint: http://thanos-receive:19291/api/v1/receive
    # Thanos handles downsampling and long retention automatically

service:
  pipelines:
    metrics:
      receivers: [otlp, hostmetrics]
      processors: [resource, batch]
      exporters: [prometheusremotewrite/shortterm, prometheusremotewrite/longterm]
```

## Building the Capacity Model

The capacity model answers the question: "Given current growth trends, when will we run out of capacity?" This requires three inputs:

1. **Current utilization** - how much of each resource is used now
2. **Growth rate** - how fast utilization is increasing
3. **Capacity limit** - the maximum safe utilization (typically 70-80%, not 100%)

Here is a Python script that queries Prometheus and fits a linear regression to predict when a resource will hit the capacity limit.

```python
# capacity_forecast.py
import numpy as np
from datetime import datetime, timedelta
import requests

PROMETHEUS_URL = "http://prometheus:9090"
CAPACITY_THRESHOLD = 0.75  # Alert when projected to hit 75% utilization

def query_prometheus_range(query, start, end, step="1h"):
    """Fetch time-series data from Prometheus."""
    response = requests.get(f"{PROMETHEUS_URL}/api/v1/query_range", params={
        "query": query,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "step": step,
    })
    return response.json()["data"]["result"]

def forecast_capacity(service_name, resource_metric, days_history=90):
    """Predict when a service will exhaust a resource."""
    end = datetime.now()
    start = end - timedelta(days=days_history)

    # Query daily peak utilization over the history window
    query = f'max_over_time({resource_metric}{{service_name="{service_name}"}}[1d])'
    results = query_prometheus_range(query, start, end, step="1d")

    if not results:
        return None

    # Extract timestamps and values
    values = results[0]["values"]
    timestamps = np.array([float(v[0]) for v in values])
    utilizations = np.array([float(v[1]) for v in values])

    # Normalize timestamps to days from start
    days = (timestamps - timestamps[0]) / 86400

    # Fit a linear regression: utilization = slope * day + intercept
    slope, intercept = np.polyfit(days, utilizations, 1)

    # Predict when utilization will hit the threshold
    if slope <= 0:
        return {"status": "stable", "message": "Utilization is flat or decreasing"}

    days_to_threshold = (CAPACITY_THRESHOLD - intercept) / slope
    threshold_date = datetime.fromtimestamp(timestamps[0]) + timedelta(days=days_to_threshold)

    return {
        "service": service_name,
        "current_utilization": float(utilizations[-1]),
        "daily_growth_rate": float(slope),
        "projected_threshold_date": threshold_date.isoformat(),
        "days_remaining": int(days_to_threshold - days[-1]),
    }

# Run forecast for each service and resource
services = ["api-gateway", "order-service", "payment-service"]
for svc in services:
    cpu_forecast = forecast_capacity(svc, "system_cpu_utilization")
    mem_forecast = forecast_capacity(svc, "system_memory_utilization")
    print(f"{svc}: CPU exhaustion in {cpu_forecast['days_remaining']} days, "
          f"Memory exhaustion in {mem_forecast['days_remaining']} days")
```

## Accounting for Seasonality

Linear regression works when growth is steady, but most services have weekly and monthly traffic patterns. A better approach uses seasonal decomposition to separate the trend from the pattern.

```python
from statsmodels.tsa.seasonal import seasonal_decompose
import pandas as pd

def forecast_with_seasonality(service_name, resource_metric, days_history=180):
    """Forecast capacity accounting for weekly seasonal patterns."""
    end = datetime.now()
    start = end - timedelta(days=days_history)

    query = f'avg_over_time({resource_metric}{{service_name="{service_name}"}}[1h])'
    results = query_prometheus_range(query, start, end, step="1h")

    values = results[0]["values"]
    # Build a pandas Series with hourly frequency
    index = pd.to_datetime([float(v[0]) for v in values], unit='s')
    series = pd.Series([float(v[1]) for v in values], index=index)

    # Decompose into trend, seasonal, and residual components
    # Period of 168 hours = 1 week
    decomposition = seasonal_decompose(series, period=168, model='additive')

    # The trend component shows actual growth independent of weekly patterns
    trend = decomposition.trend.dropna()

    # Fit linear regression on the trend
    days = np.arange(len(trend)) / 24.0
    slope, intercept = np.polyfit(days, trend.values, 1)

    # Project trend forward
    current_trend = intercept + slope * days[-1]
    days_to_threshold = (CAPACITY_THRESHOLD - current_trend) / slope

    return {
        "days_remaining": int(days_to_threshold),
        "weekly_peak_utilization": float(series.resample('W').max().iloc[-1]),
        "growth_rate_per_day": float(slope),
    }
```

## Dashboard for Capacity Planning

The capacity planning dashboard should be separate from your operational dashboards. It focuses on longer time horizons and trend analysis rather than real-time alerting.

**Row 1 - Capacity Summary Table**: A table showing each service, its current peak utilization for CPU, memory, and disk, the daily growth rate, and the projected date it will hit the capacity threshold. Sort by "days remaining" ascending so the most urgent services appear at the top.

**Row 2 - Trend Charts**: Line charts showing 90-day utilization trends for each critical resource, with the linear forecast extended into the future. Draw a horizontal line at the 75% threshold.

**Row 3 - Cost per Request**: A chart of resource consumption per request over time. If this metric is increasing, it means the service is becoming less efficient - possibly due to code changes, data growth, or increasing complexity of requests.

This data-driven approach to capacity planning eliminates guesswork. Instead of provisioning based on gut feeling, you can show stakeholders exactly when you will need additional capacity and how much.
