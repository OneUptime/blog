# How to Use OTTL-Based Log Body Parsing That Extracts Structured Fields from

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Log Parsing, Transform Processor

Description: Use OTTL expressions in the Collector to parse unstructured log text into structured attributes using regex and pattern matching.

Many applications still produce unstructured text logs. Apache access logs, application log4j output, and legacy system logs all arrive as plain text strings. The Collector can parse these into structured attributes using OTTL's regex functions, making the logs queryable and filterable in your backend.

## The Parsing Challenge

An unstructured log line like this:

```text
2026-02-06 10:30:15 ERROR [checkout-service] RequestID=abc123 User=user456 Payment failed: insufficient funds (amount=99.99, currency=USD)
```

Needs to become structured attributes:

```text
timestamp: 2026-02-06 10:30:15
severity: ERROR
service: checkout-service
request_id: abc123
user_id: user456
message: Payment failed: insufficient funds
amount: 99.99
currency: USD
```

## Using OTTL for Extraction

OTTL includes `ExtractPatterns` for named regex captures, and `replace_pattern` can also be useful when you need to rewrite matched text before setting fields:

```yaml
processors:
  transform/parse_logs:
    log_statements:
      - context: log
        statements:
          # Extract severity from log body
          - set(log.severity_text, "ERROR") where IsString(log.body) and IsMatch(log.body, ".*\\bERROR\\b.*")
          - set(log.severity_text, "WARN") where IsString(log.body) and IsMatch(log.body, ".*\\bWARN\\b.*")
          - set(log.severity_text, "INFO") where IsString(log.body) and IsMatch(log.body, ".*\\bINFO\\b.*")
          - set(log.severity_text, "DEBUG") where IsString(log.body) and IsMatch(log.body, ".*\\bDEBUG\\b.*")

          # Map severity text to severity numbers
          - set(log.severity_number, SEVERITY_NUMBER_ERROR) where log.severity_text == "ERROR"
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where log.severity_text == "WARN"
          - set(log.severity_number, SEVERITY_NUMBER_INFO) where log.severity_text == "INFO"
          - set(log.severity_number, SEVERITY_NUMBER_DEBUG) where log.severity_text == "DEBUG"
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
          layout_type: strptime
          layout: '%Y-%m-%d %H:%M:%S'
        severity:
          parse_from: attributes.severity

      # Extract key=value pairs from the remaining body
      - type: regex_parser
        regex: 'RequestID=(?P<request_id>\S+)'
        parse_from: attributes.body
        parse_to: attributes

      - type: regex_parser
        regex: 'User=(?P<user_id>\S+)'
        parse_from: attributes.body
        parse_to: attributes
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
          - merge_maps(log.cache, ExtractPatterns(log.body, "RequestID=(?P<request_id>\\S+)"), "upsert") where IsString(log.body)
          - set(log.attributes["request.id"], log.cache["request_id"])

          # Extract numeric values
          - merge_maps(log.cache, ExtractPatterns(log.body, "amount=(?P<amount>\\d+\\.?\\d*)"), "upsert") where IsString(log.body)
          - set(log.attributes["payment.amount"], Double(log.cache["amount"])) where log.cache["amount"] != nil

          # Extract values in parentheses
          - merge_maps(log.cache, ExtractPatterns(log.body, "currency=(?P<currency>\\w+)"), "upsert") where IsString(log.body)
          - set(log.attributes["payment.currency"], log.cache["currency"])
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
          layout_type: strptime
          layout: '%d/%b/%Y:%H:%M:%S %z'

processors:
  transform/apache:
    log_statements:
      - context: log
        statements:
          # Map parsed fields to semantic conventions
          - set(log.attributes["http.request.method"], log.attributes["method"]) where log.attributes["method"] != nil
          - set(log.attributes["url.path"], log.attributes["path"]) where log.attributes["path"] != nil
          - set(log.attributes["http.response.status_code"], Int(log.attributes["status"])) where log.attributes["status"] != nil
          - set(log.attributes["http.response.body.size"], Int(log.attributes["bytes"])) where log.attributes["bytes"] != nil
          - set(log.attributes["client.address"], log.attributes["remote_addr"]) where log.attributes["remote_addr"] != nil

          # Clean up intermediate attributes
          - delete_key(log.attributes, "method")
          - delete_key(log.attributes, "path")
          - delete_key(log.attributes, "status")
          - delete_key(log.attributes, "bytes")
          - delete_key(log.attributes, "remote_addr")
          - delete_key(log.attributes, "remote_user")
          - delete_key(log.attributes, "protocol")
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
          layout_type: strptime
          layout: '%b %e %H:%M:%S'

processors:
  transform/syslog:
    log_statements:
      - context: log
        statements:
          - set(log.attributes["host.name"], log.attributes["hostname"]) where log.attributes["hostname"] != nil
          - set(log.attributes["process.name"], log.attributes["program"]) where log.attributes["program"] != nil
          - set(log.attributes["process.pid"], Int(log.attributes["pid"])) where log.attributes["pid"] != nil
          - set(log.body, log.attributes["message"]) where log.attributes["message"] != nil

          # Clean up
          - delete_key(log.attributes, "hostname")
          - delete_key(log.attributes, "program")
          - delete_key(log.attributes, "pid")
          - delete_key(log.attributes, "message")
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
          layout_type: strptime
          layout: '%Y-%m-%d %H:%M:%S'
        severity:
          parse_from: attributes.level

processors:
  transform/enrich:
    log_statements:
      - context: log
        statements:
          # Extract key-value pairs from body
          - merge_maps(log.cache, ExtractPatterns(log.body, "RequestID=(?P<request_id>\\S+)"), "upsert") where IsString(log.body)
          - set(log.attributes["request.id"], log.cache["request_id"])

          # Set service name from parsed field
          - set(resource.attributes["service.name"], log.attributes["service"]) where log.attributes["service"] != nil
          - delete_key(log.attributes, "service")

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
