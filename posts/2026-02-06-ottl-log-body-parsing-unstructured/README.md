# How to Implement OTTL-Based Log Body Parsing That Extracts Structured Fields from Unstructured Text

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Log Parsing, Transform Processor

Description: Use OTTL expressions in the Collector to parse unstructured log text into structured attributes using regex and pattern matching.

Many applications still produce unstructured text logs. Apache access logs, application log4j output, and legacy system logs all arrive as plain text strings. The Collector can parse these into structured attributes using OTTL's regex functions, making the logs queryable and filterable in your backend.

## The Parsing Challenge

An unstructured log line like this:

```
2026-02-06 10:30:15 ERROR [checkout-service] RequestID=abc123 User=user456 Payment failed: insufficient funds (amount=99.99, currency=USD)
```

Needs to become structured attributes:

```
timestamp: 2026-02-06 10:30:15
severity: ERROR
service: checkout-service
request_id: abc123
user_id: user456
message: Payment failed: insufficient funds
amount: 99.99
currency: USD
```

## Using replace_pattern for Extraction

OTTL does not have a dedicated "extract" function, but you can use `replace_pattern` combined with `set` to pull values from log bodies:

```yaml
processors:
  transform/parse_logs:
    log_statements:
      - context: log
        statements:
          # Extract severity from log body
          - set(severity_text, "ERROR") where IsMatch(body, ".*\\bERROR\\b.*")
          - set(severity_text, "WARN") where IsMatch(body, ".*\\bWARN\\b.*")
          - set(severity_text, "INFO") where IsMatch(body, ".*\\bINFO\\b.*")
          - set(severity_text, "DEBUG") where IsMatch(body, ".*\\bDEBUG\\b.*")

          # Map severity text to severity numbers
          - set(severity_number, 17) where severity_text == "ERROR"
          - set(severity_number, 13) where severity_text == "WARN"
          - set(severity_number, 9) where severity_text == "INFO"
          - set(severity_number, 5) where severity_text == "DEBUG"
```

## Using the Regex Operator for Field Extraction

For more precise extraction, use the filelog receiver's regex_parser operator before the transform processor:

```yaml
receivers:
  filelog:
    include:
      - /var/log/myapp/*.log
    operators:
      # Parse the structured parts of the log line
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?P<severity>\w+) \[(?P<service>[^\]]+)\] (?P<body>.*)$'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%d %H:%M:%S'
        severity:
          parse_from: attributes.severity

      # Extract key=value pairs from the remaining body
      - type: regex_parser
        regex: 'RequestID=(?P<request_id>\S+)'
        parse_from: attributes.body
        parse_to: attributes
        preserve_to: attributes.body

      - type: regex_parser
        regex: 'User=(?P<user_id>\S+)'
        parse_from: attributes.body
        parse_to: attributes
        preserve_to: attributes.body
```

## OTTL-Based Key-Value Extraction

When logs contain key=value pairs, extract them with OTTL:

```yaml
processors:
  transform/kv_extract:
    log_statements:
      - context: log
        statements:
          # Extract RequestID from body
          - set(cache, body)
          - replace_pattern(cache, ".*RequestID=(\\S+).*", "$$1")
          - set(attributes["request.id"], cache) where cache != body

          # Extract numeric values
          - set(cache, body)
          - replace_pattern(cache, ".*amount=(\\d+\\.?\\d*).*", "$$1")
          - set(attributes["payment.amount"], Double(cache)) where cache != body

          # Extract values in parentheses
          - set(cache, body)
          - replace_pattern(cache, ".*currency=(\\w+).*", "$$1")
          - set(attributes["payment.currency"], cache) where cache != body
```

## Parsing Apache Access Logs

```yaml
receivers:
  filelog:
    include:
      - /var/log/apache2/access.log
    operators:
      - type: regex_parser
        regex: '^(?P<remote_addr>[\d.]+) - (?P<remote_user>\S+) \[(?P<timestamp>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) (?P<protocol>[^"]+)" (?P<status>\d+) (?P<bytes>\d+)'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%d/%b/%Y:%H:%M:%S %z'

processors:
  transform/apache:
    log_statements:
      - context: log
        statements:
          # Map parsed fields to semantic conventions
          - set(attributes["http.method"], attributes["method"]) where attributes["method"] != nil
          - set(attributes["url.path"], attributes["path"]) where attributes["path"] != nil
          - set(attributes["http.response.status_code"], Int(attributes["status"])) where attributes["status"] != nil
          - set(attributes["http.response.body.size"], Int(attributes["bytes"])) where attributes["bytes"] != nil
          - set(attributes["client.address"], attributes["remote_addr"]) where attributes["remote_addr"] != nil

          # Clean up intermediate attributes
          - delete_key(attributes, "method")
          - delete_key(attributes, "path")
          - delete_key(attributes, "status")
          - delete_key(attributes, "bytes")
          - delete_key(attributes, "remote_addr")
          - delete_key(attributes, "remote_user")
          - delete_key(attributes, "protocol")
```

## Parsing Syslog Format

```yaml
receivers:
  filelog:
    include:
      - /var/log/syslog
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\w{3}\s+\d+ \d{2}:\d{2}:\d{2}) (?P<hostname>\S+) (?P<program>[^:\[]+)(?:\[(?P<pid>\d+)\])?: (?P<message>.*)$'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%b %e %H:%M:%S'

processors:
  transform/syslog:
    log_statements:
      - context: log
        statements:
          - set(attributes["host.name"], attributes["hostname"]) where attributes["hostname"] != nil
          - set(attributes["process.name"], attributes["program"]) where attributes["program"] != nil
          - set(attributes["process.pid"], Int(attributes["pid"])) where attributes["pid"] != nil
          - set(body, attributes["message"]) where attributes["message"] != nil

          # Clean up
          - delete_key(attributes, "hostname")
          - delete_key(attributes, "program")
          - delete_key(attributes, "pid")
          - delete_key(attributes, "message")
```

## Full Pipeline Configuration

```yaml
receivers:
  filelog:
    include:
      - /var/log/myapp/*.log
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\S+ \S+) (?P<level>\w+) \[(?P<service>[^\]]+)\] (?P<body>.*)$'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%d %H:%M:%S'
        severity:
          parse_from: attributes.level

processors:
  transform/enrich:
    log_statements:
      - context: log
        statements:
          # Extract key-value pairs from body
          - set(cache, body)
          - replace_pattern(cache, ".*RequestID=(\\S+).*", "$$1")
          - set(attributes["request.id"], cache) where cache != body and IsMatch(body, ".*RequestID=.*")

          # Set service name from parsed field
          - set(resource.attributes["service.name"], attributes["service"]) where attributes["service"] != nil
          - delete_key(attributes, "service")

  batch:
    send_batch_size: 1024
    timeout: 5s

exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [transform/enrich, batch]
      exporters: [otlp]
```

OTTL-based log parsing transforms unstructured text into structured, queryable data right in the Collector pipeline. Combined with the filelog receiver's regex operators, you can handle virtually any log format without changing the applications that produce them.
