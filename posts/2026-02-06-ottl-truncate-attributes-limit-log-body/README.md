# How to Use OTTL to Truncate Long Attribute Values and Limit Log Body Size in the Collector Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Truncation, Log Management

Description: Use OTTL functions to truncate long attribute values and limit log body sizes in the OpenTelemetry Collector pipeline for cost control.

Large attribute values and oversized log bodies increase storage costs, slow down queries, and can exceed backend ingestion limits. A 10KB SQL query stored in `db.statement`, a 50KB stack trace in an exception event, or a 1MB JSON payload logged as a debug message all waste resources. OTTL provides functions to truncate these values to reasonable sizes in the Collector before they reach your backend.

## Using truncate_all for Attributes

The `truncate_all` function limits the length of all string attribute values in a map:

```yaml
processors:
  transform/truncate:
    trace_statements:
      - context: span
        statements:
          # Truncate ALL span attribute string values to 256 characters
          - truncate_all(attributes, 256)

    log_statements:
      - context: log
        statements:
          # Truncate ALL log attribute string values to 512 characters
          - truncate_all(attributes, 512)
```

After truncation, a string value of 1000 characters becomes 256 characters. Non-string attributes (integers, booleans) are not affected.

## Selective Truncation with limit_all

For more targeted control, truncate specific attributes:

```yaml
processors:
  transform/selective_truncate:
    trace_statements:
      - context: span
        statements:
          # Truncate specific large attributes
          - set(attributes["db.statement"], Substring(attributes["db.statement"], 0, 500)) where attributes["db.statement"] != nil and Len(attributes["db.statement"]) > 500

          # Truncate exception messages
          - set(attributes["exception.message"], Substring(attributes["exception.message"], 0, 1000)) where attributes["exception.message"] != nil and Len(attributes["exception.message"]) > 1000

          # Truncate HTTP URL (can contain long query strings)
          - set(attributes["http.url"], Substring(attributes["http.url"], 0, 2000)) where attributes["http.url"] != nil and Len(attributes["http.url"]) > 2000
```

## Limiting Log Body Size

Log bodies can be arbitrarily large. Truncate them to a reasonable size:

```yaml
processors:
  transform/limit_logs:
    log_statements:
      - context: log
        statements:
          # Truncate log body to 4KB if it is a string
          - set(body, Substring(body, 0, 4096)) where IsString(body) and Len(body) > 4096

          # Add a flag when truncation happened
          - set(attributes["log.truncated"], true) where IsString(body) and Len(body) >= 4096
          - set(attributes["log.original_length"], Len(body)) where IsString(body) and Len(body) >= 4096
```

## Different Limits for Different Severity Levels

Error logs deserve more detail than debug logs:

```yaml
processors:
  transform/severity_limits:
    log_statements:
      - context: log
        statements:
          # Keep more content for errors (8KB)
          - set(body, Substring(body, 0, 8192)) where severity_number >= 17 and IsString(body) and Len(body) > 8192

          # Medium limit for warnings (4KB)
          - set(body, Substring(body, 0, 4096)) where severity_number >= 13 and severity_number < 17 and IsString(body) and Len(body) > 4096

          # Aggressive limit for info and debug (1KB)
          - set(body, Substring(body, 0, 1024)) where severity_number < 13 and IsString(body) and Len(body) > 1024

          # Truncate all attributes regardless of severity
          - truncate_all(attributes, 256)
```

## Truncating Resource Attributes

Resource attributes can also be oversized, especially when auto-detected:

```yaml
processors:
  transform/resource_truncate:
    trace_statements:
      - context: resource
        statements:
          # Truncate all resource attribute values
          - truncate_all(attributes, 128)

    log_statements:
      - context: resource
        statements:
          - truncate_all(attributes, 128)
```

## Handling Stack Traces

Stack traces are valuable for debugging but can be very long. Keep the top frames and truncate the rest:

```yaml
processors:
  transform/stack_traces:
    trace_statements:
      - context: span
        statements:
          # Truncate exception stacktrace to 2KB
          # This keeps the most relevant top frames
          - set(attributes["exception.stacktrace"], Substring(attributes["exception.stacktrace"], 0, 2048)) where attributes["exception.stacktrace"] != nil and Len(attributes["exception.stacktrace"]) > 2048

          # Mark that the stacktrace was truncated
          - set(attributes["exception.stacktrace.truncated"], true) where attributes["exception.stacktrace"] != nil and Len(attributes["exception.stacktrace"]) >= 2048
```

## Combining Truncation with Deletion

Sometimes it is better to delete an attribute entirely rather than truncate it:

```yaml
processors:
  transform/clean:
    trace_statements:
      - context: span
        statements:
          # Delete extremely large attributes rather than truncating
          # If db.statement is over 10KB, it is probably a bulk insert
          # and the truncated version is not useful
          - delete_key(attributes, "db.statement") where attributes["db.statement"] != nil and Len(attributes["db.statement"]) > 10240
          - set(attributes["db.statement.removed"], true) where attributes["db.statement"] == nil

          # For moderately large attributes, truncate
          - set(attributes["db.statement"], Substring(attributes["db.statement"], 0, 500)) where attributes["db.statement"] != nil and Len(attributes["db.statement"]) > 500

          # Truncate everything else
          - truncate_all(attributes, 256)
```

## Full Pipeline Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/size_limits:
    trace_statements:
      - context: span
        statements:
          # Large individual attributes
          - set(attributes["db.statement"], Substring(attributes["db.statement"], 0, 500)) where attributes["db.statement"] != nil and Len(attributes["db.statement"]) > 500
          - set(attributes["exception.stacktrace"], Substring(attributes["exception.stacktrace"], 0, 2048)) where attributes["exception.stacktrace"] != nil and Len(attributes["exception.stacktrace"]) > 2048

          # Catch-all truncation for all attributes
          - truncate_all(attributes, 1024)

    log_statements:
      - context: log
        statements:
          # Log body size limits by severity
          - set(body, Substring(body, 0, 8192)) where severity_number >= 17 and IsString(body) and Len(body) > 8192
          - set(body, Substring(body, 0, 2048)) where severity_number < 17 and IsString(body) and Len(body) > 2048

          # Log attribute truncation
          - truncate_all(attributes, 256)

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/size_limits, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [transform/size_limits, batch]
      exporters: [otlp]
```

## Cost Impact

Truncation directly reduces storage and network costs. If your average span has a 5KB `db.statement` attribute and you truncate it to 500 bytes, that is a 90% reduction in that attribute's size. Across millions of spans per day, the savings add up quickly.

Monitor the impact by tracking the `log.truncated` and related attributes you add during truncation. This tells you how often truncation is happening and whether your limits are too aggressive.

Truncation in the Collector is a simple, effective way to control telemetry data size. Apply broad limits with `truncate_all` and fine-grained limits with `Substring` on specific attributes that you know can grow large.
