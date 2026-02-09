# How to Parse NGINX Error Logs with Severity Level Extraction Using the Filelog Receiver Operators

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, NGINX, Error Logs, Severity, Filelog Receiver

Description: Parse NGINX error logs and extract severity levels into OpenTelemetry log records using the filelog receiver operator chain.

NGINX error logs have a different format from access logs and carry critical information about server misconfigurations, upstream failures, and client errors. Parsing them into structured OpenTelemetry logs with proper severity levels lets you set up targeted alerting and build useful dashboards.

## NGINX Error Log Format

NGINX error log lines follow this structure:

```
2026/02/06 14:23:45 [error] 1234#5678: *9012 connect() failed (111: Connection refused) while connecting to upstream, client: 172.16.0.1, server: api.example.com, request: "GET /api/health HTTP/1.1", upstream: "http://127.0.0.1:8080/api/health", host: "api.example.com"
```

The fields are: timestamp, severity level in brackets, worker process ID, connection ID, error message, and a set of key-value context fields.

## Parsing the Error Log

```yaml
receivers:
  filelog/nginx-errors:
    include:
      - /var/log/nginx/error.log
    start_at: end
    operators:
      # Step 1: Parse the main structure
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}) \[(?P<severity>\w+)\] (?P<pid>\d+)#(?P<tid>\d+): (?:\*(?P<connection_id>\d+) )?(?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "2006/01/02 15:04:05"
        severity:
          parse_from: attributes.severity
          mapping:
            fatal: emerg
            fatal2: alert
            fatal3: crit
            error: error
            warn: warn
            info: notice
            info2: info
            debug: debug

      # Step 2: Extract client IP from the message if present
      - type: regex_parser
        parse_from: attributes.message
        regex: '.*client: (?P<client_addr>[0-9.]+).*'
        on_error: send
        # Do not overwrite the original message
        preserve_to: attributes.message

      # Step 3: Extract upstream address if present
      - type: regex_parser
        parse_from: attributes.message
        regex: '.*upstream: "(?P<upstream_addr>[^"]+)".*'
        on_error: send
        preserve_to: attributes.message

      # Step 4: Extract the request line if present
      - type: regex_parser
        parse_from: attributes.message
        regex: '.*request: "(?P<request_method>[A-Z]+) (?P<request_uri>[^\s]+) (?P<request_protocol>[^"]+)".*'
        on_error: send
        preserve_to: attributes.message

      # Step 5: Clean up intermediate fields
      - type: remove
        field: attributes.timestamp
```

## Severity Mapping Details

NGINX uses its own severity levels that do not map one-to-one with OpenTelemetry severity levels. Here is the mapping:

| NGINX Level | Meaning | OTel Severity |
|------------|---------|---------------|
| emerg | System unusable | FATAL |
| alert | Action needed immediately | FATAL |
| crit | Critical conditions | FATAL |
| error | Error conditions | ERROR |
| warn | Warning conditions | WARN |
| notice | Normal but significant | INFO |
| info | Informational | INFO |
| debug | Debug messages | DEBUG |

The configuration uses the severity parser's mapping feature to handle this translation.

## Complete Collector Configuration

```yaml
receivers:
  filelog/nginx-errors:
    include:
      - /var/log/nginx/error.log
    start_at: end
    poll_interval: 200ms
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}) \[(?P<severity>\w+)\] (?P<pid>\d+)#(?P<tid>\d+): (?:\*(?P<connection_id>\d+) )?(?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "2006/01/02 15:04:05"
      - type: severity_parser
        parse_from: attributes.severity
        mapping:
          fatal: ["emerg", "alert", "crit"]
          error: "error"
          warn: "warn"
          info: ["notice", "info"]
          debug: "debug"
      # Move the parsed message to the log body
      - type: move
        from: attributes.message
        to: body
      - type: remove
        field: attributes.timestamp

processors:
  resource:
    attributes:
      - key: service.name
        value: "nginx"
        action: upsert
      - key: log.source
        value: "nginx-error"
        action: upsert

  # Filter out debug-level logs in production
  filter/drop-debug:
    logs:
      log_record:
        - 'severity_number < SEVERITY_NUMBER_INFO'

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/nginx-errors]
      processors: [resource, filter/drop-debug, batch]
      exporters: [otlp]
```

## Extracting Specific Error Categories

NGINX error messages fall into several categories. You can add an operator to classify them:

```yaml
operators:
  # After the main parse, classify the error type
  - type: router
    routes:
      - output: upstream_errors
        expr: 'attributes.message matches "upstream"'
      - output: ssl_errors
        expr: 'attributes.message matches "SSL"'
      - output: permission_errors
        expr: 'attributes.message matches "Permission denied|forbidden"'
    default: other_errors

  - id: upstream_errors
    type: add
    field: attributes["nginx.error.category"]
    value: "upstream"
  - id: ssl_errors
    type: add
    field: attributes["nginx.error.category"]
    value: "ssl"
  - id: permission_errors
    type: add
    field: attributes["nginx.error.category"]
    value: "permission"
  - id: other_errors
    type: add
    field: attributes["nginx.error.category"]
    value: "other"
```

## Combining Access and Error Logs

In production, you will want both access and error logs flowing through the same Collector:

```yaml
receivers:
  filelog/nginx-access:
    include:
      - /var/log/nginx/access.log
    operators:
      # ... access log parsing operators ...

  filelog/nginx-errors:
    include:
      - /var/log/nginx/error.log
    operators:
      # ... error log parsing operators ...

service:
  pipelines:
    logs:
      receivers: [filelog/nginx-access, filelog/nginx-errors]
      processors: [resource, batch]
      exporters: [otlp]
```

Both receivers feed into the same pipeline, and the `log.source` resource attribute lets you distinguish between them in your backend.

Structured NGINX error logs with proper severity levels make it straightforward to build alerts on specific error patterns, like upstream connection failures or SSL handshake errors, and quickly identify the root cause during incidents.
