# Use OpenTelemetry Metrics Aggregation at the Source to Reduce Cardinality Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Metric, Cardinality, Aggregation

Description: Reduce metrics cardinality costs by aggregating OpenTelemetry metrics at the SDK and Collector level before export.

Metrics cardinality is the silent budget killer in observability. Every unique combination of metric name and label values creates a new time series. A single metric with a `user_id` label across a million users generates a million time series, and most backends charge per active series. Aggregating metrics at the source - before they leave your infrastructure - is the most effective way to control this cost.

## Where Cardinality Explodes

Consider an HTTP request duration histogram. With just four labels, cardinality multiplies fast:

- `http.request.method`: 5 values (GET, POST, PUT, DELETE, PATCH)
- `http.route`: 50 routes
- `http.response.status_code`: 20 status codes
- `deployment.environment.name`: 3 environments

That gives you 5 x 50 x 20 x 3 = 15,000 time series for a single metric. Add a `service.instance.id` label with 100 instances and you are at 1.5 million series. At $0.10 per 1,000 active series per month, that one metric costs $150/month.

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
    attribute_keys={"http.request.method", "http.route", "http.response.status_code"},
    aggregation=ExplicitBucketHistogramAggregation(
        boundaries=[0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0]
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

## Strategy 2: Collector-Level Aggregation with the Transform Processor

When you cannot modify application code, the Collector's `transform` processor can aggregate metrics on the way through:

```yaml
# Collector config that uses the transform processor
# to drop high-cardinality attributes and reduce series count.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Remove resource attributes that create excessive cardinality.
  transform/drop_high_cardinality_resources:
    error_mode: ignore
    metric_statements:
      - context: resource
        statements:
          - delete_key(attributes, "service.instance.id")
          - delete_key(attributes, "container.id")
          - delete_key(attributes, "k8s.pod.uid")

  # Compact matching ResourceMetrics after resource attribute removal.
  groupbyattrs:

  # Normalize and aggregate datapoint attributes.
  transform/reduce_cardinality:
    error_mode: ignore
    metric_statements:
      - context: datapoint
        statements:
          # If a legacy instrumentation put raw paths in http.route,
          # normalize them before aggregating.
          # e.g., /users/12345/orders becomes /users/*/orders
          - replace_pattern(attributes["http.route"], "/[0-9]+", "/*")

      - context: metric
        statements:
          # Aggregate HTTP datapoints by the dimensions you still need.
          - aggregate_on_attributes("sum", ["http.request.method", "http.route", "http.response.status_code"]) where metric.name == "http.server.request.duration"
          - aggregate_on_attributes("sum", ["http.request.method"]) where metric.name == "http.server.active_requests"

          # Aggregate this counter to a single datapoint.
          - aggregate_on_attributes("sum", []) where metric.name == "background_jobs.completed"

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
      processors: [transform/drop_high_cardinality_resources, groupbyattrs, transform/reduce_cardinality, batch]
      exporters: [otlphttp]
```

## Strategy 3: Use Delta Temporality with Reaggregation

Cumulative counters and histograms from multiple instances are harder to aggregate safely in a stateless Collector. Switching counters and histograms to delta temporality and reaggregating after removing instance-level attributes lets the Collector emit one series per remaining attribute set rather than one per instance.

```python
# Configure the OTLP exporter to use delta temporality,
# which enables the Collector to reaggregate across instances.
from opentelemetry.sdk.metrics import Counter, Histogram
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
        Counter: AggregationTemporality.DELTA,
        Histogram: AggregationTemporality.DELTA,
    },
)
```

## Measuring the Impact

Before and after aggregation, track these numbers:

```promql
# Count the number of active time series per metric name.
# Run this query before and after applying aggregation to
# measure the cardinality reduction.
count by (__name__) ({__name__=~"http_.*"})
```

A typical result after applying source aggregation:

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| http.server.request.duration | 1,500,000 | 3,000 | 99.8% |
| http.server.active_requests | 300 | 3 | 99.0% |
| background_jobs.completed | 48,000 | 1 | ~100% |

## Common Mistakes

- **Aggregating too aggressively**: If you drop `http.response.status_code`, you lose the ability to alert on error rate spikes. Always check which attributes are used in your alerting rules before removing them.
- **Forgetting about exemplars**: When you aggregate histograms, the metric stream is aggregated, but exemplars can still preserve links from selected measurements to representative traces.
- **Ignoring the SDK**: Many teams jump straight to Collector-level processing. SDK Views are more efficient because they prevent high-cardinality data from being serialized and transmitted in the first place.

Source aggregation is the single most effective way to reduce metrics costs. A well-tuned set of Views and transform rules can cut your active series count by 90% or more without losing the dimensions that drive your dashboards and alerts.
