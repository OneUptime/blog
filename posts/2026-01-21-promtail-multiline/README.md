# How to Parse Multi-Line Logs with Promtail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Promtail, Multi-Line Logs, Stack Traces, Log Parsing, Exception Handling

Description: A comprehensive guide to parsing multi-line logs with Promtail for Grafana Loki, covering stack trace handling, multi-line stage configuration, regex patterns, and best practices for aggregating related log lines.

---

Multi-line logs, such as stack traces and exception messages, present a challenge for log aggregation. Without proper configuration, each line is treated as a separate log entry, making debugging difficult. This guide covers how to correctly parse multi-line logs with Promtail.

## Prerequisites

Before starting, ensure you have:

- Promtail installed and configured
- Multi-line log files to process
- Understanding of Promtail pipeline stages
- Regex knowledge for pattern matching

## Understanding Multi-Line Logs

### Common Multi-Line Formats

**Java Stack Trace:**
```
2024-01-15 10:30:00 ERROR - Exception in thread "main"
java.lang.NullPointerException: Cannot invoke method on null object
    at com.example.service.UserService.getUser(UserService.java:45)
    at com.example.controller.UserController.handleRequest(UserController.java:23)
    at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
Caused by: java.sql.SQLException: Connection refused
    at com.mysql.jdbc.ConnectionImpl.createNewIO(ConnectionImpl.java:2181)
    ... 15 more
```

**Python Traceback:**
```
Traceback (most recent call last):
  File "/app/main.py", line 45, in process_request
    result = database.query(user_id)
  File "/app/database.py", line 23, in query
    return connection.execute(sql)
ConnectionError: Database connection failed
```

**Go Stack Trace:**
```
panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: segmentation violation code=0x1 addr=0x0 pc=0x4a5f2c]

goroutine 1 [running]:
main.processRequest(0x0)
    /app/main.go:45 +0x2c
main.main()
    /app/main.go:23 +0x1f
```

## Multiline Stage

### Basic Configuration

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\d{4}-\d{2}-\d{2}'
      max_wait_time: 3s
      max_lines: 128
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `firstline` | Regex to match first line | Required |
| `max_wait_time` | Max time to wait for next line | 3s |
| `max_lines` | Max lines to aggregate | 128 |

## Java/JVM Stack Traces

### Basic Java Configuration

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}'
      max_wait_time: 3s
```

### Spring Boot Logs

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}'
      max_wait_time: 3s
      max_lines: 500
```

### Log4j Pattern

```yaml
# Log4j: "2024-01-15 10:30:00,123 ERROR [main] ..."
pipeline_stages:
  - multiline:
      firstline: '^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3}'
      max_wait_time: 3s
```

### Logback JSON with Stack Trace

```yaml
pipeline_stages:
  # JSON logs are typically single-line
  # But if stack trace is in message field with newlines:
  - json:
      expressions:
        message: message
        level: level
        timestamp: '@timestamp'
  - labels:
      level:
  - output:
      source: message
```

## Python Tracebacks

### Python Exception Configuration

```yaml
pipeline_stages:
  - multiline:
      firstline: '^(\d{4}-\d{2}-\d{2}|Traceback|[A-Z][a-z]+Error:|[A-Z][a-z]+Exception:)'
      max_wait_time: 3s
```

### Django Logs

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\[\d{2}/[A-Z][a-z]{2}/\d{4}\s+\d{2}:\d{2}:\d{2}\]'
      max_wait_time: 3s
```

### Gunicorn/Uvicorn Logs

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}|INFO|ERROR|WARNING)\]'
      max_wait_time: 3s
```

## Go Stack Traces

### Go Panic Configuration

```yaml
pipeline_stages:
  - multiline:
      firstline: '^(\d{4}/\d{2}/\d{2}|\d{4}-\d{2}-\d{2}|panic:)'
      max_wait_time: 3s
```

### Go with Zerolog

```yaml
# Zerolog typically outputs single-line JSON
# Multi-line only for panic/debug output
pipeline_stages:
  - multiline:
      firstline: '^(\{|panic:|\d{4})'
      max_wait_time: 3s
```

## Node.js Stack Traces

### Node.js Error Configuration

```yaml
pipeline_stages:
  - multiline:
      firstline: '^(\d{4}-\d{2}-\d{2}T|\[?\d{4}|\{|Error:)'
      max_wait_time: 3s
```

### Express/NestJS Logs

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\[Nest\]|\{\"level\"|\d{4}-\d{2}-\d{2}'
      max_wait_time: 3s
```

## .NET Stack Traces

### .NET Exception Configuration

```yaml
pipeline_stages:
  - multiline:
      firstline: '^(\d{4}-\d{2}-\d{2}|\[[\d:]+\]|System\.|Microsoft\.)'
      max_wait_time: 3s
      max_lines: 200
```

### ASP.NET Core

```yaml
pipeline_stages:
  - multiline:
      firstline: '^(info:|warn:|fail:|crit:|\d{4}-\d{2}-\d{2})'
      max_wait_time: 3s
```

## Database Logs

### PostgreSQL Logs

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+\w+'
      max_wait_time: 3s
```

### MySQL Slow Query Log

```yaml
pipeline_stages:
  - multiline:
      firstline: '^#\s+Time:'
      max_wait_time: 5s
      max_lines: 50
```

## Nginx/Apache Multi-Line Errors

### Nginx Error Log

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2}'
      max_wait_time: 3s
```

### Apache Error Log

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\[[\w\s:]+\]'
      max_wait_time: 3s
```

## Complete Configuration Examples

### Java Application

```yaml
scrape_configs:
  - job_name: java-app
    static_configs:
      - targets: [localhost]
        labels:
          job: java-app
          __path__: /var/log/app/*.log
    pipeline_stages:
      # Aggregate multi-line logs
      - multiline:
          firstline: '^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}'
          max_wait_time: 3s
          max_lines: 500

      # Parse timestamp and level
      - regex:
          expression: '^(?P<timestamp>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(?P<level>\w+)\s+'

      - labels:
          level:

      - timestamp:
          source: timestamp
          format: '2006-01-02 15:04:05.000'
```

### Python Application

```yaml
scrape_configs:
  - job_name: python-app
    static_configs:
      - targets: [localhost]
        labels:
          job: python-app
          __path__: /var/log/python-app/*.log
    pipeline_stages:
      # Handle both timestamp-prefixed and Traceback lines
      - multiline:
          firstline: '^(\d{4}-\d{2}-\d{2}|Traceback\s+\(most recent)'
          max_wait_time: 3s

      # Parse structured lines
      - regex:
          expression: '^(?P<timestamp>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})\s+(?P<level>\w+)\s+(?P<message>.*)'

      - labels:
          level:

      - timestamp:
          source: timestamp
          format: '2006-01-02 15:04:05,000'
```

### Kubernetes Multi-Container

```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      # Different first-line patterns for different apps
      - match:
          selector: '{app="java-service"}'
          stages:
            - multiline:
                firstline: '^\d{4}-\d{2}-\d{2}'
                max_wait_time: 3s

      - match:
          selector: '{app="python-service"}'
          stages:
            - multiline:
                firstline: '^(\d{4}-\d{2}-\d{2}|Traceback)'
                max_wait_time: 3s

      - match:
          selector: '{app="go-service"}'
          stages:
            - multiline:
                firstline: '^(\d{4}|\{|panic:)'
                max_wait_time: 3s
```

## Testing Multi-Line Configuration

### Local Testing

```bash
# Test with dry-run
promtail -config.file=/etc/promtail/config.yaml -dry-run

# Check with sample file
echo '2024-01-15 10:30:00 ERROR - Exception
    at com.example.Service.method(Service.java:10)
    at com.example.Main.main(Main.java:5)
2024-01-15 10:30:01 INFO - Next log' > /tmp/test.log

# Run Promtail and verify aggregation
```

### Regex Testing

```bash
# Test firstline regex
echo "2024-01-15 10:30:00 ERROR" | grep -E '^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}'
```

## Best Practices

### Timeout Configuration

```yaml
# Short timeout for responsive logs
- multiline:
    firstline: '^\d{4}-\d{2}-\d{2}'
    max_wait_time: 3s

# Longer timeout for slow-emitting logs
- multiline:
    firstline: '^\d{4}-\d{2}-\d{2}'
    max_wait_time: 10s
```

### Line Limits

```yaml
# Java stack traces can be long
- multiline:
    firstline: '^\d{4}-\d{2}-\d{2}'
    max_lines: 500  # Increase for deep stack traces

# Keep reasonable limits
- multiline:
    firstline: '^\d{4}-\d{2}-\d{2}'
    max_lines: 128  # Default, good for most cases
```

### Specific Patterns

```yaml
# Be specific to avoid false matches
# Good - specific pattern
- multiline:
    firstline: '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\s+'

# Less good - too generic
- multiline:
    firstline: '^\d'
```

## Troubleshooting

### Lines Not Aggregating

```yaml
# Check regex matches first line
# Common issues:
# - Whitespace at start of line
# - Different timestamp format
# - Missing or wrong escape characters
```

### Too Much Aggregation

```yaml
# If unrelated logs are being combined:
# - Make firstline pattern more specific
# - Check for false matches
# - Reduce max_wait_time
```

### Memory Issues

```yaml
# Reduce max_lines if memory problems
- multiline:
    firstline: '^\d{4}-\d{2}-\d{2}'
    max_lines: 50  # Lower limit
    max_wait_time: 2s  # Shorter wait
```

### Logs Arriving Out of Order

```yaml
# Multi-line stage expects lines in order
# If logs are interleaved from multiple threads,
# consider logging to separate files per thread
# or using a logging framework that handles this
```

## Conclusion

Proper multi-line log handling is essential for debugging applications. Key takeaways:

- Use multiline stage with appropriate firstline regex
- Match timestamp patterns for your log format
- Configure reasonable timeouts and line limits
- Test configuration with sample logs
- Consider different patterns for different applications

With correct multi-line configuration, stack traces and error details remain intact for effective debugging in Loki.
