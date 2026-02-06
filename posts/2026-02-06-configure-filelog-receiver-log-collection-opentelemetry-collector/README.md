# How to Configure the Filelog Receiver for Log Collection in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Filelog, Receiver, Logs, File Parsing

Description: Master the Filelog Receiver in OpenTelemetry Collector to collect, parse, and transform logs from files with advanced operators for JSON, regex, and multiline processing.

The Filelog Receiver is the most versatile log collection component in the OpenTelemetry Collector. It reads logs from files on disk, parses them into structured format, and forwards them through the collector pipeline. Whether you're working with JSON logs, plain text, multiline stack traces, or custom application formats, the Filelog Receiver handles them all through its operator-based processing pipeline.

## Why File-Based Log Collection Still Matters

Despite the rise of structured logging and direct OTLP export, file-based log collection remains relevant. Many applications still write to stdout/stderr (captured to files by container runtimes), legacy systems output to traditional log files, and the 12-factor app methodology encourages treating logs as event streams written to stdout. The Filelog Receiver bridges these applications into modern observability platforms.

Container orchestration platforms like Kubernetes redirect container stdout/stderr to files on the host. Without file-based log collection, you'd miss these logs entirely. The Filelog Receiver provides a reliable, standardized way to collect these logs and transform them into OpenTelemetry log format.

## Understanding Operators

The Filelog Receiver uses an operator pipeline concept. Each operator performs a specific transformation on log entries as they flow through the pipeline. This design is powerful because you can chain operators to build complex parsing logic from simple, reusable components.

Common operator types include:

- **Input operators**: Read logs from sources (file input, stdin, syslog)
- **Parser operators**: Extract structure from unstructured text (JSON, regex, CSV)
- **Transform operators**: Modify log attributes, add fields, route logs
- **Output operators**: Send logs to the collector pipeline

Here's how operators flow:

```mermaid
graph LR
    A[Log File] --> B[File Input Operator]
    B --> C[JSON Parser Operator]
    C --> D[Severity Parser Operator]
    D --> E[Transform Operator]
    E --> F[Collector Pipeline]
```

## Basic Configuration

Start with a simple configuration that reads from a single log file:

```yaml
# Basic configuration to read JSON logs from a file
# This assumes each line is a complete JSON object
receivers:
  filelog:
    include:
      - /var/log/application.log
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%d %H:%M:%S'

processors:
  batch:
    timeout: 10s

exporters:
  logging:
    loglevel: debug

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [batch]
      exporters: [logging]
```

This configuration reads from `/var/log/application.log`, parses each line as JSON, extracts the timestamp from the `time` field, and forwards logs through the pipeline.

## File Selection Patterns

The `include` and `exclude` parameters use glob patterns to select files:

```yaml
# Advanced file selection with multiple patterns
# Supports wildcards and recursive directory matching
receivers:
  filelog:
    # Include multiple log files with glob patterns
    include:
      - /var/log/app/*.log
      - /var/log/services/**/*.log
      - /home/*/application.log

    # Exclude specific files or patterns
    exclude:
      - /var/log/app/*.gz
      - /var/log/app/*-old.log
      - /var/log/services/test/**

    # Start reading new files from the beginning
    start_at: beginning
```

The `**` pattern recursively matches directories, while `*` matches within a single directory level. The `exclude` patterns take precedence over `include`, allowing you to add exceptions to broad include patterns.

## Start Position

The `start_at` parameter controls where the receiver begins reading:

```yaml
# Control where to start reading from files
receivers:
  filelog:
    include:
      - /var/log/application.log

    # Options: 'beginning' or 'end'
    # 'end': Only read new entries (default, prevents duplicate processing)
    # 'beginning': Read entire file from start (useful for backfilling)
    start_at: end
```

In production, use `end` to avoid reprocessing old logs every time the collector restarts. The receiver maintains checkpoints so it remembers where it left off, even across restarts.

## Parsing JSON Logs

JSON is the most common structured log format. The JSON parser operator extracts fields automatically:

```yaml
# Parse JSON logs with field mapping and timestamp extraction
# Handles nested JSON objects and arrays
receivers:
  filelog:
    include:
      - /var/log/app.log
    operators:
      # Parse each line as JSON
      - type: json_parser
        parse_from: body
        parse_to: attributes

        # Extract timestamp from JSON field
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%fZ'

        # Extract severity/log level
        severity:
          parse_from: attributes.level
          mapping:
            debug: debug
            info: info
            warn: warn
            warning: warn
            error: error
            fatal: fatal
```

For a log entry like this:

```json
{"timestamp": "2026-02-06T10:30:45.123Z", "level": "error", "message": "Database connection failed", "user_id": "12345"}
```

The JSON parser extracts all fields into attributes, sets the timestamp, and maps the severity level.

## Parsing Regex Patterns

For unstructured logs, use regex parsing:

```yaml
# Parse unstructured logs using regular expressions
# Captures named groups into log attributes
receivers:
  filelog:
    include:
      - /var/log/nginx/access.log
    operators:
      # Parse NGINX combined log format
      - type: regex_parser
        regex: '^(?P<remote_addr>\S+) \S+ (?P<remote_user>\S+) \[(?P<time_local>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) (?P<protocol>\S+)" (?P<status>\d+) (?P<body_bytes_sent>\d+) "(?P<http_referer>[^"]*)" "(?P<http_user_agent>[^"]*)"'
        timestamp:
          parse_from: attributes.time_local
          layout: '%d/%b/%Y:%H:%M:%S %z'
        severity:
          parse_from: attributes.status
          mapping:
            range:
              min: 200
              max: 299
              severity: info
            range:
              min: 400
              max: 499
              severity: warn
            range:
              min: 500
              max: 599
              severity: error
```

Named capture groups in the regex become log attributes. This example parses a standard NGINX access log and extracts IP address, request method, path, status code, and user agent.

## Handling Multiline Logs

Stack traces and multi-line log entries require special handling:

```yaml
# Combine multiple lines into single log entries
# Essential for stack traces and multi-line error messages
receivers:
  filelog:
    include:
      - /var/log/java-app.log

    # Define multiline pattern before operators
    multiline:
      # Lines starting with whitespace are continuations
      line_start_pattern: '^[^\s]'

    operators:
      # Parse timestamp from the first line
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?P<level>\w+) (?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%d %H:%M:%S'
        severity:
          parse_from: attributes.level
```

For Java stack traces:

```
2026-02-06 10:30:45 ERROR Database connection failed
    at com.example.Database.connect(Database.java:123)
    at com.example.App.main(App.java:45)
```

The multiline configuration combines all lines until the next line that doesn't start with whitespace, keeping the stack trace together as a single log entry.

## Advanced Multiline Patterns

Different applications use different multiline conventions:

```yaml
# Various multiline pattern strategies
receivers:
  filelog:
    include:
      - /var/log/app.log

    # Strategy 1: Line starts with timestamp pattern
    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2}'

    # Strategy 2: Line ends with specific pattern
    # multiline:
    #   line_end_pattern: ';$'

    # Strategy 3: First line has specific content, continuation lines don't
    # multiline:
    #   line_start_pattern: '^(INFO|WARN|ERROR|DEBUG)'
```

Choose the pattern that matches your log format. Most applications use timestamps to denote new log entries, making `line_start_pattern` with a timestamp regex the most common approach.

## Attribute Manipulation

Transform and enrich logs with additional metadata:

```yaml
# Add, modify, and remove log attributes
# Useful for adding environment context or cleaning up fields
receivers:
  filelog:
    include:
      - /var/log/app.log
    operators:
      - type: json_parser

      # Add static attributes
      - type: add
        field: attributes.environment
        value: production

      - type: add
        field: attributes.service_name
        value: api-gateway

      # Move attribute to a different location
      - type: move
        from: attributes.msg
        to: body

      # Remove unwanted attributes
      - type: remove
        field: attributes.internal_field

      # Rename attributes
      - type: move
        from: attributes.user
        to: attributes.user_id
```

These operators run in order, so you can chain them to build complex transformations. Adding environment and service name helps when aggregating logs from multiple sources.

## Conditional Processing with Routing

Route logs differently based on content:

```yaml
# Route logs based on severity or content
# Allows different processing for different log types
receivers:
  filelog:
    include:
      - /var/log/app.log
    operators:
      - type: json_parser
        severity:
          parse_from: attributes.level

      # Route based on severity
      - type: router
        routes:
          # Drop debug logs in production
          - output: drop_debug
            expr: 'severity_number == 5'

          # Send errors to special pipeline
          - output: error_pipeline
            expr: 'severity_number >= 17'

          # Default route for info/warn
          - output: standard_pipeline

      # Drop debug logs
      - id: drop_debug
        type: noop

      # Process errors with additional context
      - id: error_pipeline
        type: add
        field: attributes.needs_attention
        value: true

      # Standard processing
      - id: standard_pipeline
        type: noop
```

The `expr` field uses [OTTL (OpenTelemetry Transformation Language)](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl) syntax. This allows complex conditional logic based on log content.

## Working with CSV Logs

Some applications output CSV-formatted logs:

```yaml
# Parse CSV logs with custom delimiters and headers
receivers:
  filelog:
    include:
      - /var/log/app.csv
    operators:
      - type: csv_parser
        header: 'timestamp,level,user_id,action,result'
        parse_from: body
        parse_to: attributes

        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%d %H:%M:%S'

        severity:
          parse_from: attributes.level
```

The `header` parameter defines column names. If your CSV file includes a header row, you can use `header_attribute` to read it dynamically from the first line.

## File Rotation Handling

The Filelog Receiver automatically handles log rotation:

```yaml
# Configuration accounts for log rotation
# Receiver tracks files across rotation events
receivers:
  filelog:
    include:
      # Match both current and rotated files
      - /var/log/app.log
      - /var/log/app.log.*

    # Fingerprint files to track across rotations
    fingerprint_size: 1024

    # Maximum concurrent files to monitor
    max_concurrent_files: 128
```

When logrotate or similar tools rotate logs, the receiver uses file fingerprinting (reading the first KB by default) to track which portions it has already processed. This prevents duplicate log entries when files are renamed.

## Kubernetes Container Logs

Kubernetes writes container logs to predictable paths:

```yaml
# Collect logs from all Kubernetes pods on the node
# Parses container runtime format (Docker or containerd)
receivers:
  filelog:
    include:
      # Docker container logs
      - /var/log/pods/*/*/*.log

    operators:
      # Parse container runtime log format
      - type: regex_parser
        regex: '^(?P<time>[^ ]+) (?P<stream>stdout|stderr) (?P<flags>[^ ]*) (?P<log>.*)'
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'

      # Move actual log content to body
      - type: move
        from: attributes.log
        to: body

      # Parse pod information from file path
      - type: regex_parser
        regex: '^/var/log/pods/(?P<namespace>[^_]+)_(?P<pod_name>[^_]+)_[^/]+/(?P<container_name>[^/]+)/'
        parse_from: attributes["log.file.path"]

      # Add Kubernetes metadata
      - type: move
        from: attributes.namespace
        to: resource["k8s.namespace.name"]

      - type: move
        from: attributes.pod_name
        to: resource["k8s.pod.name"]

      - type: move
        from: attributes.container_name
        to: resource["k8s.container.name"]
```

This configuration collects logs from all containers on a Kubernetes node, parses the container runtime format, and extracts pod metadata from the file path.

## Performance Optimization

The Filelog Receiver can handle high log volumes with proper tuning:

```yaml
# Optimized configuration for high-volume log collection
receivers:
  filelog:
    include:
      - /var/log/high-volume-app/*.log

    # Read larger chunks per iteration
    max_log_size: 1MiB

    # Process more files concurrently
    max_concurrent_files: 256

    # Smaller fingerprint for faster file identification
    fingerprint_size: 512

    # Poll files more frequently
    poll_interval: 200ms

    operators:
      - type: json_parser

processors:
  # Batch aggressively to reduce pipeline overhead
  batch:
    timeout: 5s
    send_batch_size: 8192
    send_batch_max_size: 16384

exporters:
  otlp:
    endpoint: https://backend.example.com:4317
    compression: gzip

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [batch]
      exporters: [otlp]
```

For high-volume scenarios, increase batch sizes and poll frequency. The `max_log_size` prevents memory issues with extremely long log lines.

## Resource Attributes

Add resource-level attributes to identify log sources:

```yaml
# Attach resource attributes to all logs
# Helps identify source in multi-host deployments
receivers:
  filelog:
    include:
      - /var/log/app.log

    # Add resource attributes at the receiver level
    resource:
      service.name: api-gateway
      deployment.environment: production
      host.name: ${HOSTNAME}

    operators:
      - type: json_parser
```

Resource attributes apply to all logs from this receiver. They're distinct from log-level attributes and typically represent the entity producing the logs (service, host, container).

## Complete Production Example

Here's a production-ready configuration for a typical application:

```yaml
# Production-grade Filelog Receiver configuration
# Handles JSON logs with multiline support and Kubernetes metadata
receivers:
  filelog:
    include:
      - /var/log/pods/*/*/*.log

    exclude:
      - /var/log/pods/kube-system_*
      - /var/log/pods/*/istio-proxy/*.log

    start_at: end
    max_log_size: 2MiB
    max_concurrent_files: 256
    fingerprint_size: 1024
    poll_interval: 200ms

    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'

    operators:
      # Parse container runtime format
      - type: regex_parser
        regex: '^(?P<time>[^ ]+) (?P<stream>stdout|stderr) (?P<flags>[^ ]*) (?P<log>.*)'
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'

      # Extract actual log content
      - type: move
        from: attributes.log
        to: body

      # Try parsing as JSON (may fail for non-JSON logs)
      - type: json_parser
        parse_from: body
        if: 'body matches "^\\{"'
        on_error: send
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%fZ'
        severity:
          parse_from: attributes.level
          mapping:
            trace: trace
            debug: debug
            info: info
            warn: warn
            error: error
            fatal: fatal

      # Extract Kubernetes metadata from path
      - type: regex_parser
        regex: '^/var/log/pods/(?P<namespace>[^_]+)_(?P<pod_name>[^_]+)_[^/]+/(?P<container_name>[^/]+)/'
        parse_from: attributes["log.file.path"]

      # Move to resource attributes
      - type: move
        from: attributes.namespace
        to: resource["k8s.namespace.name"]

      - type: move
        from: attributes.pod_name
        to: resource["k8s.pod.name"]

      - type: move
        from: attributes.container_name
        to: resource["k8s.container.name"]

      # Add deployment environment
      - type: add
        field: resource["deployment.environment"]
        value: ${ENVIRONMENT}

processors:
  batch:
    timeout: 10s
    send_batch_size: 4096

  memory_limiter:
    check_interval: 1s
    limit_mib: 1024

exporters:
  otlp:
    endpoint: ${OTLP_ENDPOINT}
    compression: gzip
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

## Troubleshooting

### Logs Not Appearing

Check these common issues:

1. File path patterns don't match: Verify with `ls -la /your/log/path/*.log`
2. Permissions: Collector needs read access to log files and directories
3. Start position: Using `start_at: end` means only new logs appear
4. Parser errors: Check collector logs for parsing failures

### High Memory Usage

If the receiver consumes too much memory:

1. Reduce `max_concurrent_files`
2. Decrease `max_log_size`
3. Add the `memory_limiter` processor
4. Increase batch processor timeout to reduce pipeline frequency

### Duplicate Logs

Duplicates typically occur from:

1. Multiple receivers watching the same files
2. File rotation without proper fingerprinting
3. Collector restarts without persistent state

Enable persistent storage for checkpoints to maintain state across restarts.

## Next Steps

The Filelog Receiver is just one way to collect logs. For a complete logging solution:

1. Use the [OpenTelemetry Collector](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view) in gateway mode for centralized processing
2. Monitor [collector internal metrics](https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view) to track log throughput
3. Combine with structured logging libraries that output JSON
4. Consider direct OTLP export for new applications to bypass file-based collection

File-based log collection remains essential for containerized environments and legacy applications. The Filelog Receiver provides the flexibility to parse any log format and transform it into standardized OpenTelemetry logs that work with any backend system.
