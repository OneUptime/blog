# How to Use OTTL to Add Prefix or Suffix to Metric Names

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Metric, Transform Processor, Renaming

Description: Use OTTL in the OpenTelemetry Collector transform processor to add prefixes or suffixes to metric names and rename attributes.

The OpenTelemetry Transformation Language (OTTL) gives you a flexible way to manipulate metric names and attributes right in the Collector. While the metricstransform processor handles specific renaming tasks, OTTL through the transform processor offers more programmatic control, including conditional renaming, string concatenation, and bulk attribute changes.

## Adding a Prefix to All Metric Names

The most common use case is adding a namespace prefix to avoid metric name collisions:

```yaml
processors:
  transform/prefix:
    metric_statements:
      - context: metric
        statements:
          # Add "myapp." prefix to all metric names
          - set(metric.name, Concat(["myapp", metric.name], "."))
```

After this transform, `http_requests_total` becomes `myapp.http_requests_total` and `db_query_duration` becomes `myapp.db_query_duration`.

## Adding a Suffix to Metric Names

You might need to add a unit suffix or environment tag:

```yaml
processors:
  transform/suffix:
    metric_statements:
      - context: metric
        statements:
          # Add environment suffix to metric names
          - set(metric.name, Concat([metric.name, "production"], ".")) where resource.attributes["deployment.environment"] == "production"
          - set(metric.name, Concat([metric.name, "staging"], ".")) where resource.attributes["deployment.environment"] == "staging"
```

## Conditional Prefix Based on Metric Properties

OTTL lets you apply different prefixes based on the metric type or other properties:

```yaml
processors:
  transform/conditional-prefix:
    metric_statements:
      - context: metric
        statements:
          # Prefix counter metrics with "counter."
          - set(metric.name, Concat(["counter", metric.name], ".")) where metric.type == METRIC_DATA_TYPE_SUM
          # Prefix gauge metrics with "gauge."
          - set(metric.name, Concat(["gauge", metric.name], ".")) where metric.type == METRIC_DATA_TYPE_GAUGE
          # Prefix histogram metrics with "histogram."
          - set(metric.name, Concat(["histogram", metric.name], ".")) where metric.type == METRIC_DATA_TYPE_HISTOGRAM
```

## Renaming Attributes Across All Metrics

To rename an attribute on every datapoint of every metric:

```yaml
processors:
  transform/rename-attrs:
    metric_statements:
      - context: datapoint
        statements:
          # Rename "host" to "server.address" across all metrics
          - set(datapoint.attributes["server.address"], datapoint.attributes["host"]) where datapoint.attributes["host"] != nil
          - delete_key(datapoint.attributes, "host") where datapoint.attributes["server.address"] != nil

          # Rename "method" to "http.request.method"
          - set(datapoint.attributes["http.request.method"], datapoint.attributes["method"]) where datapoint.attributes["method"] != nil
          - delete_key(datapoint.attributes, "method") where datapoint.attributes["http.request.method"] != nil

          # Rename "status_code" to "http.response.status_code"
          - set(datapoint.attributes["http.response.status_code"], datapoint.attributes["status_code"]) where datapoint.attributes["status_code"] != nil
          - delete_key(datapoint.attributes, "status_code") where datapoint.attributes["http.response.status_code"] != nil
```

## Complete Configuration Example

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "services"
          scrape_interval: 15s
          static_configs:
            - targets: ["app1:8080", "app2:8080", "app3:8080"]

processors:
  transform/standardize:
    metric_statements:
      # Metric-level transformations
      - context: metric
        statements:
          # Add service prefix to all metric names
          - set(metric.name, Concat(["svc", metric.name], "."))
          # Remove unwanted prefix if present
          - replace_pattern(metric.name, "^svc\\.go_", "svc.runtime.go.")
          # Fix unit naming
          - set(metric.unit, "s") where metric.unit == "seconds"
          - set(metric.unit, "By") where metric.unit == "bytes"

      # Datapoint-level attribute renaming
      - context: datapoint
        statements:
          # Standardize common attribute names
          - set(datapoint.attributes["service.instance.id"], datapoint.attributes["instance"]) where datapoint.attributes["instance"] != nil
          - delete_key(datapoint.attributes, "instance") where datapoint.attributes["service.instance.id"] != nil
          - set(datapoint.attributes["service.name"], datapoint.attributes["job"]) where datapoint.attributes["job"] != nil
          - delete_key(datapoint.attributes, "job") where datapoint.attributes["service.name"] != nil

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [transform/standardize, batch]
      exporters: [otlp]
```

## Using replace_pattern for Bulk Renaming

The `replace_pattern` function works on metric names too, using regex for flexible matching:

```yaml
processors:
  transform/bulk-rename:
    metric_statements:
      - context: metric
        statements:
          # Convert snake_case to dot notation
          # http_server_request_duration -> http.server.request.duration
          - replace_pattern(metric.name, "_", ".")

          # Replace specific patterns
          - replace_pattern(metric.name, "^process\\.", "runtime.process.")
          - replace_pattern(metric.name, "^go\\.", "runtime.go.")
```

## Renaming Resource Attributes for Metrics

You can also rename resource-level attributes that apply to all metrics from a resource:

```yaml
processors:
  transform/resource-attrs:
    metric_statements:
      - context: resource
        statements:
          # Rename Prometheus job/instance to OTel conventions
          - set(resource.attributes["service.name"], resource.attributes["job"]) where resource.attributes["job"] != nil
          - delete_key(resource.attributes, "job") where resource.attributes["service.name"] != nil
          - set(resource.attributes["service.instance.id"], resource.attributes["instance"]) where resource.attributes["instance"] != nil
          - delete_key(resource.attributes, "instance") where resource.attributes["service.instance.id"] != nil
```

## Combining Prefix Addition with Attribute Extraction

A useful pattern is to extract an attribute value into the metric name as a prefix:

```yaml
processors:
  transform/dynamic-prefix:
    metric_statements:
      - context: metric
        statements:
          # Use the service name as a metric prefix
          - set(metric.name, Concat([resource.attributes["service.name"], metric.name], ".")) where resource.attributes["service.name"] != nil
```

This turns `http_requests_total` from service "checkout" into `checkout.http_requests_total`.

## Performance Notes

OTTL statements execute in order, and each statement is evaluated for every metric/datapoint. For high-throughput pipelines:

1. Put the most selective `where` clauses first
2. Combine related transformations in a single context block
3. Avoid regex-heavy operations when simple string matching works
4. Profile the Collector's CPU usage after adding transforms

OTTL-based metric renaming gives you the flexibility to standardize naming conventions across all your metric sources. It is particularly useful when migrating from Prometheus naming conventions to OpenTelemetry semantic conventions, or when you need to enforce organization-wide naming standards.
