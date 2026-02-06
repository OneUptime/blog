# How to Handle High-Cardinality Metrics in OpenTelemetry Without Blowing Your Budget

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Performance, Metrics, Cardinality, Cost Optimization

Description: Learn practical strategies to manage high-cardinality metrics in OpenTelemetry, including filtering, aggregation, and dimension reduction techniques that reduce costs by up to 70%.

High-cardinality metrics are one of the biggest cost drivers in observability systems. When you track metrics with attributes like user IDs, request IDs, or IP addresses, the number of unique time series explodes exponentially. A single metric with 10 high-cardinality attributes can generate millions of unique series, each costing money to store and query.

OpenTelemetry provides several mechanisms to handle high-cardinality metrics without sacrificing observability. This guide covers practical strategies to reduce cardinality while maintaining useful insights.

## Understanding Cardinality and Its Impact

Cardinality refers to the number of unique combinations of label values in your metrics. A metric with attributes `http.method`, `http.status_code`, and `http.route` has bounded cardinality because these values are limited. But add a `user.id` attribute, and cardinality explodes to the number of users in your system.

```mermaid
graph TD
    A[Metric: http_requests_total] --> B[Low Cardinality: 100 series]
    A --> C[Medium Cardinality: 10,000 series]
    A --> D[High Cardinality: 10M+ series]
    B --> E[Attributes: method, status]
    C --> F[Attributes: method, status, route]
    D --> G[Attributes: method, status, route, user_id]
```

Most observability backends charge based on the number of unique time series. High-cardinality metrics can consume 70-90% of your observability budget while providing limited value.

## Strategy 1: Drop High-Cardinality Attributes at Collection

The simplest approach is preventing high-cardinality attributes from entering your pipeline. Configure your OpenTelemetry SDK to exclude problematic attributes at instrumentation time.

```python
# Python SDK configuration to drop high-cardinality attributes
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.view import View, DropAggregation

# Define a view that drops user_id and request_id attributes
view = View(
    instrument_name="http.server.request.duration",
    attribute_keys=["http.method", "http.status_code", "http.route"],
    # Only these attributes will be retained, all others dropped
)

# Create meter provider with the view
provider = MeterProvider(views=[view])
metrics.set_meter_provider(provider)
```

This configuration ensures that only the specified attributes are retained. Any other attributes instrumented by libraries are dropped before metrics are exported.

## Strategy 2: Use the Filter Processor in Collector

The OpenTelemetry Collector's filter processor drops metrics based on patterns. This is useful when you cannot control SDK configuration or when using auto-instrumentation.

```yaml
# OpenTelemetry Collector configuration
processors:
  # Filter processor to drop high-cardinality metrics
  filter/drop_cardinality:
    metrics:
      # Drop metrics that match specific patterns
      exclude:
        match_type: regexp
        metric_names:
          - .*user_id.*
          - .*session_id.*
          - .*request_id.*

      # Alternative: use datapoint filtering to drop based on attributes
      datapoint:
        - 'attributes["user.id"] != nil'
        - 'attributes["trace.id"] != nil'

  # Transform processor to remove specific attributes
  transform/remove_attributes:
    metric_statements:
      - context: datapoint
        statements:
          # Remove high-cardinality attributes from all metrics
          - delete_key(attributes, "user.id")
          - delete_key(attributes, "session.id")
          - delete_key(attributes, "request.id")
          - delete_key(attributes, "client.ip")

service:
  pipelines:
    metrics:
      processors: [filter/drop_cardinality, transform/remove_attributes, batch]
```

The filter processor completely drops metrics or datapoints, while the transform processor removes specific attributes while keeping the metric.

## Strategy 3: Aggregate High-Cardinality Dimensions

Instead of dropping attributes entirely, aggregate them into lower-cardinality buckets. This preserves some information while dramatically reducing series count.

```yaml
# Collector configuration for dimension aggregation
processors:
  # Transform processor for bucketing high-cardinality values
  transform/aggregate_dimensions:
    metric_statements:
      - context: datapoint
        statements:
          # Bucket HTTP status codes into ranges (2xx, 3xx, 4xx, 5xx)
          - set(attributes["http.status_class"], Concat([Substring(attributes["http.status_code"], 0, 1), "xx"], ""))
          - delete_key(attributes, "http.status_code")

          # Bucket routes with IDs into templates
          # /users/12345 becomes /users/{id}
          - set(attributes["http.route"], ReplaceAllPatterns(attributes["http.route"], "/\\d+", "/{id}"))

          # Convert IP addresses to /24 subnets
          # 192.168.1.123 becomes 192.168.1.0/24
          - set(attributes["client.subnet"], Concat([Substring(attributes["client.ip"], 0, LastIndex(attributes["client.ip"], ".")), ".0/24"], ""))
          - delete_key(attributes, "client.ip")

service:
  pipelines:
    metrics:
      processors: [transform/aggregate_dimensions, batch]
```

This approach reduces cardinality while maintaining useful groupings for debugging and analysis.

## Strategy 4: Implement Metric Views with Aggregation

OpenTelemetry SDKs support Views, which define how metrics are aggregated before export. Views can reduce cardinality at the source.

```go
// Go SDK configuration with views for cardinality reduction
package main

import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/metric/aggregation"
)

func initMeterProvider() *metric.MeterProvider {
    // Create a view that aggregates request duration without user_id
    view := metric.NewView(
        metric.Instrument{Name: "http.server.request.duration"},
        metric.Stream{
            // Only keep low-cardinality attributes
            AttributeFilter: func(kv attribute.KeyValue) bool {
                key := string(kv.Key)
                // Drop high-cardinality attributes
                return key != "user.id" &&
                       key != "request.id" &&
                       key != "trace.id" &&
                       key != "client.ip"
            },
            // Use histogram with specific buckets to control cardinality
            Aggregation: aggregation.ExplicitBucketHistogram{
                Boundaries: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0},
            },
        },
    )

    return metric.NewMeterProvider(
        metric.WithView(view),
    )
}
```

Views provide fine-grained control over metric aggregation and can dramatically reduce exported series count.

## Strategy 5: Use Sampling for High-Cardinality Metrics

For metrics that must include high-cardinality attributes, implement sampling to reduce volume while maintaining statistical validity.

```yaml
# Collector configuration for metric sampling
processors:
  # Probabilistic sampling processor
  probabilistic_sampler:
    sampling_percentage: 10  # Keep 10% of data points
    hash_seed: 22  # Deterministic sampling

  # Sample high-cardinality metrics differently
  filter/route_sampling:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - http.server.request.duration
      datapoint:
        # Only sample metrics with user_id attribute
        - 'attributes["user.id"] != nil'
        # Sample 1% of requests
        - 'Int(attributes["user.id"]) % 100 == 0'

service:
  pipelines:
    metrics/sampled:
      receivers: [otlp]
      processors: [filter/route_sampling, batch]
      exporters: [otlp/backend]
```

Sampling maintains visibility into trends while reducing the number of stored time series.

## Strategy 6: Implement Cardinality Limits in Collector

The OpenTelemetry Collector can enforce cardinality limits, automatically dropping new series when limits are reached.

```yaml
# Experimental: Cardinality limiter processor
processors:
  # Note: This is an experimental feature
  experimental_metricsgeneration/cardinality_limit:
    # Set maximum number of unique time series
    max_series: 10000

    # Action when limit is reached
    action: drop_newest  # Options: drop_newest, drop_oldest

    # Track cardinality by metric name
    by_metric: true

  # Alternative: Use groupbyattrs to reduce cardinality
  groupbyattrs/reduce_cardinality:
    # Only group by these attributes, effectively dropping others
    keys:
      - http.method
      - http.status_code
      - service.name

service:
  pipelines:
    metrics:
      processors: [groupbyattrs/reduce_cardinality, batch]
```

## Monitoring Your Cardinality

Track your cardinality to understand the impact of these strategies:

```yaml
# Collector configuration to export cardinality metrics
processors:
  # Transform processor to add cardinality tracking
  transform/track_cardinality:
    metric_statements:
      - context: metric
        statements:
          # Count unique attribute combinations
          - set(attributes["_cardinality_estimate"], "true")

# Monitor these metrics in your backend
# - otelcol_processor_batch_batch_size_trigger_send
# - otelcol_exporter_sent_metric_points
# - Compare with configured limits
```

## Real-World Example: E-Commerce Platform

An e-commerce platform reduced their observability costs by 68% by implementing these strategies:

```yaml
# Production configuration for e-commerce metrics
processors:
  # Step 1: Remove customer-specific identifiers
  transform/anonymize:
    metric_statements:
      - context: datapoint
        statements:
          # Hash customer IDs into buckets (100 buckets)
          - set(attributes["customer.segment"], Hash(attributes["customer.id"], 100))
          - delete_key(attributes, "customer.id")

          # Aggregate products into categories
          - set(attributes["product.category"], attributes["product.category_l1"])
          - delete_key(attributes, "product.id")
          - delete_key(attributes, "product.sku")

  # Step 2: Filter out unnecessary metrics
  filter/essential_only:
    metrics:
      include:
        match_type: regexp
        metric_names:
          - http.server.*
          - db.client.*
          - service.latency.*

  # Step 3: Batch with appropriate sizing
  batch:
    send_batch_size: 1024
    timeout: 10s

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [transform/anonymize, filter/essential_only, batch]
      exporters: [prometheusremotewrite]
```

This configuration maintained full observability for system health while eliminating expensive per-customer metrics.

## Best Practices Summary

1. **Identify high-cardinality attributes early** - Use cardinality estimation tools during development
2. **Drop at the source** - Configure SDKs to never collect high-cardinality attributes
3. **Use Views strategically** - Define aggregation rules at instrumentation time
4. **Aggregate before export** - Transform high-cardinality dimensions into buckets
5. **Monitor cardinality continuously** - Set up alerts for unexpected cardinality growth
6. **Document your cardinality strategy** - Ensure team alignment on what attributes to track

## Related Resources

For more information on optimizing OpenTelemetry costs, see:
- https://oneuptime.com/blog/post/delta-temporality-manage-cardinality-explosions/view
- https://oneuptime.com/blog/post/cut-observability-costs-opentelemetry-filtering-sampling/view
- https://oneuptime.com/blog/post/probabilistic-sampling-opentelemetry-cost-control/view

High-cardinality metrics are manageable with the right strategies. By implementing attribute filtering, aggregation, and sampling, you can maintain observability while keeping costs under control. The key is to be intentional about what you measure and how you aggregate it.
