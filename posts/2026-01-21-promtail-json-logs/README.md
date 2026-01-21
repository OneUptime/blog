# How to Parse JSON Logs with Promtail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Promtail, JSON Parsing, Structured Logs, Log Processing, Pipeline Stages

Description: A comprehensive guide to parsing JSON logs with Promtail for Grafana Loki, covering JSON extraction, nested fields, timestamp handling, and best practices for structured log processing.

---

JSON is the most common format for structured application logs. Properly parsing JSON logs in Promtail enables efficient querying and filtering in Loki. This guide covers all aspects of JSON log parsing with Promtail.

## Prerequisites

Before starting, ensure you have:

- Promtail installed and configured
- JSON-formatted log files to process
- Basic understanding of Promtail pipelines
- Access to modify Promtail configuration

## Understanding JSON Logs

### Common JSON Log Formats

```json
{"timestamp":"2024-01-15T10:30:00Z","level":"info","message":"Request processed","duration":45}
```

```json
{"@timestamp":"2024-01-15T10:30:00.000Z","log.level":"INFO","message":"User logged in","user":{"id":"123","name":"John"}}
```

```json
{"time":"2024-01-15T10:30:00Z","severity":"ERROR","msg":"Database connection failed","error":{"code":"DB001","message":"Connection timeout"}}
```

## Basic JSON Parsing

### Simple JSON Extraction

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        message: message
        timestamp: timestamp
```

### Extracting Multiple Fields

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        message: msg
        service: service
        duration: duration_ms
        user_id: user_id
        trace_id: trace_id
```

### Using Extracted Fields

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        message: message
        timestamp: '@timestamp'

  # Add labels from extracted fields
  - labels:
      level:

  # Set timestamp
  - timestamp:
      source: timestamp
      format: RFC3339

  # Set output
  - output:
      source: message
```

## Nested JSON Parsing

### Access Nested Fields

```yaml
# For: {"user": {"id": "123", "name": "John"}, "action": "login"}
pipeline_stages:
  - json:
      expressions:
        user_id: user.id
        user_name: user.name
        action: action
```

### Deep Nesting

```yaml
# For: {"request": {"headers": {"x-trace-id": "abc123"}}}
pipeline_stages:
  - json:
      expressions:
        trace_id: request.headers.x-trace-id
```

### Multiple Levels

```yaml
# For: {"metadata": {"service": {"name": "api", "version": "1.0"}}}
pipeline_stages:
  - json:
      expressions:
        service_name: metadata.service.name
        service_version: metadata.service.version
```

## Two-Stage JSON Parsing

### Extract and Parse

```yaml
# For: {"data": "{\"nested\":\"json\"}"}
pipeline_stages:
  # First extraction
  - json:
      expressions:
        data_str: data

  # Parse the nested JSON string
  - json:
      source: data_str
      expressions:
        nested_value: nested
```

### Parse JSON from Field

```yaml
pipeline_stages:
  - json:
      expressions:
        payload: payload

  - json:
      source: payload
      expressions:
        status: status
        error_code: error.code
        error_message: error.message
```

## Timestamp Handling

### RFC3339 Timestamp

```yaml
pipeline_stages:
  - json:
      expressions:
        ts: timestamp
  - timestamp:
      source: ts
      format: RFC3339
```

### ISO8601 with Milliseconds

```yaml
pipeline_stages:
  - json:
      expressions:
        ts: '@timestamp'
  - timestamp:
      source: ts
      format: '2006-01-02T15:04:05.000Z'
```

### Unix Timestamp

```yaml
pipeline_stages:
  - json:
      expressions:
        ts: timestamp
  - timestamp:
      source: ts
      format: Unix
```

### Unix Milliseconds

```yaml
pipeline_stages:
  - json:
      expressions:
        ts: timestamp_ms
  - timestamp:
      source: ts
      format: UnixMs
```

### Unix Nanoseconds

```yaml
pipeline_stages:
  - json:
      expressions:
        ts: timestamp_ns
  - timestamp:
      source: ts
      format: UnixNs
```

### Custom Format

```yaml
pipeline_stages:
  - json:
      expressions:
        ts: time
  - timestamp:
      source: ts
      format: '2006/01/02 15:04:05'
      location: 'America/New_York'
```

## Label Extraction

### Direct Labels

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        service: service
        env: environment
  - labels:
      level:
      service:
      env:
```

### Conditional Labels

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        error_code: error.code

  - labels:
      level:

  # Only add error_code label for errors
  - match:
      selector: '{level="error"}'
      stages:
        - labels:
            error_code:
```

### Label Normalization

```yaml
pipeline_stages:
  - json:
      expressions:
        log_level: level
  - replace:
      source: log_level
      expression: 'ERROR|error'
      replace: 'error'
  - replace:
      source: log_level
      expression: 'WARN|warn|WARNING|warning'
      replace: 'warning'
  - labels:
      level: log_level
```

## Output Configuration

### Message as Output

```yaml
pipeline_stages:
  - json:
      expressions:
        msg: message
  - output:
      source: msg
```

### Formatted Output

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        message: msg
        user: user_id
  - template:
      source: output_line
      template: '[{{ .level }}] {{ .message }} (user={{ .user }})'
  - output:
      source: output_line
```

### Keep Full JSON

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
  - labels:
      level:
  # Output remains the full JSON line
```

## Handling Different JSON Formats

### Mixed Log Formats

```yaml
pipeline_stages:
  # Try parsing as JSON
  - json:
      expressions:
        level: level
        message: message

  # If level is empty, it might be a different format
  - match:
      selector: '{level=""}'
      stages:
        - json:
            expressions:
              level: severity
              message: msg
```

### Optional Fields

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        message: message
        error: error
        stack: stack_trace

  # error and stack might be null/missing - that's OK
  - labels:
      level:
```

### Array Fields

```yaml
# For: {"tags": ["api", "production"], "message": "Request"}
pipeline_stages:
  - json:
      expressions:
        tags: tags
        message: message
  # tags will be the JSON array as string: ["api", "production"]
```

## Complete Examples

### Application JSON Logs

```yaml
scrape_configs:
  - job_name: application
    static_configs:
      - targets: [localhost]
        labels:
          job: app
          __path__: /var/log/app/*.json
    pipeline_stages:
      # Parse JSON
      - json:
          expressions:
            timestamp: '@timestamp'
            level: level
            message: message
            service: service
            version: version
            trace_id: traceId
            span_id: spanId
            user_id: context.userId
            request_id: context.requestId
            duration: metrics.duration
            status_code: http.statusCode

      # Add labels (low cardinality only)
      - labels:
          level:
          service:

      # Set timestamp
      - timestamp:
          source: timestamp
          format: RFC3339Nano

      # Format output
      - template:
          source: log_line
          template: '{{ .message }}'

      - output:
          source: log_line
```

### Docker JSON Logs

```yaml
# Docker JSON log format
# {"log":"message\n","stream":"stdout","time":"2024-01-15T10:30:00.000Z"}
scrape_configs:
  - job_name: docker
    static_configs:
      - targets: [localhost]
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*.log
    pipeline_stages:
      - json:
          expressions:
            log: log
            stream: stream
            time: time

      - labels:
          stream:

      - timestamp:
          source: time
          format: RFC3339Nano

      # Try to parse nested JSON in log field
      - json:
          source: log
          expressions:
            level: level
            msg: message

      - labels:
          level:

      - output:
          source: msg
```

### Kubernetes JSON Logs

```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      # Parse application JSON
      - json:
          expressions:
            level: level
            message: msg
            timestamp: time
            error: error
            trace_id: trace_id

      - labels:
          level:

      - timestamp:
          source: timestamp
          format: RFC3339Nano

      # Handle error details
      - match:
          selector: '{level="error"}'
          stages:
            - json:
                source: error
                expressions:
                  error_type: type
                  error_message: message
                  error_stack: stack

      - output:
          source: message
```

### ECS (Elastic Common Schema) Format

```yaml
# ECS format: {"@timestamp":"...","log.level":"INFO","message":"..."}
pipeline_stages:
  - json:
      expressions:
        timestamp: '@timestamp'
        level: log.level
        message: message
        service_name: service.name
        trace_id: trace.id
        span_id: span.id
        event_action: event.action
        error_message: error.message
        error_stack: error.stack_trace

  - labels:
      level:

  - timestamp:
      source: timestamp
      format: RFC3339Nano

  - output:
      source: message
```

## Performance Considerations

### Extract Only What You Need

```yaml
# Good - extract only needed fields
pipeline_stages:
  - json:
      expressions:
        level: level
        message: message

# Less efficient - extract everything
pipeline_stages:
  - json:
      expressions:
        field1: field1
        field2: field2
        field3: field3
        # ... many more fields
```

### Filter Before Parsing

```yaml
pipeline_stages:
  # Drop debug logs before JSON parsing
  - drop:
      expression: '"level":"debug"'

  - json:
      expressions:
        level: level
        message: message
```

### Avoid High-Cardinality Labels

```yaml
# Good - low cardinality
pipeline_stages:
  - json:
      expressions:
        level: level
  - labels:
      level:

# Bad - high cardinality
pipeline_stages:
  - json:
      expressions:
        request_id: requestId
  - labels:
      request_id:  # Millions of unique values!
```

## Troubleshooting

### JSON Not Parsing

```yaml
# Check if log line is valid JSON
# Common issues:
# - Log line has prefix: "2024-01-15 {\"level\":...}"
# - Escaped quotes: {"message":"say \"hello\""}
# - Trailing newlines or characters
```

### Fields Not Extracted

```yaml
# Verify field path exists
# For: {"data": {"nested": "value"}}
pipeline_stages:
  - json:
      expressions:
        value: data.nested  # Correct
        wrong: nested       # Wrong - not at root level
```

### Timestamp Issues

```yaml
# Ensure format matches exactly
# Log: "2024-01-15T10:30:00.123Z"
pipeline_stages:
  - json:
      expressions:
        ts: timestamp
  - timestamp:
      source: ts
      format: '2006-01-02T15:04:05.000Z'  # Must match milliseconds
```

## Best Practices

1. **Extract only needed fields**: Don't parse everything
2. **Use low-cardinality labels**: Avoid unique IDs
3. **Set timestamps properly**: Use extracted timestamps
4. **Filter early**: Drop logs before expensive parsing
5. **Test thoroughly**: Validate with sample logs
6. **Document format**: Keep log format documentation

## Conclusion

Proper JSON log parsing in Promtail enables efficient log querying in Loki. Key takeaways:

- Use json stage to extract fields
- Access nested fields with dot notation
- Set timestamps from JSON fields
- Add only low-cardinality labels
- Format output for readability
- Filter before parsing for performance

With correct JSON parsing configuration, you can fully leverage structured logging in your Loki deployment.
