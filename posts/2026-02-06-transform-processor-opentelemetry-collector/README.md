# How to Configure the Transform Processor in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Processors, Transform Processor, OTTL, Data Transformation, Advanced Configuration

Description: Learn how to configure the powerful transform processor in OpenTelemetry Collector using OTTL to modify, enrich, and reshape telemetry data with advanced transformations beyond simple attribute operations.

The transform processor is the most powerful and flexible data transformation component in the OpenTelemetry Collector. It uses OTTL (OpenTelemetry Transformation Language) to perform complex operations on telemetry data that go far beyond the capabilities of the attributes and resource processors.

While the attributes processor handles simple attribute modifications and the resource processor manages service-level metadata, the transform processor enables advanced transformations like conditional logic, mathematical operations, string manipulation, nested attribute access, and cross-field computations.

## Why Transform Processor Matters

Modern observability pipelines often need complex data transformations:

- **Conditional enrichment**: Add attributes based on complex conditions across multiple fields
- **Data parsing**: Extract structured data from unstructured strings
- **Mathematical operations**: Calculate derived metrics or normalize values
- **Complex sanitization**: Apply sophisticated PII masking logic
- **Schema migration**: Transform telemetry from one format to another
- **Cross-field operations**: Create new attributes based on multiple existing attributes

The transform processor handles these scenarios that simpler processors cannot address.

## Understanding OTTL (OpenTelemetry Transformation Language)

OTTL is a domain-specific language for telemetry transformations. It provides:

- **Path expressions**: Access nested fields (e.g., `attributes["http"]["status"]`)
- **Functions**: Built-in operations (e.g., `Concat`, `ParseJSON`, `SHA256`)
- **Operators**: Logical, arithmetic, and comparison operators
- **Conditions**: If-then logic for conditional transformations
- **Type system**: Handle strings, integers, floats, booleans, and complex types

OTTL expressions execute on individual telemetry items (spans, metrics, logs) as they flow through the processor.

## Basic Configuration

Here's a minimal transform processor configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Convert HTTP status code from string to int
          - set(attributes["http.status_code"], Int(attributes["http.status_code"]))

          # Add computed attribute
          - set(attributes["is_error"], status.code == STATUS_CODE_ERROR)

  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      x-oneuptime-token: "YOUR_TOKEN"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform, batch]
      exporters: [otlphttp]
```

This configuration demonstrates basic OTTL statements for type conversion and attribute computation.

## Core OTTL Contexts

OTTL operates in different contexts depending on the telemetry type:

### Trace Contexts

```yaml
processors:
  transform:
    trace_statements:
      # Span context: operates on individual spans
      - context: span
        statements:
          - set(attributes["custom"], "value")

      # SpanEvent context: operates on span events
      - context: spanevent
        statements:
          - set(attributes["event_custom"], "value")

      # Resource context: operates on resource attributes
      - context: resource
        statements:
          - set(attributes["resource_custom"], "value")
```

### Metric Contexts

```yaml
processors:
  transform:
    metric_statements:
      # Metric context: operates on metric metadata
      - context: metric
        statements:
          - set(description, "Updated description")

      # DataPoint context: operates on individual data points
      - context: datapoint
        statements:
          - set(attributes["dp_custom"], "value")

      # Resource context: resource attributes
      - context: resource
        statements:
          - set(attributes["resource_custom"], "value")
```

### Log Contexts

```yaml
processors:
  transform:
    log_statements:
      # LogRecord context: operates on log records
      - context: log
        statements:
          - set(attributes["log_custom"], "value")

      # Resource context: resource attributes
      - context: resource
        statements:
          - set(attributes["resource_custom"], "value")
```

## Essential OTTL Functions

### set() - Set Attribute Values

The most common operation, setting attribute values:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Set string attribute
          - set(attributes["environment"], "production")

          # Set from another attribute
          - set(attributes["method"], attributes["http.method"])

          # Set computed value
          - set(attributes["duration_ms"], duration / 1000000)
```

### Concat() - String Concatenation

Combine multiple strings:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Create full URL from parts
          - set(attributes["full_url"], Concat([attributes["http.scheme"], "://", attributes["http.host"], attributes["http.target"]]))

          # Create composite identifier
          - set(attributes["service_instance"], Concat([resource.attributes["service.name"], ":", resource.attributes["service.instance.id"]]))
```

### Int(), Double(), String() - Type Conversion

Convert between data types:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # String to integer
          - set(attributes["status_code_int"], Int(attributes["http.status_code"]))

          # Integer to string
          - set(attributes["status_code_str"], String(attributes["http.status_code"]))

          # String to float
          - set(attributes["latency"], Double(attributes["response_time"]))
```

### IsMatch() - Pattern Matching

Check if strings match patterns:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Check if URL matches pattern
          - set(attributes["is_api_call"], IsMatch(attributes["http.target"], "^/api/.*"))

          # Check if error message contains text
          - set(attributes["is_timeout"], IsMatch(attributes["error.message"], ".*timeout.*"))
```

### Substring() - String Extraction

Extract substrings:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Extract first 10 characters
          - set(attributes["short_id"], Substring(attributes["request.id"], 0, 10))

          # Extract domain from email
          - set(attributes["email_domain"], Substring(attributes["user.email"], IndexOf(attributes["user.email"], "@") + 1, Len(attributes["user.email"])))
```

### SHA256() - Hashing

Hash sensitive values:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Hash user ID
          - set(attributes["user.id_hash"], SHA256(attributes["user.id"]))

          # Hash email
          - set(attributes["user.email_hash"], SHA256(attributes["user.email"]))

          # Delete original sensitive values
          - delete_key(attributes, "user.id")
          - delete_key(attributes, "user.email")
```

### ParseJSON() - JSON Parsing

Parse JSON strings into structured data:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Parse JSON response body
          - set(attributes["parsed_response"], ParseJSON(attributes["http.response.body"]))

          # Access nested JSON fields
          - set(attributes["user_name"], attributes["parsed_response"]["user"]["name"])
```

### delete_key() - Remove Attributes

Delete attributes by key:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Delete sensitive attribute
          - delete_key(attributes, "password")

          # Delete temporary attribute
          - delete_key(attributes, "temp_value")
```

## Advanced Transformation Patterns

### Conditional Transformations

Apply transformations based on conditions:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Add error severity based on status code
          - set(attributes["severity"], "low") where attributes["http.status_code"] == "400"
          - set(attributes["severity"], "medium") where attributes["http.status_code"] == "404"
          - set(attributes["severity"], "high") where attributes["http.status_code"] == "500"
          - set(attributes["severity"], "critical") where attributes["http.status_code"] == "503"

          # Enrich only error spans
          - set(attributes["requires_attention"], true) where status.code == STATUS_CODE_ERROR

          # Add latency category
          - set(attributes["latency_category"], "fast") where duration < 100000000
          - set(attributes["latency_category"], "normal") where duration >= 100000000 and duration < 500000000
          - set(attributes["latency_category"], "slow") where duration >= 500000000
```

### URL Parsing and Normalization

Extract components from URLs:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Extract path without query parameters
          - set(attributes["http.path"], Substring(attributes["http.target"], 0, IndexOf(attributes["http.target"], "?", 0, 1))) where IndexOf(attributes["http.target"], "?", 0, 1) > 0
          - set(attributes["http.path"], attributes["http.target"]) where IndexOf(attributes["http.target"], "?", 0, 1) == -1

          # Extract query string
          - set(attributes["http.query"], Substring(attributes["http.target"], IndexOf(attributes["http.target"], "?") + 1, Len(attributes["http.target"]))) where IndexOf(attributes["http.target"], "?") > 0

          # Normalize path (replace UUIDs with placeholder)
          - set(attributes["http.path_normalized"], ReplaceAllPatterns(attributes["http.path"], "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}", "{uuid}"))
```

### Multi-Attribute Computation

Create new attributes from multiple sources:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Create request signature
          - set(attributes["request_signature"], SHA256(Concat([attributes["http.method"], "|", attributes["http.path"], "|", attributes["user.id"]])))

          # Calculate success rate indicator
          - set(attributes["is_successful"], attributes["http.status_code"] >= "200" and attributes["http.status_code"] < "400")

          # Create composite key
          - set(attributes["service_endpoint"], Concat([resource.attributes["service.name"], ":", attributes["http.method"], " ", attributes["http.path"]]))
```

### Nested JSON Field Access

Work with complex JSON structures:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Parse JSON payload
          - set(attributes["payload"], ParseJSON(attributes["http.request.body"]))

          # Extract nested fields
          - set(attributes["user_id"], attributes["payload"]["user"]["id"])
          - set(attributes["action"], attributes["payload"]["action"]["type"])
          - set(attributes["timestamp"], attributes["payload"]["metadata"]["timestamp"])

          # Delete original body to save space
          - delete_key(attributes, "http.request.body")
```

### Error Classification

Categorize errors based on multiple factors:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Initialize error category
          - set(attributes["error.category"], "unknown") where status.code == STATUS_CODE_ERROR

          # Classify client errors
          - set(attributes["error.category"], "client_error") where status.code == STATUS_CODE_ERROR and attributes["http.status_code"] >= "400" and attributes["http.status_code"] < "500"

          # Classify server errors
          - set(attributes["error.category"], "server_error") where status.code == STATUS_CODE_ERROR and attributes["http.status_code"] >= "500"

          # Classify timeout errors
          - set(attributes["error.category"], "timeout") where status.code == STATUS_CODE_ERROR and IsMatch(status.message, ".*timeout.*")

          # Classify connection errors
          - set(attributes["error.category"], "connection") where status.code == STATUS_CODE_ERROR and IsMatch(status.message, ".*(connection|refused|reset).*")
```

### PII Masking with Transform Logic

Advanced PII sanitization:

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Mask email (keep domain)
          - set(attributes["user.email_masked"], Concat(["***@", Substring(attributes["user.email"], IndexOf(attributes["user.email"], "@") + 1, Len(attributes["user.email"]))])) where attributes["user.email"] != nil
          - delete_key(attributes, "user.email")

          # Mask credit card (keep last 4 digits)
          - set(attributes["payment.card_masked"], Concat(["****-****-****-", Substring(attributes["payment.card"], Len(attributes["payment.card"]) - 4, 4)])) where attributes["payment.card"] != nil
          - delete_key(attributes, "payment.card")

          # Hash IP addresses
          - set(attributes["client.ip_hash"], SHA256(attributes["client.ip"])) where attributes["client.ip"] != nil
          - delete_key(attributes, "client.ip")
```

## Metrics-Specific Transformations

### Metric Name Normalization

Standardize metric naming:

```yaml
processors:
  transform:
    metric_statements:
      - context: metric
        statements:
          # Replace dots with underscores
          - set(name, ReplaceAll(name, ".", "_"))

          # Convert to lowercase
          - set(name, LowerCase(name))

          # Add prefix
          - set(name, Concat(["app_", name]))
```

### Data Point Enrichment

Add computed fields to metric data points:

```yaml
processors:
  transform:
    metric_statements:
      - context: datapoint
        statements:
          # Add percentile indicator
          - set(attributes["is_high_value"], value_double > 90.0)

          # Add time-based context
          - set(attributes["hour_of_day"], Hour(time_unix_nano))

          # Normalize to percentage
          - set(value_double, value_double * 100) where attributes["metric.unit"] == "ratio"
```

## Log-Specific Transformations

### Log Parsing and Enrichment

Extract structured data from log bodies:

```yaml
processors:
  transform:
    log_statements:
      - context: log
        statements:
          # Parse JSON log body
          - set(attributes["parsed"], ParseJSON(body)) where IsMatch(body, "^\\{.*\\}$")

          # Extract severity from body
          - set(severity_text, attributes["parsed"]["level"]) where attributes["parsed"]["level"] != nil

          # Extract timestamp
          - set(attributes["log_timestamp"], attributes["parsed"]["timestamp"]) where attributes["parsed"]["timestamp"] != nil

          # Extract message
          - set(body, attributes["parsed"]["message"]) where attributes["parsed"]["message"] != nil
```

### Log Level Normalization

Standardize log levels across sources:

```yaml
processors:
  transform:
    log_statements:
      - context: log
        statements:
          # Normalize to standard levels
          - set(severity_text, "ERROR") where severity_text == "ERR" or severity_text == "SEVERE"
          - set(severity_text, "WARN") where severity_text == "WARNING"
          - set(severity_text, "INFO") where severity_text == "INFORMATION"
          - set(severity_text, "DEBUG") where severity_text == "DBG" or severity_text == "TRACE"
```

## Performance Considerations

Transform processor operations have performance implications:

### Efficient Patterns

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Simple operations are fast
          - set(attributes["env"], "prod")
          - set(attributes["version"], resource.attributes["service.version"])
```

### Expensive Patterns

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # JSON parsing is expensive (only parse when necessary)
          - set(attributes["parsed"], ParseJSON(attributes["large_body"]))

          # Complex regex operations are expensive
          - set(attributes["normalized"], ReplaceAllPatterns(attributes["url"], "very-complex-regex-pattern", "replacement"))

          # Cryptographic operations are expensive (hash only when needed)
          - set(attributes["hash"], SHA256(Concat([attributes["a"], attributes["b"], attributes["c"]])))
```

**Best practices**:
1. Use conditional `where` clauses to limit expensive operations
2. Parse JSON only when the field exists and needs parsing
3. Minimize cryptographic operations
4. Place transform processor after filter to reduce items processed
5. Test performance impact under realistic load

## Monitoring Transform Processor

Track transform processor performance and errors:

```bash
# Query collector metrics
curl http://localhost:8888/metrics | grep transform

# Key metrics:
# - otelcol_processor_accepted_spans: Spans processed successfully
# - otelcol_processor_refused_spans: Spans rejected due to errors
```

Enable error logging to debug transformation issues:

```yaml
processors:
  transform:
    error_mode: propagate  # Fail pipeline on error (for testing)
    # error_mode: ignore   # Log error and continue (for production)

    trace_statements:
      - context: span
        statements:
          - set(attributes["status_int"], Int(attributes["http.status_code"]))

service:
  telemetry:
    logs:
      level: debug  # Show detailed transform errors
```

## Common Pitfalls and Solutions

### Pitfall 1: Type Conversion Errors

**Problem**: Attempting to convert invalid string to integer:

```yaml
# WRONG: Crashes if status_code is non-numeric
- set(attributes["status_int"], Int(attributes["http.status_code"]))
```

**Solution**: Add conditional check:

```yaml
# CORRECT: Only convert if value is numeric
- set(attributes["status_int"], Int(attributes["http.status_code"])) where IsMatch(attributes["http.status_code"], "^[0-9]+$")
```

### Pitfall 2: Null Reference Errors

**Problem**: Accessing attribute that doesn't exist:

```yaml
# WRONG: Crashes if user.email doesn't exist
- set(attributes["domain"], Substring(attributes["user.email"], IndexOf(attributes["user.email"], "@") + 1, Len(attributes["user.email"])))
```

**Solution**: Add existence check:

```yaml
# CORRECT: Only process if attribute exists
- set(attributes["domain"], Substring(attributes["user.email"], IndexOf(attributes["user.email"], "@") + 1, Len(attributes["user.email"]))) where attributes["user.email"] != nil
```

### Pitfall 3: Overwriting Important Attributes

**Problem**: Accidentally overwriting critical attributes:

```yaml
# WRONG: Overwrites all span names
- set(name, "generic_span")
```

**Solution**: Use conditional logic:

```yaml
# CORRECT: Only set name if not already set
- set(name, "default_span") where name == ""
```

## Testing Transform Processor Configuration

Validate transformations thoroughly:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Test transformation
          - set(attributes["test_transform"], Concat(["prefix_", attributes["original"]]))
          - set(attributes["status_int"], Int(attributes["http.status_code"])) where IsMatch(attributes["http.status_code"], "^[0-9]+$")

exporters:
  logging:
    verbosity: detailed  # Shows all attributes

service:
  telemetry:
    logs:
      level: debug  # Shows transformation errors

  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform]
      exporters: [logging]
```

Send test data and verify transformations in logs.

## Production Checklist

Before deploying transform processor to production:

- [ ] All OTTL statements tested with representative data
- [ ] Null checks added for attributes that might not exist
- [ ] Type conversions protected with pattern validation
- [ ] Expensive operations (JSON parsing, hashing) conditionalized
- [ ] Error mode set to `ignore` for production resilience
- [ ] Transform processor placed after filter processor
- [ ] Performance tested under realistic load
- [ ] Logging configured to capture transformation errors
- [ ] Monitoring configured for refused spans/metrics/logs
- [ ] Backup plan for rolling back if issues arise

## Key Takeaways

The transform processor is the most powerful data transformation tool in the OpenTelemetry Collector, enabling complex operations beyond simple attribute modifications through OTTL.

Use it for conditional enrichment, data parsing, mathematical operations, advanced PII masking, and cross-field computations. Always test transformations thoroughly and add null checks to prevent runtime errors.

Place the transform processor after the filter processor to minimize the number of items requiring expensive transformations, and monitor for refused telemetry that indicates transformation errors.

**Related Reading:**

- [How to Configure the Attributes Processor in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-attributes-processor-opentelemetry-collector/view)
- [How to Configure the Filter Processor in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-filter-processor-opentelemetry-collector/view)
- [How to reduce noise in OpenTelemetry?](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
