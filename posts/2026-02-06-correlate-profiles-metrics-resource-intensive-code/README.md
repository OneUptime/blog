# How to Correlate OpenTelemetry Profiles with Metrics to Identify

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, Metric, Correlation

Description: Correlate OpenTelemetry profiling data with metrics to identify which code paths consume the most resources.

Metrics tell you that CPU usage spiked to 90%. Profiles tell you that `JsonSerializer.serialize()` accounted for 35% of CPU samples. Separately, each signal gives you part of the picture. Together, they let you say "CPU spiked to 90% because `JsonSerializer.serialize()` started processing larger payloads after the 2:15 PM deployment." This post shows how to set up that correlation.

## The Correlation Approach

The key to correlating profiles with metrics is shared labels and aligned time ranges. When a metric like `process.cpu.utilization` spikes, you need to query the profiling backend for the same service, same instance, and same time window.

OpenTelemetry makes this easier because both signals share the same resource attributes: `service.name`, `service.instance.id`, `host.name`, and so on.

## Setting Up Shared Resource Attributes

Make sure your profiling agent and metrics SDK use identical resource attributes:

```yaml
# Collector config with shared resource attributes
# Start the Collector with: --feature-gates=service.profilesSupport

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  resource:
    attributes:
      - key: service.name
        value: "checkout-service"
        action: upsert
      - key: deployment.environment
        value: "production"
        action: upsert
  batch:
    timeout: 10s

exporters:
  otlp/pyroscope:
    endpoint: pyroscope:4040
    tls:
      insecure: true
  prometheus_remote_write:
    endpoint: http://mimir:9009/api/v1/push
    tls:
      insecure: true
    resource_to_telemetry_conversion:
      enabled: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [prometheus_remote_write]
    profiles:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/pyroscope]
```

## Building a Correlated Dashboard in Grafana

Create a Grafana dashboard with metrics panels and a linked flame graph panel:

```json
{
  "panels": [
    {
      "type": "timeseries",
      "title": "CPU Utilization",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "process_cpu_utilization{service_name=\"checkout-service\", cpu_mode=\"user\"}",
          "legendFormat": "{{instance}}"
        }
      ],
      "gridPos": { "h": 8, "w": 24, "x": 0, "y": 0 }
    },
    {
      "type": "flamegraph",
      "title": "CPU Profile",
      "datasource": "Pyroscope",
      "targets": [
        {
          "profileTypeId": "process_cpu:cpu:nanoseconds:cpu:nanoseconds",
          "labelSelector": "{service_name=\"checkout-service\"}"
        }
      ],
      "gridPos": { "h": 12, "w": 24, "x": 0, "y": 8 }
    }
  ]
}
```

The important detail is configuring the flame graph panel to use the dashboard time range. In Grafana, panels use the dashboard time picker unless you add a panel-specific time override. When you click and drag on a spike in the CPU chart, the dashboard time range updates and the flame graph panel updates to show the profile for that time window.

## Querying Profiles for a Specific Time Range

When you spot a metric anomaly, you can query profiles programmatically:

```bash
# Query Pyroscope for the CPU profile during a specific spike
# Time range: 2:15 PM to 2:30 PM on Feb 5
curl --get http://pyroscope:4040/pyroscope/render \
  --data-urlencode 'query=process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name="checkout-service"}' \
  --data-urlencode 'from=1770300900' \
  --data-urlencode 'until=1770301800'
```

This returns the flame graph data for the exact period when the CPU spike occurred.

## Correlating Memory Metrics with Allocation Profiles

The same approach works for memory. If your `go.memory.allocated` metric shows a sudden increase, pull the allocation profile for that period:

```python
import requests
from datetime import datetime, timedelta, timezone

# When the memory metric spiked
spike_start = datetime(2026, 2, 5, 14, 15, tzinfo=timezone.utc)
spike_end = spike_start + timedelta(minutes=15)

# Fetch the allocation profile for that window
response = requests.get(
    "http://pyroscope:4040/pyroscope/render",
    params={
        "query": 'memory:alloc_space:bytes:space:bytes{service_name="checkout-service"}',
        "from": int(spike_start.timestamp()),
        "until": int(spike_end.timestamp()),
    }
)

# Parse the flame graph data
profile_data = response.json()
# The top functions by allocation will be in the flame graph root children
for node in profile_data.get("flamebearer", {}).get("names", [])[:10]:
    print(f"Top allocator: {node}")
```

## Automating Correlation with Alerts

You can build automated correlation into your alerting pipeline. When a resource metric breaches a threshold, automatically capture and attach the profile:

```yaml
# Alertmanager webhook receiver that triggers profile capture
route:
  receiver: profile-capture
  routes:
    - matchers:
        - alertname="HighCPU"
      receiver: profile-capture

receivers:
  - name: profile-capture
    webhook_configs:
      - url: http://profile-correlator:8080/capture
        send_resolved: false
```

The webhook handler queries Pyroscope for the profile at the time of the alert and includes a link to the flame graph in the alert notification sent to Slack or PagerDuty.

## Practical Workflow

Here is the workflow that makes this correlation effective in practice:

1. An alert fires: "checkout-service CPU usage exceeded 80% for 5 minutes."
2. Open the correlated dashboard. The CPU metric panel shows the spike. The flame graph panel shows what was running.
3. The flame graph reveals that `processDiscount()` is consuming 40% of CPU, up from its usual 5%.
4. Drill into `processDiscount()` and find that a recent code change introduced an O(n^2) loop over discount rules.
5. Fix the code. After deployment, the correlated dashboard confirms CPU returns to normal and the flame graph shows `processDiscount()` back at 5%.

The correlation between metrics and profiles turns a vague resource alert into a specific, actionable finding. Without profiles, you know something is wrong. With profiles correlated to metrics, you know exactly what is wrong and where to fix it.
