# How to Configure Promtail Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Promtail, Pipeline Stages, Log Processing, Data Transformation, Log Enrichment

Description: A comprehensive guide to configuring Promtail pipelines for parsing, transforming, and enriching logs before sending to Loki, covering all pipeline stages and advanced processing techniques.

---

Promtail pipelines allow you to parse, transform, and enrich log data before it reaches Loki. Understanding pipeline stages is essential for efficient log processing and optimizing Loki storage. This guide covers all aspects of Promtail pipeline configuration.

## Prerequisites

Before starting, ensure you have:

- Promtail installed and connected to Loki
- Access to log files for testing
- Understanding of your log formats
- Basic knowledge of YAML configuration

## Understanding Pipelines

### Pipeline Architecture

```
Log Entry -> Stage 1 -> Stage 2 -> Stage 3 -> ... -> Loki
                |           |           |
            Extract      Labels      Output
```

### Pipeline Stages Overview

| Stage | Purpose |
|-------|---------|
| `json` | Parse JSON logs |
| `logfmt` | Parse logfmt logs |
| `regex` | Parse with regular expressions |
| `replace` | Replace text in logs |
| `labels` | Add/modify labels |
| `timestamp` | Extract/set timestamp |
| `output` | Set final log line |
| `match` | Conditional processing |
| `drop` | Drop log entries |
| `multiline` | Handle multi-line logs |

## Basic Pipeline Configuration

### Simple JSON Pipeline

```yaml
scrape_configs:
  - job_name: app
    static_configs:
      - targets: [localhost]
        labels:
          job: app
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: msg
            timestamp: time
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339
      - output:
          source: message
```

### Logfmt Pipeline

```yaml
pipeline_stages:
  - logfmt:
      mapping:
        level:
        msg:
        duration:
        user:
  - labels:
      level:
  - output:
      source: msg
```

## JSON Stage

### Basic JSON Parsing

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        message: message
        user_id: user.id
        timestamp: '@timestamp'
```

### Nested JSON

```yaml
# For: {"user": {"id": "123", "name": "John"}, "action": "login"}
pipeline_stages:
  - json:
      expressions:
        user_id: user.id
        user_name: user.name
        action: action
```

### JSON with Source

```yaml
# Parse specific field as JSON
pipeline_stages:
  - json:
      expressions:
        payload: data
  - json:
      source: payload
      expressions:
        status: status
        error: error
```

## Regex Stage

### Basic Regex Extraction

```yaml
pipeline_stages:
  - regex:
      expression: '^(?P<timestamp>\S+) (?P<level>\w+) (?P<message>.*)'
```

### Named Capture Groups

```yaml
# Parse Apache access log
pipeline_stages:
  - regex:
      expression: '^(?P<ip>\d+\.\d+\.\d+\.\d+) - (?P<user>\S+) \[(?P<timestamp>[^\]]+)\] "(?P<method>\w+) (?P<path>\S+) (?P<protocol>\S+)" (?P<status>\d+) (?P<bytes>\d+)'
```

### Regex with Source

```yaml
pipeline_stages:
  - json:
      expressions:
        msg: message
  - regex:
      source: msg
      expression: 'user=(?P<user_id>\d+)'
```

## Labels Stage

### Static Labels

```yaml
pipeline_stages:
  - labels:
      env:
      service:
      datacenter:
```

### Dynamic Labels from Extraction

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        app: application
  - labels:
      level:
      app:
```

### Label Mapping

```yaml
pipeline_stages:
  - json:
      expressions:
        loglevel: level
  - labelmap:
      source: loglevel
      mapping:
        ERROR: error
        WARN: warning
        INFO: info
        DEBUG: debug
```

## Timestamp Stage

### RFC3339 Timestamp

```yaml
pipeline_stages:
  - json:
      expressions:
        time: timestamp
  - timestamp:
      source: time
      format: RFC3339
```

### Custom Format

```yaml
pipeline_stages:
  - regex:
      expression: '(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})'
  - timestamp:
      source: ts
      format: '2006-01-02 15:04:05,000'
```

### Unix Timestamp

```yaml
pipeline_stages:
  - json:
      expressions:
        epoch: timestamp
  - timestamp:
      source: epoch
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

## Output Stage

### Set Output from Extracted Field

```yaml
pipeline_stages:
  - json:
      expressions:
        msg: message
        metadata: meta
  - output:
      source: msg
```

### Template Output

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        message: msg
        user: user_id
  - template:
      source: output
      template: '[{{ .level }}] User {{ .user }}: {{ .message }}'
  - output:
      source: output
```

## Match Stage (Conditional Processing)

### Basic Match

```yaml
pipeline_stages:
  - match:
      selector: '{job="app"}'
      stages:
        - json:
            expressions:
              level: level
```

### Match with Label Filter

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
  - labels:
      level:
  - match:
      selector: '{level="error"}'
      stages:
        - json:
            expressions:
              stack_trace: stacktrace
              error_code: code
```

### Nested Matches

```yaml
pipeline_stages:
  - match:
      selector: '{job="app"}'
      stages:
        - json:
            expressions:
              type: event_type
        - labels:
            type:
        - match:
            selector: '{type="error"}'
            stages:
              - json:
                  expressions:
                    error: error_message
```

## Replace Stage

### Simple Replace

```yaml
pipeline_stages:
  - replace:
      expression: 'password=\S+'
      replace: 'password=REDACTED'
```

### Regex Replace

```yaml
pipeline_stages:
  - replace:
      expression: '(\d{4})-(\d{4})-(\d{4})-(\d{4})'
      replace: '****-****-****-$4'
```

### Replace in Specific Field

```yaml
pipeline_stages:
  - json:
      expressions:
        msg: message
  - replace:
      source: msg
      expression: 'email=\S+@\S+'
      replace: 'email=REDACTED'
```

## Template Stage

### Basic Template

```yaml
pipeline_stages:
  - json:
      expressions:
        method: method
        path: path
        status: status
  - template:
      source: summary
      template: '{{ .method }} {{ .path }} -> {{ .status }}'
```

### Template with Conditions

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        msg: message
  - template:
      source: formatted
      template: '{{ if eq .level "error" }}ERROR: {{ end }}{{ .message }}'
```

### Template with Functions

```yaml
pipeline_stages:
  - json:
      expressions:
        msg: message
  - template:
      source: formatted
      template: '{{ .msg | ToUpper }}'
```

## Complete Pipeline Examples

### Application Logs

```yaml
scrape_configs:
  - job_name: application
    static_configs:
      - targets: [localhost]
        labels:
          job: app
          env: production
          __path__: /var/log/app/*.log
    pipeline_stages:
      # Parse JSON
      - json:
          expressions:
            timestamp: '@timestamp'
            level: level
            message: message
            service: service
            trace_id: traceId
            user_id: userId

      # Add labels
      - labels:
          level:
          service:

      # Set timestamp
      - timestamp:
          source: timestamp
          format: RFC3339Nano

      # Mask sensitive data
      - replace:
          expression: 'Bearer [A-Za-z0-9-_=]+'
          replace: 'Bearer [REDACTED]'

      # Set output
      - output:
          source: message
```

### NGINX Access Logs

```yaml
scrape_configs:
  - job_name: nginx
    static_configs:
      - targets: [localhost]
        labels:
          job: nginx
          __path__: /var/log/nginx/access.log
    pipeline_stages:
      - regex:
          expression: '^(?P<remote_addr>\S+) - (?P<remote_user>\S+) \[(?P<time_local>[^\]]+)\] "(?P<request>[^"]*)" (?P<status>\d+) (?P<body_bytes_sent>\d+) "(?P<http_referer>[^"]*)" "(?P<http_user_agent>[^"]*)"'

      - regex:
          source: request
          expression: '^(?P<method>\S+) (?P<path>\S+) (?P<protocol>\S+)$'

      - labels:
          method:
          status:

      - timestamp:
          source: time_local
          format: '02/Jan/2006:15:04:05 -0700'

      - template:
          source: output_line
          template: '{{ .method }} {{ .path }} {{ .status }} {{ .body_bytes_sent }}b'

      - output:
          source: output_line
```

### Kubernetes Application Logs

```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      # Try JSON first
      - match:
          selector: '{container=~".+"}'
          stages:
            - json:
                expressions:
                  level: level
                  message: msg
                  timestamp: time
            - labels:
                level:

      # Match error logs for enrichment
      - match:
          selector: '{level="error"}'
          stages:
            - json:
                expressions:
                  stack: stackTrace
                  code: errorCode

      # Drop health check logs
      - match:
          selector: '{}'
          stages:
            - drop:
                expression: '.*healthcheck.*'
```

### Multi-Format Logs

```yaml
pipeline_stages:
  # Try JSON
  - match:
      selector: '{job="app"}'
      stages:
        - json:
            expressions:
              level: level
              msg: message

  # Fall back to logfmt if JSON fails
  - match:
      selector: '{job="app", level=""}'
      stages:
        - logfmt:
            mapping:
              level:
              msg:

  # Final fallback - regex
  - match:
      selector: '{job="app", level=""}'
      stages:
        - regex:
            expression: '(?P<level>\w+):\s+(?P<msg>.*)'
```

## Performance Best Practices

### Efficient Pipeline Design

```yaml
# Good - filter early
pipeline_stages:
  - drop:
      expression: '.*DEBUG.*'
  - json:
      expressions:
        level: level

# Less efficient - parse then filter
pipeline_stages:
  - json:
      expressions:
        level: level
  - match:
      selector: '{level="debug"}'
      action: drop
```

### Minimize Label Cardinality

```yaml
# Good - limited labels
pipeline_stages:
  - labels:
      level:
      service:

# Avoid - high cardinality
pipeline_stages:
  - labels:
      request_id:  # Too many unique values
      user_id:     # Too many unique values
```

### Use Specific Regex

```yaml
# Efficient
- regex:
    expression: '^ERROR: (?P<msg>.*)'

# Less efficient
- regex:
    expression: '.*ERROR.*(?P<msg>.*)'
```

## Debugging Pipelines

### Test Configuration

```bash
# Validate config
promtail -config.file=/etc/promtail/config.yaml -dry-run

# Check targets
curl http://localhost:9080/targets
```

### Pipeline Inspection

```bash
# View pipeline metrics
curl http://localhost:9080/metrics | grep promtail_pipeline
```

### Common Issues

1. **Regex not matching**: Test regex separately
2. **Timestamps incorrect**: Check format string
3. **Labels not appearing**: Verify extraction source
4. **High memory usage**: Reduce label cardinality

## Conclusion

Promtail pipelines provide powerful log processing capabilities. Key takeaways:

- Use appropriate stages for your log format
- Extract labels with low cardinality
- Set timestamps for proper ordering
- Use match stages for conditional processing
- Filter early for better performance
- Test pipelines before production deployment

With proper pipeline configuration, you can efficiently process and enrich logs before they reach Loki.
