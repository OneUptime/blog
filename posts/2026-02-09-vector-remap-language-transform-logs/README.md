# How to Use Vector Remap Language to Transform Kubernetes Log Formats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vector, Kubernetes, Logging

Description: Master Vector Remap Language (VRL) to transform, enrich, and normalize Kubernetes log data with powerful expressions and built-in functions.

---

Vector Remap Language (VRL) is a purpose-built language for transforming observability data. Unlike general-purpose scripting languages, VRL is designed specifically for log transformation with safety guarantees, predictable performance, and intuitive syntax. When processing Kubernetes logs, VRL enables you to parse, enrich, filter, and reshape log data without the overhead of external processors.

This guide explores practical VRL techniques for transforming Kubernetes logs in Vector pipelines.

## Understanding Vector Remap Language

VRL is a strongly-typed, memory-safe language that compiles to efficient bytecode. Key features include:

- **Type safety**: Catches errors at compile time
- **Null safety**: Explicit handling of missing fields
- **Immutability**: Prevents accidental data corruption
- **Rich standard library**: Built-in functions for common transformations
- **Kubernetes-aware**: Native understanding of Kubernetes metadata

VRL transforms are applied using the `remap` transform in Vector configuration.

## Basic VRL Transform Configuration

Create a Vector configuration with a remap transform:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-config
  namespace: logging
data:
  vector.toml: |
    [sources.kubernetes]
    type = "kubernetes_logs"

    [transforms.parse_and_enrich]
    type = "remap"
    inputs = ["kubernetes"]
    source = '''
      # Parse JSON log field
      .parsed = parse_json!(.message)

      # Extract level and set default
      .level = .parsed.level ?? "info"

      # Add timestamp if missing
      if !exists(.timestamp) {
        .timestamp = now()
      }

      # Normalize log message
      .log_message = .parsed.message ?? .message

      # Add cluster identifier
      .cluster = "production-us-east-1"
    '''

    [sinks.loki]
    type = "loki"
    inputs = ["parse_and_enrich"]
    endpoint = "http://loki:3100"
    encoding.codec = "json"
```

## Parsing Different Log Formats

Handle multiple log formats with conditional parsing:

```toml
[transforms.multi_format_parser]
type = "remap"
inputs = ["kubernetes"]
source = '''
  # Try JSON parsing first
  parsed, err = parse_json(.message)

  if err == null {
    # JSON parsing succeeded
    .level = parsed.level ?? "info"
    .timestamp = parse_timestamp(parsed.timestamp, "%Y-%m-%dT%H:%M:%S%.fZ") ?? now()
    .message = parsed.message ?? parsed.msg
    .service = parsed.service
  } else {
    # Try logfmt parsing
    parsed, err = parse_logfmt(.message)

    if err == null {
      .level = parsed.level ?? "info"
      .message = parsed.msg ?? .message
      .service = parsed.service
    } else {
      # Try syslog parsing
      parsed, err = parse_syslog(.message)

      if err == null {
        .level = to_string(parsed.severity) ?? "info"
        .message = parsed.message
      } else {
        # Default: treat as plain text
        .level = "info"
        .message = .message
      }
    }
  }

  # Normalize log level
  .level = downcase(.level)
  if contains(["error", "err", "fatal", "critical"], .level) {
    .level = "error"
  } else if contains(["warn", "warning"], .level) {
    .level = "warn"
  } else if contains(["debug", "trace"], .level) {
    .level = "debug"
  } else {
    .level = "info"
  }
'''
```

## Enriching Logs with Kubernetes Metadata

Extract and enhance Kubernetes metadata:

```toml
[transforms.enrich_kubernetes]
type = "remap"
inputs = ["kubernetes"]
source = '''
  # Extract Kubernetes labels as structured data
  .k8s.namespace = .kubernetes.pod_namespace
  .k8s.pod = .kubernetes.pod_name
  .k8s.container = .kubernetes.container_name
  .k8s.node = .kubernetes.pod_node_name

  # Parse pod name to extract deployment/statefulset info
  pod_parts = split(.k8s.pod, "-")
  if length(pod_parts) > 2 {
    # Remove last two parts (replica hash and pod ordinal)
    .k8s.workload = join!(slice(pod_parts, 0, length(pod_parts) - 2), "-")
  }

  # Extract deployment info from labels
  if exists(.kubernetes.pod_labels."app.kubernetes.io/name") {
    .k8s.app = .kubernetes.pod_labels."app.kubernetes.io/name"
  }

  if exists(.kubernetes.pod_labels."app.kubernetes.io/version") {
    .k8s.version = .kubernetes.pod_labels."app.kubernetes.io/version"
  }

  # Add environment from namespace convention
  if starts_with(.k8s.namespace, "prod") {
    .environment = "production"
  } else if starts_with(.k8s.namespace, "stag") {
    .environment = "staging"
  } else if starts_with(.k8s.namespace, "dev") {
    .environment = "development"
  } else {
    .environment = "unknown"
  }

  # Generate unique request ID if not present
  if !exists(.request_id) {
    .request_id = uuid_v4()
  }
'''
```

## Extracting Structured Data from Unstructured Logs

Use regex and pattern matching to parse unstructured logs:

```toml
[transforms.parse_nginx_logs]
type = "remap"
inputs = ["kubernetes"]
source = '''
  # Parse NGINX access log format
  parsed, err = parse_regex(
    .message,
    r'^(?P<remote_addr>[^ ]+) - (?P<remote_user>[^ ]+) \[(?P<time_local>[^\]]+)\] "(?P<request_method>[^ ]+) (?P<request_uri>[^ ]+) (?P<server_protocol>[^"]+)" (?P<status>\d+) (?P<body_bytes_sent>\d+) "(?P<http_referer>[^"]*)" "(?P<http_user_agent>[^"]*)" "(?P<http_x_forwarded_for>[^"]*)"$'
  )

  if err == null {
    .http.remote_addr = parsed.remote_addr
    .http.method = parsed.request_method
    .http.uri = parsed.request_uri
    .http.status = to_int!(parsed.status)
    .http.bytes = to_int!(parsed.body_bytes_sent)
    .http.user_agent = parsed.http_user_agent
    .http.referer = parsed.http_referer

    # Parse query parameters from URI
    uri_parts = split(parsed.request_uri, "?")
    .http.path = uri_parts[0]

    if length(uri_parts) > 1 {
      query_params = parse_query_string(uri_parts[1]) ?? {}
      .http.query_params = query_params
    }

    # Categorize status code
    if .http.status >= 500 {
      .level = "error"
      .http.status_category = "5xx"
    } else if .http.status >= 400 {
      .level = "warn"
      .http.status_category = "4xx"
    } else if .http.status >= 300 {
      .level = "info"
      .http.status_category = "3xx"
    } else {
      .level = "info"
      .http.status_category = "2xx"
    }
  }
'''
```

## Conditional Transformations Based on Content

Apply different transformations based on log content:

```toml
[transforms.conditional_processing]
type = "remap"
inputs = ["kubernetes"]
source = '''
  # Parse base JSON
  parsed = parse_json!(.message)

  # Common fields
  .level = downcase(parsed.level ?? "info")
  .timestamp = parse_timestamp(parsed.timestamp, "%+") ?? now()

  # Process based on service type
  .service = parsed.service ?? "unknown"

  if .service == "api" {
    # API-specific processing
    .http.method = parsed.http_method
    .http.path = parsed.http_path
    .http.status = to_int(parsed.http_status) ?? 0
    .http.duration_ms = to_float(parsed.duration_ms) ?? 0.0

    # Categorize API response time
    if .http.duration_ms > 1000 {
      .performance = "slow"
      .level = "warn"
    } else if .http.duration_ms > 500 {
      .performance = "medium"
    } else {
      .performance = "fast"
    }

  } else if .service == "database" {
    # Database-specific processing
    .db.operation = parsed.operation
    .db.table = parsed.table
    .db.duration_ms = to_float(parsed.duration_ms) ?? 0.0
    .db.rows_affected = to_int(parsed.rows_affected) ?? 0

  } else if .service == "worker" {
    # Worker-specific processing
    .job.name = parsed.job_name
    .job.duration_s = to_float(parsed.duration_s) ?? 0.0
    .job.status = parsed.status ?? "unknown"

    if .job.status == "failed" {
      .level = "error"
    }
  }

  # Extract error details if present
  if exists(parsed.error) {
    .error.message = parsed.error.message ?? parsed.error
    .error.type = parsed.error.type ?? "UnknownError"
    .error.stack_trace = parsed.error.stack_trace

    # Extract error from Java exceptions
    if contains(.error.type, "Exception") {
      .error.language = "java"
    }
  }
'''
```

## Aggregating and Computing Metrics

Calculate derived fields and aggregations:

```toml
[transforms.compute_metrics]
type = "remap"
inputs = ["kubernetes"]
source = '''
  parsed = parse_json!(.message)

  # Calculate request rate metrics
  .metrics.request_count = 1

  # Compute percentile bucket for latency
  duration = to_float(parsed.duration_ms) ?? 0.0

  if duration <= 100 {
    .metrics.latency_bucket = "p50"
  } else if duration <= 200 {
    .metrics.latency_bucket = "p75"
  } else if duration <= 500 {
    .metrics.latency_bucket = "p90"
  } else if duration <= 1000 {
    .metrics.latency_bucket = "p95"
  } else {
    .metrics.latency_bucket = "p99"
  }

  # Calculate bytes per second
  bytes = to_int(parsed.bytes_sent) ?? 0
  .metrics.throughput_bps = bytes / (duration / 1000.0)

  # Detect anomalies
  if duration > 5000 {
    .anomaly = "high_latency"
    .level = "warn"
  }

  if bytes > 10000000 {  # 10MB
    .anomaly = "large_response"
    .level = "info"
  }
'''
```

## Redacting Sensitive Information

Remove or mask sensitive data from logs:

```toml
[transforms.redact_sensitive]
type = "remap"
inputs = ["kubernetes"]
source = '''
  # Parse log message
  parsed = parse_json!(.message)

  # Redact credit card numbers
  if exists(parsed.credit_card) {
    parsed.credit_card = "REDACTED"
  }

  # Redact email addresses
  if exists(parsed.email) {
    parsed.email = redact_email(parsed.email)
  }

  # Redact passwords from URLs
  if exists(parsed.url) {
    parsed.url = redact(parsed.url, patterns: [r'password=([^&]+)'], replacement: "password=***")
  }

  # Redact API keys
  if exists(parsed.headers) {
    if exists(parsed.headers.authorization) {
      parsed.headers.authorization = "Bearer REDACTED"
    }

    if exists(parsed.headers."x-api-key") {
      parsed.headers."x-api-key" = "REDACTED"
    }
  }

  # Mask IP addresses (keep first two octets)
  if exists(parsed.client_ip) {
    ip_parts = split(parsed.client_ip, ".")
    if length(ip_parts) == 4 {
      parsed.client_ip = join!([ip_parts[0], ip_parts[1], "xxx", "xxx"], ".")
    }
  }

  # Remove entire sensitive fields
  parsed = remove(parsed, ["ssn", "password", "secret"])

  .message = encode_json(parsed)
'''
```

## Error Handling in VRL

Handle errors gracefully:

```toml
[transforms.safe_parsing]
type = "remap"
inputs = ["kubernetes"]
source = '''
  # Infallible parsing with fallbacks
  parsed, err = parse_json(.message)

  if err != null {
    # Log parsing error
    .parse_error = err
    .parsed = { "message": .message }
    .level = "warn"
  } else {
    .parsed = parsed
  }

  # Safe field access with defaults
  .level = .parsed.level ?? "info"
  .service = .parsed.service ?? "unknown"

  # Safe type conversions
  status_code, err = to_int(.parsed.status_code)
  if err != null {
    .http.status = 0
    .http.status_invalid = true
  } else {
    .http.status = status_code
  }

  # Validate required fields
  required_fields = ["service", "level", "message"]
  missing = []

  for field in required_fields {
    if !exists(.parsed[field]) {
      missing = push(missing, field)
    }
  }

  if length(missing) > 0 {
    .validation_error = join!(missing, ", ") + " missing"
  }
'''
```

## Performance Optimization in VRL

Write efficient VRL transformations:

```toml
[transforms.optimized]
type = "remap"
inputs = ["kubernetes"]
source = '''
  # Cache expensive operations
  msg = .message

  # Early returns for filtering
  if contains(msg, "healthcheck") {
    abort  # Skip processing for health checks
  }

  # Parse once, use many times
  parsed = parse_json!(msg)

  # Use direct field access instead of function calls
  .level = parsed.level ?? "info"
  .svc = parsed.service ?? "unknown"

  # Avoid unnecessary string operations
  if .level == "error" {  # Direct comparison
    .needs_alert = true
  }

  # Batch field assignments
  . = merge(., {
    "environment": "production",
    "cluster": "us-east-1",
    "version": "v2"
  })
'''
```

## Testing VRL Transformations

Test VRL code with the Vector CLI:

```bash
# Create test input
cat > test-log.json << EOF
{
  "message": "{\"level\":\"error\",\"service\":\"api\",\"duration_ms\":1500}",
  "kubernetes": {
    "pod_name": "api-deployment-abc123",
    "pod_namespace": "production"
  }
}
EOF

# Test VRL transform
vector vrl test-log.json <<EOF
parsed = parse_json!(.message)
.level = parsed.level
.duration_ms = to_float(parsed.duration_ms)
if .duration_ms > 1000 { .slow = true }
.
EOF
```

## Conclusion

Vector Remap Language provides a powerful, safe, and performant way to transform Kubernetes logs. Its type safety prevents runtime errors, while its rich standard library handles common transformations elegantly. Start with simple transforms and gradually add complexity as needed. Always test VRL code with representative data before deploying to production, and monitor transformation performance to ensure your pipeline keeps up with log volume.
