# How to Use the Router Operator to Handle Mixed Log Formats (NGINX, JSON, Syslog) in One Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Router Operator, Mixed Logs, Log Parsing, Filelog Receiver

Description: Use the filelog receiver router operator to handle multiple log formats like NGINX, JSON, and syslog within a single pipeline.

In real-world infrastructure, a single Collector instance often needs to handle logs from many different sources. You might have NGINX access logs, JSON application logs, and syslog messages all arriving on the same host. The router operator in the filelog receiver lets you inspect each log line and send it to the appropriate parser based on its format.

## The Router Operator

The router operator evaluates expressions against each log entry and sends it to the matching parser. It works like a switch statement for log formats:

```yaml
operators:
  - type: router
    id: format_router
    routes:
      - output: parse_nginx
        expr: 'body matches "^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+ - "'
      - output: parse_json
        expr: 'body matches "^\\{"'
      - output: parse_syslog
        expr: 'body matches "^<[0-9]+>"'
    default: pass_through
```

Each route has an `expr` (a boolean expression) and an `output` (the ID of the next operator to use). The `default` route catches anything that does not match.

## Complete Multi-Format Configuration

```yaml
receivers:
  filelog/mixed:
    include:
      - /var/log/nginx/access.log
      - /var/log/app/*.log
      - /var/log/syslog
    start_at: end
    operators:
      # Route to the appropriate parser based on log format
      - type: router
        id: format_router
        routes:
          - output: parse_nginx
            expr: 'body matches "^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+ - "'
          - output: parse_json
            expr: 'body matches "^\\{"'
          - output: parse_syslog
            expr: 'body matches "^<[0-9]+>"'
        default: tag_unknown

      # NGINX access log parser
      - type: regex_parser
        id: parse_nginx
        regex: '^(?P<remote_addr>[^\s]+) - (?P<remote_user>[^\s]+) \[(?P<time_local>[^\]]+)\] "(?P<method>[A-Z]+) (?P<path>[^\s]+) (?P<protocol>[^"]+)" (?P<status>\d{3}) (?P<bytes>\d+)'
        output: tag_nginx
        on_error: tag_unknown
        timestamp:
          parse_from: attributes.time_local
          layout: "02/Jan/2006:15:04:05 -0700"
      - type: add
        id: tag_nginx
        field: attributes["log.format"]
        value: "nginx"
        output: merge_point

      # JSON application log parser
      - type: json_parser
        id: parse_json
        output: tag_json
        on_error: tag_unknown
      - type: add
        id: tag_json
        field: attributes["log.format"]
        value: "json"
        output: extract_json_severity
      - type: severity_parser
        id: extract_json_severity
        parse_from: attributes.level
        if: 'attributes.level != nil'
        mapping:
          error: ["ERROR", "error", "CRITICAL"]
          warn: ["WARN", "warn", "WARNING"]
          info: ["INFO", "info"]
          debug: ["DEBUG", "debug"]
        output: merge_point

      # Syslog parser
      - type: regex_parser
        id: parse_syslog
        regex: '^<(?P<priority>\d+)>(?P<timestamp>\w{3}\s+\d{1,2} \d{2}:\d{2}:\d{2}) (?P<hostname>[^\s]+) (?P<app_name>[^\[]+)(?:\[(?P<proc_id>\d+)\])?: (?P<message>.*)'
        output: tag_syslog
        on_error: tag_unknown
      - type: add
        id: tag_syslog
        field: attributes["log.format"]
        value: "syslog"
        output: merge_point

      # Unknown format handler
      - type: add
        id: tag_unknown
        field: attributes["log.format"]
        value: "unknown"
        output: merge_point

      # All paths converge here
      - type: noop
        id: merge_point
```

## Using File Path-Based Routing

Instead of (or in addition to) content-based routing, you can route based on which file the log came from:

```yaml
receivers:
  filelog/mixed:
    include:
      - /var/log/nginx/*.log
      - /var/log/app/*.log
      - /var/log/syslog
    start_at: end
    include_file_path: true
    operators:
      - type: router
        id: file_router
        routes:
          - output: parse_nginx
            expr: 'attributes["log.file.path"] matches "/var/log/nginx/"'
          - output: parse_json
            expr: 'attributes["log.file.path"] matches "/var/log/app/"'
          - output: parse_syslog
            expr: 'attributes["log.file.path"] matches "/var/log/syslog"'
        default: pass_raw
```

File path-based routing is faster and more reliable than content-based pattern matching since it does not require regex evaluation of the log body.

## Full Collector Configuration

```yaml
receivers:
  filelog/mixed:
    include:
      - /var/log/nginx/access.log
      - /var/log/app/*.log
      - /var/log/syslog
    start_at: end
    include_file_path: true
    operators:
      - type: router
        id: file_router
        routes:
          - output: parse_nginx
            expr: 'attributes["log.file.path"] matches "nginx"'
          - output: parse_json
            expr: 'attributes["log.file.path"] matches "/var/log/app/"'
          - output: parse_syslog
            expr: 'attributes["log.file.path"] matches "syslog"'
        default: keep_raw

      - type: regex_parser
        id: parse_nginx
        regex: '^(?P<remote_addr>[^\s]+) - [^\s]+ \[(?P<time_local>[^\]]+)\] "(?P<method>\w+) (?P<path>[^\s]+) [^"]+" (?P<status>\d+) (?P<bytes>\d+)'
        on_error: keep_raw
        timestamp:
          parse_from: attributes.time_local
          layout: "02/Jan/2006:15:04:05 -0700"
        output: done

      - type: json_parser
        id: parse_json
        on_error: keep_raw
        output: done

      - type: regex_parser
        id: parse_syslog
        regex: '^<(?P<priority>\d+)>(?P<message>.*)'
        on_error: keep_raw
        output: done

      - type: noop
        id: keep_raw
        output: done

      - type: noop
        id: done

processors:
  resource/service:
    attributes:
      - key: service.name
        value: "mixed-host"
        action: upsert
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/mixed]
      processors: [resource/service, batch]
      exporters: [otlp]
```

## Combining Content and Path Routing

For the most robust approach, use both file path and content-based routing:

```yaml
operators:
  # First, route by file path (fast)
  - type: router
    id: path_router
    routes:
      - output: nginx_content_check
        expr: 'attributes["log.file.path"] matches "nginx"'
      - output: app_content_check
        expr: 'attributes["log.file.path"] matches "/var/log/app/"'
    default: generic_parser

  # Then, verify content matches expected format
  - type: router
    id: nginx_content_check
    routes:
      - output: parse_nginx
        expr: 'body matches "^[0-9]"'
    default: generic_parser

  - type: router
    id: app_content_check
    routes:
      - output: parse_json
        expr: 'body matches "^\\{"'
    default: generic_parser
```

This two-stage routing catches cases where a non-standard log line appears in an otherwise well-formatted file (such as a startup message in an NGINX log file).

The router operator is the key to building a single Collector that handles diverse log sources. It keeps your deployment simple (one Collector per host) while correctly parsing each log format.
