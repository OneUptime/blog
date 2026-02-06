# How to Configure Attribute Cardinality Limits to Prevent Metric Cost Explosions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cardinality, Metrics, Attribute Limits

Description: Prevent runaway metric costs by setting cardinality limits on attributes at both the SDK and Collector level.

A single engineer adding `user.id` as a metric attribute can turn a $50/month metric into a $50,000/month metric overnight. This is not a hypothetical scenario - it happens regularly in organizations without cardinality guardrails. OpenTelemetry provides multiple layers of defense against cardinality explosions, from SDK-level attribute limits to Collector-level enforcement. Setting these up is one of the most important cost protection measures you can implement.

## How Cardinality Explosions Happen

Every unique combination of attribute values on a metric creates a distinct time series. Here is a concrete example:

```python
# This innocent-looking code creates a time series for every
# unique user. With 1M users, that is 1M time series.
from opentelemetry import metrics

meter = metrics.get_meter("checkout")
order_counter = meter.create_counter("orders.completed")

def process_order(user_id, product_id, region):
    # BAD: user_id and product_id are high-cardinality attributes
    order_counter.add(1, {
        "user.id": user_id,        # 1,000,000 unique values
        "product.id": product_id,  # 50,000 unique values
        "region": region,          # 5 unique values
    })
    # Total time series: 1M * 50K * 5 = 250 billion
    # This will crash your metrics backend.
```

The fix is straightforward - only include low-cardinality attributes:

```python
# GOOD: Only include attributes with bounded cardinality.
# Use product_category instead of product_id.
def process_order(user_id, product_id, region, product_category):
    order_counter.add(1, {
        "product.category": product_category,  # 20 unique values
        "region": region,                       # 5 unique values
    })
    # Total time series: 20 * 5 = 100. Manageable.
```

But relying on developer discipline is not a strategy. You need automated enforcement.

## Layer 1: SDK Attribute Limits

OpenTelemetry SDKs support environment variables that cap the number of attributes per data point. This is the first line of defense:

```bash
# Set these environment variables in your deployment manifests
# to enforce attribute limits across all services.

# Maximum number of attributes per metric data point.
# Excess attributes are silently dropped.
export OTEL_METRIC_EXPORT_ATTRIBUTE_COUNT_LIMIT=10

# Maximum number of attributes per span.
export OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT=64

# Maximum attribute value length in characters.
# Long values (like stack traces in attributes) are truncated.
export OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT=256
```

For more granular control, use SDK Views to explicitly allowlist attributes per metric:

```python
# SDK Views that restrict which attributes each metric can carry.
# Any attribute not in the allowlist is dropped at the SDK level.
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View

views = [
    # HTTP metrics: only allow bounded attributes
    View(
        instrument_name="http.server.request.duration",
        attribute_keys={
            "http.method",       # ~5 values
            "http.route",        # ~100 values (use route templates)
            "http.status_code",  # ~20 values
        },
        # Any other attribute (user_id, session_id, etc.)
        # is automatically excluded.
    ),

    # Database metrics: restrict to operation type and table
    View(
        instrument_name="db.client.operation.duration",
        attribute_keys={
            "db.operation",  # SELECT, INSERT, UPDATE, DELETE
            "db.name",       # database name
        },
    ),

    # Catch-all: limit all other metrics to 5 attributes max
    View(
        instrument_name="*",
        attribute_keys=None,  # None means use the default limit
    ),
]

provider = MeterProvider(views=views)
```

## Layer 2: Collector Cardinality Enforcement

The Collector provides a second layer of defense using the `transform` processor to strip high-cardinality attributes and the `filter` processor to drop data points that exceed cardinality thresholds.

```yaml
# Collector config that enforces cardinality limits by
# removing known high-cardinality attributes and capping
# attribute counts per data point.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Remove attributes that are known to be high-cardinality.
  # This is the blocklist approach.
  transform/strip_high_card:
    metric_statements:
      - context: datapoint
        statements:
          # Remove any attribute that looks like a user identifier
          - delete_key(attributes, "user.id")
          - delete_key(attributes, "user.email")
          - delete_key(attributes, "session.id")
          - delete_key(attributes, "request.id")
          - delete_key(attributes, "trace.id")

          # Truncate URL paths to prevent path parameter cardinality
          - replace_pattern(attributes["url.path"], "/[0-9a-f-]{36}", "/{id}")
          - replace_pattern(attributes["url.path"], "/[0-9]+", "/{id}")

  # The cumulativetodelta processor can also help by converting
  # cumulative metrics to delta, enabling reaggregation.
  cumulativetodelta:

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
      processors: [transform/strip_high_card, cumulativetodelta, batch]
      exporters: [otlphttp]
```

## Layer 3: Cardinality Alerting

Even with limits in place, you need visibility into cardinality trends so you can catch new high-cardinality attributes before they hit your limits:

```yaml
# Prometheus alerting rules that detect cardinality anomalies
# before they cause cost explosions.
groups:
  - name: cardinality_alerts
    rules:
      # Alert when a single metric exceeds 10,000 active time series
      - alert: HighCardinalityMetric
        expr: |
          count by (__name__) ({__name__=~".+"}) > 10000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Metric {{ $labels.__name__ }} has {{ $value }} active series"
          runbook: "Check for high-cardinality attributes and add to blocklist"

      # Alert on rapid cardinality growth (doubling in 1 hour)
      - alert: CardinalitySpike
        expr: |
          (
            count by (__name__) ({__name__=~".+"})
            /
            count by (__name__) ({__name__=~".+"} offset 1h)
          ) > 2
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "Metric {{ $labels.__name__ }} cardinality doubled in the last hour"
```

## Building an Attribute Allowlist Registry

For mature organizations, maintain a central registry of approved metric attributes:

```yaml
# attribute-registry.yaml
# Central registry of approved metric attributes.
# CI/CD pipelines validate that instrumentation code only
# uses attributes from this list.
approved_attributes:
  http_metrics:
    - name: http.method
      max_cardinality: 10
    - name: http.route
      max_cardinality: 200
    - name: http.status_code
      max_cardinality: 30
    - name: deployment.environment
      max_cardinality: 5

  database_metrics:
    - name: db.system
      max_cardinality: 5
    - name: db.operation
      max_cardinality: 10
    - name: db.name
      max_cardinality: 20

  # Explicitly banned attributes that must never appear on metrics
  banned_attributes:
    - user.id
    - user.email
    - session.id
    - request.id
    - ip.address
```

## The Cardinality Budget Formula

Use this formula to estimate the time series count for a new metric before deploying it:

```
Total Series = Product of (unique values per attribute)
Monthly Cost = Total Series * (cost per series per month)
```

If the estimated cost exceeds $100/month for a single metric, it needs a review. This simple gate prevents most cardinality explosions before they reach production.

The layered approach - SDK Views as the primary control, Collector transforms as the safety net, and alerting as the early warning system - gives you defense in depth against cardinality-driven cost explosions. No single layer is sufficient on its own, but together they create a robust guardrail system.
