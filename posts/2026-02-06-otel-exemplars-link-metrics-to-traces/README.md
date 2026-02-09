# How to Configure Exemplars to Link Prometheus-Style Metrics Directly to OpenTelemetry Trace Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Exemplars, Metrics, Traces, Prometheus

Description: Configure OpenTelemetry exemplars to attach trace context to metric data points so you can jump from a metric spike to related traces.

You are staring at a latency spike on a dashboard. The p99 for your checkout endpoint jumped from 200ms to 3 seconds. You know something is slow, but which requests? Which trace should you look at? Without exemplars, you are stuck manually guessing time ranges and filtering traces. With exemplars, you click on the metric data point and land directly on the trace that caused it.

## What Are Exemplars?

Exemplars are sample trace references attached to metric data points. When the SDK records a histogram observation or a counter increment, it can also record the trace ID and span ID of the active span at that moment. This creates a direct link from a metric value to the trace that produced it.

For example, a histogram bucket for HTTP request duration at the 2-5 second range might carry an exemplar pointing to trace `abc123`, span `def456`. Your observability UI can use that reference to link you straight to the slow trace.

## Enabling Exemplars in Declarative Configuration

Exemplars are configured in the meter provider section. Here is how to enable them:

```yaml
# otel-config.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "checkout-service"
    deployment.environment: "production"

tracer_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1

meter_provider:
  readers:
    - periodic:
        interval: 30000
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"
            temporality_preference: "cumulative"

  # Exemplar configuration
  exemplar_filter: "trace_based"  # only attach exemplars when a trace is sampled

  views:
    - selector:
        instrument_name: "http.server.request.duration"
      stream:
        aggregation:
          explicit_bucket_histogram:
            boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
            record_min_max: true
```

The `exemplar_filter` setting controls when exemplars are recorded:

- `trace_based`: Only attach exemplars for sampled traces. This is the recommended default since it ensures the linked trace actually exists in your backend.
- `always_on`: Attach exemplars for every measurement, regardless of sampling. Useful in development but generates more data.
- `always_off`: Disable exemplars entirely.

## How Exemplars Work Under the Hood

When your application records a metric measurement, the SDK checks if there is an active span in the current context:

```python
# Python example showing what happens internally
from opentelemetry import metrics, trace

meter = metrics.get_meter("checkout")
duration_histogram = meter.create_histogram(
    name="http.server.request.duration",
    unit="s",
    description="Duration of HTTP server requests"
)

# When this is called inside a traced request handler,
# the SDK automatically captures the trace_id and span_id
# from the current context and attaches them as an exemplar
duration_histogram.record(2.3, {"http.route": "/checkout", "http.method": "POST"})
```

The resulting metric data point looks like this in OTLP:

```json
{
  "histogram": {
    "data_points": [{
      "start_time_unix_nano": 1706745600000000000,
      "time_unix_nano": 1706745660000000000,
      "count": 150,
      "sum": 45.7,
      "bucket_counts": [10, 30, 40, 35, 20, 10, 3, 1, 1, 0, 0],
      "explicit_bounds": [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
      "exemplars": [
        {
          "time_unix_nano": 1706745645000000000,
          "value": 2.3,
          "span_id": "def456789abcdef0",
          "trace_id": "abc123456789abcdef0123456789abcd",
          "filtered_attributes": {
            "http.route": "/checkout"
          }
        }
      ]
    }]
  }
}
```

## Collector Configuration for Exemplars

Your OpenTelemetry Collector needs to be configured to pass exemplars through. Make sure you are not accidentally dropping them:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  batch:
    send_batch_size: 1024
    timeout: 5s

exporters:
  # Prometheus Remote Write preserves exemplars
  prometheusremotewrite:
    endpoint: "http://mimir:9009/api/v1/push"
    resource_to_telemetry_conversion:
      enabled: true

  # OTLP exporter naturally preserves exemplars
  otlp:
    endpoint: "http://tempo:4317"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Prometheus and Grafana Integration

For the Prometheus/Grafana stack, exemplars have native support. Enable exemplar storage in Prometheus or Mimir:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

storage:
  exemplars:
    max_exemplars: 100000  # max exemplars to store in memory
```

In Grafana, configure a Tempo data source for traces, then set up the exemplar link in your Prometheus/Mimir data source:

```
# Grafana Prometheus data source settings
Exemplars:
  - Internal link: enabled
    Data source: Tempo
    URL: ${__value.traceID}
```

Now when you hover over a metric graph in Grafana, exemplar dots appear. Click one and Grafana opens the corresponding trace in Tempo.

## Querying Exemplars in PromQL

You can query exemplars directly in Grafana or via the Prometheus API:

```promql
# Show exemplars for request duration histogram
histogram_quantile(0.99, rate(http_server_request_duration_seconds_bucket{service_name="checkout-service"}[5m]))
```

Enable "Exemplars" toggle in the Grafana query editor to see the exemplar dots overlaid on the graph.

## Wrapping Up

Exemplars bridge the gap between "something is wrong with this metric" and "here is the exact trace showing what happened." Enable them in your declarative configuration with the `trace_based` filter, make sure your collector passes them through, and configure your visualization tool to link exemplars to your trace backend. The next time you see a latency spike, you will be one click away from the root cause instead of searching through thousands of traces.
