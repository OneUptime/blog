# How to Use the OpenTelemetry Transform Processor to Strip Unnecessary Attributes Before Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Transform Processor, Data Reduction, OTTL

Description: Use the OpenTelemetry Collector transform processor with OTTL to remove unnecessary span and log attributes and reduce telemetry data size before export.

Telemetry data tends to accumulate attributes over time. HTTP headers, user agents, request bodies, internal framework metadata - these attributes inflate the size of every span and log record. Many of them are never used in dashboards or alerts. Removing them before export reduces storage costs, speeds up queries, and lowers network bandwidth.

The OpenTelemetry Collector's `transform` processor uses the OpenTelemetry Transformation Language (OTTL) to modify, delete, and reshape telemetry data inline. This post covers practical patterns for stripping unnecessary attributes from traces, logs, and metrics.

## Understanding OTTL

OTTL is a domain-specific language designed for transforming telemetry within the Collector pipeline. It operates on specific contexts - `span`, `metric`, `log`, `resource`, and `scope` - and provides functions for deleting attributes, truncating values, replacing strings, and more.

The basic syntax is:

```
<function>(<path>) where <condition>
```

## Identifying Attributes to Remove

Before you start deleting attributes, figure out which ones are actually used. Query your backend for the most common attribute keys and cross-reference them with your dashboards and alert rules.

Here is a PromQL query to find the most common span attribute keys (if your backend supports it):

```promql
# Count distinct attribute keys across spans in the last 7 days
# This helps identify attributes that exist but may not be used anywhere
topk(50, count by (attribute_key) (span_attribute_keys_total))
```

Common candidates for removal include:

- `http.request.header.*` (especially cookies, auth tokens)
- `http.response.header.*`
- `user_agent.original` (long strings, rarely queried)
- `thread.id` and `thread.name`
- Framework-specific internal attributes
- Duplicate information already captured in resource attributes

## Basic Attribute Deletion

Here is a transform processor config that removes common unnecessary attributes from spans:

```yaml
# otel-collector-config.yaml
# Strip unnecessary attributes from spans to reduce data volume

processors:
  transform/strip-spans:
    trace_statements:
      - context: span
        statements:
          # Remove HTTP headers that contain sensitive or bulky data
          - delete_key(attributes, "http.request.header.cookie")
          - delete_key(attributes, "http.request.header.authorization")
          - delete_key(attributes, "http.request.header.user-agent")
          - delete_key(attributes, "http.response.header.set-cookie")

          # Remove thread info - rarely useful for distributed tracing
          - delete_key(attributes, "thread.id")
          - delete_key(attributes, "thread.name")

          # Remove the full URL if you already have the route template
          # The route template (http.route) is more useful for grouping
          - delete_key(attributes, "http.url") where attributes["http.route"] != nil
```

## Conditional Deletion

OTTL supports conditions, so you can selectively remove attributes based on other properties. This is useful for keeping attributes on error spans but removing them from successful ones.

```yaml
processors:
  transform/conditional-strip:
    trace_statements:
      - context: span
        statements:
          # Keep detailed attributes on error spans for debugging
          # but strip them from successful spans to save space
          - delete_key(attributes, "db.statement") where status.code == 0
          - delete_key(attributes, "http.request.body") where status.code == 0
          - delete_key(attributes, "http.response.body") where status.code == 0

          # Remove verbose attributes from health check spans entirely
          - delete_key(attributes, "http.request.header.accept")
            where attributes["http.route"] == "/healthz"
```

## Truncating Long Values

Sometimes you want to keep an attribute but reduce its size. OTTL's `truncate_all` function shortens all attribute string values to a maximum length:

```yaml
processors:
  transform/truncate:
    trace_statements:
      - context: span
        statements:
          # Truncate all string attribute values to 256 characters max
          # This catches unexpectedly large values like serialized objects
          - truncate_all(attributes, 256)

    log_statements:
      - context: log
        statements:
          # Truncate log body to 4096 characters
          # Some log libraries serialize entire request/response bodies
          - truncate_all(attributes, 256)
```

## Stripping Log Attributes

Logs often carry the most bloat. Here is a config focused on cleaning up log records:

```yaml
processors:
  transform/strip-logs:
    log_statements:
      - context: log
        statements:
          # Remove stack trace from non-error logs
          # Some frameworks attach stack traces to warning-level logs
          - delete_key(attributes, "exception.stacktrace")
            where severity_number < 17

          # Remove source code location for production logs
          # File, line, and function info is useful in dev but inflates prod data
          - delete_key(attributes, "code.filepath")
          - delete_key(attributes, "code.lineno")
          - delete_key(attributes, "code.function")

          # Strip internal logger metadata
          - delete_key(attributes, "log.logger")
          - delete_key(attributes, "log.file.path")
```

## Cleaning Up Resource Attributes

Resource attributes are attached to every telemetry item from a given source. Removing unnecessary resource attributes has a multiplicative effect on data reduction.

```yaml
processors:
  transform/strip-resource:
    trace_statements:
      - context: resource
        statements:
          # Remove Kubernetes metadata that duplicates information
          # or is not used in queries
          - delete_key(attributes, "k8s.pod.uid")
          - delete_key(attributes, "k8s.replicaset.name")
          - delete_key(attributes, "k8s.replicaset.uid")

          # Remove process-level details
          - delete_key(attributes, "process.command_args")
          - delete_key(attributes, "process.executable.path")
          - delete_key(attributes, "process.runtime.description")
```

## Putting It All Together

Combine the processors in a single pipeline, ordered from broadest to most specific:

```yaml
# Complete pipeline with multiple transform stages

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/strip-resource:
    trace_statements:
      - context: resource
        statements:
          - delete_key(attributes, "k8s.pod.uid")
          - delete_key(attributes, "process.command_args")

  transform/strip-spans:
    trace_statements:
      - context: span
        statements:
          - delete_key(attributes, "http.request.header.cookie")
          - delete_key(attributes, "thread.id")
          - delete_key(attributes, "thread.name")
          - truncate_all(attributes, 256)

  transform/strip-logs:
    log_statements:
      - context: log
        statements:
          - delete_key(attributes, "code.filepath")
          - delete_key(attributes, "code.lineno")
          - truncate_all(attributes, 256)

  batch:
    send_batch_size: 8192
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/strip-resource, transform/strip-spans, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [transform/strip-logs, batch]
      exporters: [otlp]
```

## Measuring the Impact

After deploying the transform processors, compare the data volume before and after. Check the Collector's internal metric `otelcol_exporter_sent_spans` and compare bytes exported (if your backend tracks ingestion volume). Teams typically see a 20-50% reduction in data volume from attribute stripping alone, depending on how verbose their instrumentation was to begin with.

Start conservative - remove attributes you are certain are not used, measure the impact, and iterate. It is much easier to stop deleting an attribute than to recover data you already dropped.
