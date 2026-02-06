# How to Build Traffic Forecasting Models from OpenTelemetry Request Rate Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Traffic Forecasting, Capacity Planning, Time-Series Analysis

Description: Use OpenTelemetry request rate metrics to build traffic forecasting models that predict load patterns and inform scaling decisions.

If you can predict tomorrow's traffic with reasonable accuracy, you can pre-scale your infrastructure before the spike hits instead of reacting after latency degrades. OpenTelemetry gives you standardized request rate metrics across all your services, and with some time-series decomposition, you can build forecasts that capture daily, weekly, and seasonal patterns.

This is not about building a machine learning platform. It is about extracting the repeating patterns from your traffic data and projecting them forward.

## Collecting Request Rate Metrics

The foundation is having consistent request rate data from every service. OpenTelemetry's HTTP instrumentation captures this automatically, but you want to make sure the data is structured for aggregation.

This collector config processes incoming HTTP metrics and adds the labels needed for forecasting:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Normalize service names and add environment context
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

  # Reduce cardinality by removing high-cardinality attributes
  # that would fragment the time series
  attributes:
    actions:
      - key: http.user_agent
        action: delete
      - key: http.client_ip
        action: delete
      - key: net.sock.peer.addr
        action: delete

exporters:
  prometheusremotewrite:
    endpoint: "http://prometheus:9090/api/v1/write"
    resource_to_telemetry_conversion:
      enabled: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource, attributes]
      exporters: [prometheusremotewrite]
```

## Extracting Historical Patterns

Before building a forecast, you need to understand the shape of your traffic. Most web services have a daily cycle (low traffic at night, peaks during business hours) and a weekly cycle (weekdays vs. weekends).

These PromQL queries extract the patterns you need:

```promql
# Total requests per second across all services
sum(rate(http_server_request_duration_seconds_count[5m]))

# Requests per second by service
sum by (service_name) (rate(http_server_request_duration_seconds_count[5m]))

# Hourly averages over the past 4 weeks, grouped by day of week
# This gives you the typical traffic shape for each day
avg_over_time(
  sum(rate(http_server_request_duration_seconds_count[5m]))[4w:1h]
)
```

## Decomposing Traffic into Components

Traffic patterns typically have three components: a trend (gradual growth or decline), seasonal cycles (daily and weekly), and noise (random variation). Separating these makes forecasting much more accurate than fitting a single line.

This Python script pulls historical data and decomposes it into trend, daily cycle, and weekly cycle:

```python
import numpy as np
import requests
from datetime import datetime, timedelta
from collections import defaultdict

PROM_URL = "http://prometheus:9090"

def fetch_traffic_history(days=56):
    """Fetch 8 weeks of hourly traffic data."""
    end = datetime.now()
    start = end - timedelta(days=days)

    resp = requests.get(f"{PROM_URL}/api/v1/query_range", params={
        "query": 'sum(rate(http_server_request_duration_seconds_count[5m]))',
        "start": start.timestamp(),
        "end": end.timestamp(),
        "step": "1h"
    })

    results = resp.json()["data"]["result"][0]["values"]
    timestamps = [datetime.fromtimestamp(float(v[0])) for v in results]
    values = [float(v[1]) for v in results]
    return timestamps, values

def decompose_traffic(timestamps, values):
    """
    Break traffic into trend + daily cycle + weekly cycle + residual.
    Uses simple averaging rather than heavy statistical libraries.
    """
    values = np.array(values)

    # Step 1: Extract the trend using a 7-day moving average
    window = 24 * 7  # 168 hours
    trend = np.convolve(values, np.ones(window)/window, mode='same')

    # Step 2: Remove trend to get the cyclical component
    detrended = values - trend

    # Step 3: Extract daily cycle (average by hour of day)
    daily_cycle = np.zeros(24)
    daily_counts = np.zeros(24)
    for i, ts in enumerate(timestamps):
        hour = ts.hour
        daily_cycle[hour] += detrended[i]
        daily_counts[hour] += 1
    daily_cycle = daily_cycle / np.maximum(daily_counts, 1)

    # Step 4: Extract weekly cycle (average by day of week + hour)
    weekly_cycle = np.zeros(168)  # 7 days * 24 hours
    weekly_counts = np.zeros(168)
    for i, ts in enumerate(timestamps):
        idx = ts.weekday() * 24 + ts.hour
        residual = detrended[i] - daily_cycle[ts.hour]
        weekly_cycle[idx] += residual
        weekly_counts[idx] += 1
    weekly_cycle = weekly_cycle / np.maximum(weekly_counts, 1)

    return trend, daily_cycle, weekly_cycle

timestamps, values = fetch_traffic_history(days=56)
trend, daily_cycle, weekly_cycle = decompose_traffic(timestamps, values)

print(f"Trend (current): {trend[-1]:.1f} req/s")
print(f"Peak hour of day: {np.argmax(daily_cycle)}:00 ({daily_cycle.max():.1f} req/s above trend)")
print(f"Lowest hour: {np.argmin(daily_cycle)}:00 ({daily_cycle.min():.1f} req/s below trend)")
```

## Building the Forecast

With the decomposed components, forecasting is straightforward: project the trend forward and layer the seasonal cycles on top.

This function generates a multi-day traffic forecast by combining trend projection with seasonal patterns:

```python
def forecast_traffic(trend, daily_cycle, weekly_cycle, timestamps,
                     forecast_hours=168):
    """
    Generate a traffic forecast for the next N hours.
    Combines trend extrapolation with seasonal patterns.
    """
    # Project the trend forward using linear regression on the last 30 days
    recent_trend = trend[-720:]  # Last 30 days of hourly trend values
    x = np.arange(len(recent_trend))
    slope, intercept = np.polyfit(x, recent_trend, 1)

    forecasts = []
    last_timestamp = timestamps[-1]

    for h in range(1, forecast_hours + 1):
        future_time = last_timestamp + timedelta(hours=h)

        # Trend component: extrapolate the linear trend
        trend_value = intercept + slope * (len(recent_trend) + h)

        # Daily component: use the hour-of-day pattern
        daily_value = daily_cycle[future_time.hour]

        # Weekly component: use the day-of-week + hour pattern
        weekly_idx = future_time.weekday() * 24 + future_time.hour
        weekly_value = weekly_cycle[weekly_idx]

        # Combined forecast
        predicted = trend_value + daily_value + weekly_value
        predicted = max(predicted, 0)  # Traffic cannot be negative

        forecasts.append({
            "timestamp": future_time,
            "predicted_rps": predicted,
            "trend": trend_value,
            "daily": daily_value,
            "weekly": weekly_value
        })

    return forecasts

# Generate a 7-day forecast
forecast = forecast_traffic(trend, daily_cycle, weekly_cycle, timestamps)

# Find the predicted peak
peak = max(forecast, key=lambda f: f["predicted_rps"])
print(f"\nPredicted peak: {peak['predicted_rps']:.0f} req/s "
      f"at {peak['timestamp'].strftime('%A %H:%M')}")

# Print daily peaks
for day_offset in range(7):
    day_forecasts = [f for f in forecast
                     if f["timestamp"].date() == (datetime.now() + timedelta(days=day_offset+1)).date()]
    if day_forecasts:
        day_peak = max(day_forecasts, key=lambda f: f["predicted_rps"])
        print(f"  {day_peak['timestamp'].strftime('%A')}: "
              f"peak {day_peak['predicted_rps']:.0f} req/s at {day_peak['timestamp'].strftime('%H:%M')}")
```

## Using Forecasts for Pre-Scaling

The forecast is only useful if it drives action. Here is how to convert the traffic prediction into a scaling schedule that Kubernetes can use.

This script generates a CronJob schedule from the forecast to pre-scale deployments before predicted traffic peaks:

```python
def generate_scaling_schedule(forecast, service_name,
                               rps_per_replica=500,
                               min_replicas=3, max_replicas=50):
    """
    Convert a traffic forecast into a scaling schedule.
    Creates time windows where replica counts should change.
    """
    schedule = []
    current_replicas = None

    for f in forecast:
        needed = max(
            min_replicas,
            min(max_replicas, int(np.ceil(f["predicted_rps"] / rps_per_replica)))
        )

        if needed != current_replicas:
            schedule.append({
                "time": f["timestamp"],
                "replicas": needed,
                "reason": f"Predicted {f['predicted_rps']:.0f} req/s"
            })
            current_replicas = needed

    # Output as kubectl commands
    print(f"Scaling schedule for {service_name}:")
    for entry in schedule[:20]:  # Show first 20 changes
        cron = entry["time"].strftime("%M %H %d %m *")
        print(f"  # {entry['time'].strftime('%Y-%m-%d %H:%M')} - {entry['reason']}")
        print(f"  kubectl scale deployment {service_name} "
              f"--replicas={entry['replicas']}")

generate_scaling_schedule(forecast, "api-gateway")
```

## Measuring Forecast Accuracy

A forecast you do not validate is just guessing with extra steps. Track how well your predictions match reality.

This recording rule computes the forecast error as a percentage so you can track accuracy over time:

```yaml
# forecast-accuracy-rules.yaml
groups:
  - name: forecast_accuracy
    interval: 1h
    rules:
      # Record the actual traffic for comparison
      - record: traffic:request_rate:hourly_avg
        expr: |
          avg_over_time(
            sum(rate(http_server_request_duration_seconds_count[5m]))[1h:5m]
          )

      # If you push forecasts as metrics, compute the error
      - record: forecast:error_pct:hourly
        expr: |
          abs(traffic:request_rate:hourly_avg - traffic:forecast:predicted_rps)
          / traffic:request_rate:hourly_avg * 100
```

## When Simple Models Are Not Enough

The decomposition approach above works well for services with regular patterns. But some workloads have irregular spikes from marketing campaigns, product launches, or viral content. For those cases:

- **Feed business events into the model.** If marketing tells you about an upcoming email blast, add a multiplier to your forecast for that time window.
- **Track forecast error by time of day.** If your model consistently underestimates Monday mornings, add a correction factor for that period.
- **Use multiple models.** Run both a simple seasonal model and a trend-based model, then take the higher prediction. This gives you a conservative estimate that is less likely to underscale.

The key takeaway is that you do not need a sophisticated ML pipeline to get useful traffic forecasts. OpenTelemetry gives you clean, consistent request rate data, and basic time-series decomposition gets you 80% of the accuracy with 10% of the complexity. Start simple, measure how well it works, and add sophistication only where the simple model falls short.
