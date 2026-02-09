# How to Use OTTL to Add Prefix or Suffix to Metric Names and Rename Attributes Across Instruments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Metrics, Transform Processor, Renaming

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
          - set(name, Concat(["myapp", name], "."))
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
          - set(name, Concat([name, "production"], ".")) where resource.attributes["deployment.environment"] == "production"
          - set(name, Concat([name, "staging"], ".")) where resource.attributes["deployment.environment"] == "staging"
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
          - set(name, Concat(["counter", name], ".")) where type == METRIC_DATA_TYPE_SUM
          # Prefix gauge metrics with "gauge."
          - set(name, Concat(["gauge", name], ".")) where type == METRIC_DATA_TYPE_GAUGE
          # Prefix histogram metrics with "histogram."
          - set(name, Concat(["histogram", name], ".")) where type == METRIC_DATA_TYPE_HISTOGRAM
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
          - set(attributes["server.address"], attributes["host"]) where attributes["host"] != nil
          - delete_key(attributes, "host") where attributes["server.address"] != nil

          # Rename "method" to "http.request.method"
          - set(attributes["http.request.method"], attributes["method"]) where attributes["method"] != nil
          - delete_key(attributes, "method") where attributes["http.request.method"] != nil

          # Rename "status_code" to "http.response.status_code"
          - set(attributes["http.response.status_code"], attributes["status_code"]) where attributes["status_code"] != nil
          - delete_key(attributes, "status_code") where attributes["http.response.status_code"] != nil
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
          - set(name, Concat(["svc", name], "."))
          # Remove unwanted prefix if present
          - replace_pattern(name, "^svc\\.go_", "svc.runtime.go.")
          # Fix unit naming
          - set(unit, "s") where unit == "seconds"
          - set(unit, "By") where unit == "bytes"

      # Datapoint-level attribute renaming
      - context: datapoint
        statements:
          # Standardize common attribute names
          - set(attributes["service.instance.id"], attributes["instance"]) where attributes["instance"] != nil
          - delete_key(attributes, "instance") where attributes["service.instance.id"] != nil
          - set(attributes["service.name"], attributes["job"]) where attributes["job"] != nil
          - delete_key(attributes, "job") where attributes["service.name"] != nil

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
          - replace_pattern(name, "_", ".")

          # Replace specific patterns
          - replace_pattern(name, "^process\\.", "runtime.process.")
          - replace_pattern(name, "^go\\.", "runtime.go.")
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
          - set(attributes["service.name"], attributes["job"]) where attributes["job"] != nil
          - delete_key(attributes, "job") where attributes["service.name"] != nil
          - set(attributes["service.instance.id"], attributes["instance"]) where attributes["instance"] != nil
          - delete_key(attributes, "instance") where attributes["service.instance.id"] != nil
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
          - set(name, Concat([resource.attributes["service.name"], name], ".")) where resource.attributes["service.name"] != nil
```

This turns `http_requests_total` from service "checkout" into `checkout.http_requests_total`.

## Performance Notes

OTTL statements execute in order, and each statement is evaluated for every metric/datapoint. For high-throughput pipelines:

1. Put the most selective `where` clauses first
2. Combine related transformations in a single context block
3. Avoid regex-heavy operations when simple string matching works
4. Profile the Collector's CPU usage after adding transforms

OTTL-based metric renaming gives you the flexibility to standardize naming conventions across all your metric sources. It is particularly useful when migrating from Prometheus naming conventions to OpenTelemetry semantic conventions, or when you need to enforce organization-wide naming standards.
