# How to Use OpenTelemetry Metrics Aggregation at the Source to Reduce Cardinality Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metrics, Cardinality, Aggregation

Description: Reduce metrics cardinality costs by aggregating OpenTelemetry metrics at the SDK and Collector level before export.

Metrics cardinality is the silent budget killer in observability. Every unique combination of metric name and label values creates a new time series. A single metric with a `user_id` label across a million users generates a million time series, and most backends charge per active series. Aggregating metrics at the source - before they leave your infrastructure - is the most effective way to control this cost.

## Where Cardinality Explodes

Consider an HTTP request duration histogram. With just four labels, cardinality multiplies fast:

- `http.method`: 5 values (GET, POST, PUT, DELETE, PATCH)
- `http.route`: 50 routes
- `http.status_code`: 20 status codes
- `deployment.environment`: 3 environments

That gives you 5 x 50 x 20 x 3 = 15,000 time series for a single metric. Add a `server.instance_id` label with 100 instances and you are at 1.5 million series. At $0.10 per 1,000 active series per month, that one metric costs $150/month.

## Strategy 1: SDK-Level Aggregation with Views

OpenTelemetry SDK Views let you control aggregation before data even reaches the Collector. You can drop unnecessary attributes, change aggregation types, or set histogram bucket boundaries.

Here is how to configure Views in a Python application to reduce cardinality:

```python
# Configure SDK Views to aggregate metrics at the source.
# This drops high-cardinality attributes and customizes histogram buckets.
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View, ExplicitBucketHistogramAggregation

# View that removes instance-level attributes from HTTP metrics,
# keeping only the dimensions needed for dashboards and alerts.
http_duration_view = View(
    instrument_name="http.server.request.duration",
    attribute_keys={"http.method", "http.route", "http.status_code"},
    aggregation=ExplicitBucketHistogramAggregation(
        boundaries=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
    ),
)

# View that drops all attributes from a counter where only the
# total value matters, not per-dimension breakdowns.
simple_counter_view = View(
    instrument_name="background_jobs.completed",
    attribute_keys=set(),  # Empty set = no attributes, single time series
)

provider = MeterProvider(views=[http_duration_view, simple_counter_view])
```

## Strategy 2: Collector-Level Aggregation with the Metrics Transform Processor

When you cannot modify application code, the Collector's `metricstransform` processor can aggregate metrics on the way through:

```yaml
# Collector config that uses the metrics transform processor
# to drop high-cardinality attributes and reduce series count.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # The transform processor modifies metrics in-flight.
  # Here we remove attributes that create excessive cardinality.
  transform/reduce_cardinality:
    metric_statements:
      - context: datapoint
        statements:
          # Remove instance-specific attributes from all metrics
          - delete_key(attributes, "server.instance_id")
          - delete_key(attributes, "container.id")
          - delete_key(attributes, "pod.uid")

          # Truncate high-cardinality URL paths to their route template
          # e.g., /users/12345/orders becomes /users/*/orders
          - replace_pattern(attributes["http.route"], "/[0-9]+", "/*")

  # The groupbyattrs processor reaggregates metrics after
  # attribute removal to merge previously distinct series.
  groupbyattrs:
    keys:
      - service.name
      - http.method
      - http.route
      - http.status_code

  batch:
    send_batch_size: 8192
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://metrics-backend.internal:4318

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [transform/reduce_cardinality, groupbyattrs, batch]
      exporters: [otlphttp]
```

## Strategy 3: Use Delta Temporality with Reaggregation

Cumulative metrics from multiple instances create duplicate series at the backend. Switching to delta temporality and reaggregating at the Collector reduces the series count to one per unique attribute set rather than one per instance.

```python
# Configure the OTLP exporter to use delta temporality,
# which enables the Collector to reaggregate across instances.
from opentelemetry.sdk.metrics.export import (
    AggregationTemporality,
)
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

exporter = OTLPMetricExporter(
    endpoint="otel-collector:4317",
    preferred_temporality={
        # Delta temporality means each export contains only the
        # change since the last export, not the cumulative total.
        # This allows the Collector to sum across instances.
        "Counter": AggregationTemporality.DELTA,
        "Histogram": AggregationTemporality.DELTA,
        "UpDownCounter": AggregationTemporality.DELTA,
    },
)
```

## Measuring the Impact

Before and after aggregation, track these numbers:

```promql
# Count the number of active time series per metric name.
# Run this query before and after applying aggregation to
# measure the cardinality reduction.
count by (__name__) ({__name__=~"http.*"})
```

A typical result after applying source aggregation:

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| http.server.request.duration | 1,500,000 | 3,000 | 99.8% |
| http.server.active_requests | 300 | 3 | 99.0% |
| background_jobs.completed | 48,000 | 1 | ~100% |

## Common Mistakes

- **Aggregating too aggressively**: If you drop `http.status_code`, you lose the ability to alert on error rate spikes. Always check which attributes are used in your alerting rules before removing them.
- **Forgetting about exemplars**: When you aggregate histograms, individual request traces are lost. Use exemplars to preserve links between aggregated metrics and representative traces.
- **Ignoring the SDK**: Many teams jump straight to Collector-level processing. SDK Views are more efficient because they prevent high-cardinality data from being serialized and transmitted in the first place.

Source aggregation is the single most effective way to reduce metrics costs. A well-tuned set of Views and transform rules can cut your active series count by 90% or more without losing the dimensions that drive your dashboards and alerts.
