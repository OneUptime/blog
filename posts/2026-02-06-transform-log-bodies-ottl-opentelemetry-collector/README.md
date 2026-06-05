# How to Transform Log Bodies Using OTTL in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, OTTL, Processor, Log Processing, Transform Processor

Description: Learn how to transform log bodies using OpenTelemetry Transformation Language (OTTL) in the OpenTelemetry Collector with practical examples and YAML configurations.

The OpenTelemetry Transformation Language (OTTL) provides powerful capabilities for manipulating telemetry data within the OpenTelemetry Collector. One of the most common use cases is transforming log bodies to extract structured information, redact sensitive data, or normalize log formats across different sources.

## Understanding OTTL and the Transform Processor

OTTL is a domain-specific language designed specifically for transforming telemetry data in the OpenTelemetry Collector. The transform processor implements OTTL and allows you to apply transformations to logs, metrics, and traces as they pass through the collector pipeline.

For log transformations, OTTL provides access to the log record's body, attributes, resource attributes, and other metadata. The body of a log can be a simple string or a complex nested structure, and OTTL provides functions to work with both.

## Basic Log Body Transformation

Here's a simple example that converts all log bodies to uppercase:

```yaml
# Basic transformation to uppercase log bodies

processors:
  transform:
    error_mode: ignore
    log_statements:
      # Convert the log body to uppercase
      - set(log.body, ConvertCase(log.body, "upper")) where IsString(log.body)
```

The `set` function modifies a field, while `ConvertCase` converts text to uppercase.

## Extracting Information from Log Bodies

A common scenario is extracting specific information from unstructured log bodies into attributes for easier querying and filtering.

```yaml
# Extract error codes from log bodies
processors:
  transform:
    error_mode: ignore
    log_statements:
      # Extract error code from logs like "Error: ERR_500 - Internal Server Error"
      # This uses a named regex capture group to find patterns like ERR_XXX
      - merge_maps(log.attributes, ExtractPatterns(log.body, ".*(?P<error_code>ERR_\\d+).*"), "upsert") where IsString(log.body) and IsMatch(log.body, "ERR_\\d+")

      # Extract the severity level if present in the body
      - merge_maps(log.attributes, ExtractPatterns(log.body, ".*(?P<extracted_severity>ERROR|WARN|INFO|DEBUG).*"), "upsert") where IsString(log.body) and IsMatch(log.body, "(ERROR|WARN|INFO|DEBUG)")

      # Add a flag attribute if the log contains an error
      - set(log.attributes["has_error"], true) where IsString(log.body) and IsMatch(log.body, "(?i)error")
```

This configuration extracts structured information from free-form log bodies and stores them as attributes, making the logs more searchable and analyzable.

## Redacting Sensitive Information

Security and compliance often require removing or masking sensitive data from logs before they are stored or exported.

```yaml
# Redact sensitive information from log bodies
processors:
  transform:
    error_mode: ignore
    log_statements:
      # Redact credit card numbers (basic pattern)
      - replace_pattern(log.body, "\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b", "****-****-****-****") where IsString(log.body)

      # Redact email addresses
      - replace_pattern(log.body, "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b", "[EMAIL_REDACTED]") where IsString(log.body)

      # Redact API keys (assuming format: api_key=xxxxx)
      - replace_pattern(log.body, "api_key=[A-Za-z0-9]+", "api_key=[REDACTED]") where IsString(log.body)

      # Redact IP addresses
      - replace_pattern(log.body, "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b", "[IP_REDACTED]") where IsString(log.body)
```

The `replace_pattern` function uses regular expressions to find and replace sensitive data patterns in the log body.

## Working with Structured Log Bodies

When logs arrive as structured data (like JSON), you can access nested fields directly.

```yaml
# Transform structured log bodies
processors:
  transform:
    error_mode: ignore
    log_statements:
      # Access nested fields in a JSON log body
      # Assuming body is {"level": "error", "message": "Failed", "user": {"id": 123}}
      - set(log.attributes["user_id"], log.body["user"]["id"]) where IsMap(log.body) and log.body["user"] != nil

      # Extract the message to a top-level attribute
      - set(log.attributes["log_message"], log.body["message"]) where IsMap(log.body)

      # Modify the body to remove sensitive user info
      - delete_key(log.body, "user") where IsMap(log.body)

      # Add computed fields to the body
      - set(log.body["processed_at"], UnixMicro(Now())) where IsMap(log.body)
```

This approach works when the log body is already parsed as a structured object (map). If your logs arrive as JSON strings, you need to parse them first using the JSON parsing capabilities covered in a related post on [parsing JSON logs with OTTL](https://oneuptime.com/blog/post/2026-02-06-parse-json-logs-ottl-opentelemetry-collector/view).

## Normalizing Log Bodies Across Sources

Different log sources often use different formats. OTTL allows you to normalize these into a consistent format.

```yaml
# Normalize log bodies from different sources
processors:
  transform:
    error_mode: ignore
    log_statements:
      # For nginx logs, extract status code from body pattern
      # Example: "GET /api/users 200 1.234ms"
      - merge_maps(log.cache, ExtractPatterns(log.body, ".*\\s(?P<status_code>\\d{3})\\s.*"), "upsert") where resource.attributes["service.name"] == "nginx" and IsString(log.body) and IsMatch(log.body, "\\s\\d{3}\\s")
      - set(log.attributes["http.status_code"], log.cache["status_code"]) where log.cache["status_code"] != nil

      # For application logs, status might already be in attributes
      # Ensure all logs have status_code in the same attribute
      - set(log.attributes["http.status_code"], log.attributes["status"]) where log.attributes["status"] != nil and log.attributes["http.status_code"] == nil

      # Normalize the body format to include timestamp and level
      - set(log.body, Concat([String(Now()), " [", String(log.severity_text), "] ", log.body], "")) where IsString(log.body)
```

This configuration demonstrates conditional transformations using the `where` clause, which is covered in more detail in the post about [conditional logic in OTTL](https://oneuptime.com/blog/post/2026-02-06-conditional-logic-ottl-opentelemetry-collector/view).

## Enriching Log Bodies with Context

You can add contextual information to log bodies to make them more informative.

```yaml
# Enrich log bodies with additional context
processors:
  transform:
    error_mode: ignore
    log_statements:
      # Prepend service name to log body
      - set(log.body, Concat(["[", resource.attributes["service.name"], "] ", log.body], "")) where IsString(log.body) and resource.attributes["service.name"] != nil

      # Add trace context to logs when available
      - set(log.body, Concat([log.body, " | trace_id=", log.trace_id], "")) where IsString(log.body) and log.trace_id != nil

      # Add environment information
      - set(log.body, Concat([log.body, " | env=", resource.attributes["deployment.environment"]], "")) where IsString(log.body) and resource.attributes["deployment.environment"] != nil
```

## Complete Pipeline Example

Here's a complete OpenTelemetry Collector configuration that demonstrates log body transformation in a realistic pipeline:

```yaml
# Complete collector configuration with log body transformations
receivers:
  # Receive logs via OTLP protocol
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Receive logs from files
  filelog:
    include:
      - /var/log/app/*.log
    operators:
      # Parse as JSON if possible
      - type: json_parser
        parse_from: body
        if: body matches "^\\{"

processors:
  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

  # Batch logs for efficiency
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Transform log bodies
  transform:
    error_mode: ignore
    log_statements:
      # Redact sensitive data
      - replace_pattern(log.body, "password=[^&\\s]+", "password=[REDACTED]") where IsString(log.body)
      - replace_pattern(log.body, "token=[^&\\s]+", "token=[REDACTED]") where IsString(log.body)

      # Extract error codes to attributes
      - merge_maps(log.attributes, ExtractPatterns(log.body, ".*(?P<error_code>ERR_\\d+).*"), "upsert") where IsString(log.body) and IsMatch(log.body, "ERR_\\d+")

      # Add service context to body
      - set(log.body, Concat(["[", resource.attributes["service.name"], "] ", log.body], "")) where IsString(log.body) and resource.attributes["service.name"] != nil

      # Normalize severity mentions in body
      - replace_pattern(log.body, "(?i)\\[error\\]", "[ERROR]") where IsString(log.body)
      - replace_pattern(log.body, "(?i)\\[warn\\]", "[WARN]") where IsString(log.body)
      - replace_pattern(log.body, "(?i)\\[info\\]", "[INFO]") where IsString(log.body)

exporters:
  # Export to OTLP endpoint
  otlp:
    endpoint: https://your-backend:4317
    tls:
      insecure: false

  # Debug exporter for testing
  debug:
    verbosity: detailed

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [memory_limiter, transform, batch]
      exporters: [otlp, debug]
```

## Transformation Flow Diagram

Here's how log body transformations flow through the collector:

```mermaid
graph LR
    A[Log Source] --> B[Receiver]
    B --> C[Transform Processor]
    C --> D{Check Conditions}
    D -->|Match| E[Apply Transformations]
    D -->|No Match| F[Skip]
    E --> G[Modified Body]
    F --> G
    G --> H[Next Processor]
    H --> I[Exporter]
    I --> J[Destination]

    style C fill:#4CAF50
    style E fill:#2196F3
    style G fill:#FF9800
```

## Best Practices for Log Body Transformations

1. **Transform Early in the Pipeline**: Apply transformations as early as possible to ensure consistent data throughout the pipeline.

2. **Use Specific Patterns**: When using regex for extraction or replacement, be as specific as possible to avoid unintended matches.

3. **Test Thoroughly**: Use the [OTTL Playground](https://oneuptime.com/blog/post/2026-02-06-ottl-playground-test-opentelemetry-collector/view) to test your transformations before deploying to production.

4. **Consider Performance**: Complex regex operations and multiple transformations can impact performance. Monitor your collector's resource usage.

5. **Document Your Transformations**: Add comments to your OTTL statements explaining what each transformation does and why.

6. **Handle Nil Values**: Always check for nil values before accessing nested fields to prevent errors.

7. **Preserve Original Data When Needed**: If you need to keep the original body, copy it to an attribute before transforming.

## Common Pitfalls to Avoid

1. **Overly Broad Regex**: Using patterns like `.*` can match more than intended and lead to data loss.

2. **Ignoring Data Types**: OTTL is strongly typed. Ensure you use appropriate conversion functions when needed.

3. **Modifying Resource Attributes**: Be cautious when modifying resource attributes as they affect all telemetry from that resource.

4. **Forgetting to Handle Errors**: Use conditional statements to handle cases where expected data is missing.

## Conclusion

Transforming log bodies with OTTL in the OpenTelemetry Collector provides a powerful way to normalize, enrich, and secure your log data. By extracting structured information, redacting sensitive data, and normalizing formats, you can make your logs more valuable for observability and troubleshooting.

The transform processor's flexibility allows you to handle diverse log formats and implement complex transformation logic without writing custom code. Combined with other OTTL capabilities like [attribute modification](https://oneuptime.com/blog/post/2026-02-06-rename-modify-attributes-ottl-opentelemetry-collector/view) and [conditional logic](https://oneuptime.com/blog/post/2026-02-06-conditional-logic-ottl-opentelemetry-collector/view), you can build sophisticated log processing pipelines that meet your specific requirements.

For more information on OTTL and the transform processor, refer to the [OpenTelemetry Collector documentation](https://opentelemetry.io/docs/collector/transforming-telemetry/).
