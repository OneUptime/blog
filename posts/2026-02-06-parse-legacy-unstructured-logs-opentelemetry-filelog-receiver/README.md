# How to Parse Legacy Unstructured Logs into OpenTelemetry Structured Format Using the Filelog Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Filelog Receiver, Log Parsing, Legacy Systems

Description: Parse unstructured legacy application logs into structured OpenTelemetry format using the Filelog receiver and operators.

Legacy applications produce logs in all kinds of formats. Apache access logs, syslog messages, custom application logs with timestamps jammed in random positions. These logs contain valuable data, but they are stuck in unstructured text that is hard to search and impossible to correlate with traces. The OpenTelemetry Collector's Filelog receiver can tail these log files and parse them into structured records using a chain of operators.

This post covers how to configure the Filelog receiver to handle several common legacy log formats and turn them into proper OpenTelemetry log records.

## How the Filelog Receiver Works

The Filelog receiver watches one or more log files (like `tail -f`) and reads new lines as they appear. Each line goes through a pipeline of operators that can:

- Parse the line with regex, JSON, or other parsers
- Extract timestamps and severity levels
- Add attributes from parsed fields
- Transform or rename fields

The result is a structured OpenTelemetry log record with typed attributes, proper timestamps, and severity levels.

## Example 1: Parsing Apache Access Logs

Apache access logs in the Combined format look like this:

```
192.168.1.50 - frank [06/Feb/2026:13:55:36 -0700] "GET /api/users HTTP/1.1" 200 2326 "https://example.com" "Mozilla/5.0"
```

Here is a Filelog receiver config that parses this format into structured fields:

```yaml
# otel-collector-config.yaml
receivers:
  filelog/apache:
    include:
      - /var/log/apache2/access.log
    start_at: end
    operators:
      # Parse the Combined Log Format using regex
      - type: regex_parser
        regex: '^(?P<remote_addr>[^\s]+) - (?P<remote_user>[^\s]+) \[(?P<timestamp>[^\]]+)\] "(?P<method>[A-Z]+) (?P<path>[^\s]+) (?P<protocol>[^"]+)" (?P<status>\d+) (?P<bytes>\d+) "(?P<referrer>[^"]*)" "(?P<user_agent>[^"]*)"'
        timestamp:
          parse_from: attributes.timestamp
          layout: "02/Jan/2006:15:04:05 -0700"
        severity:
          parse_from: attributes.status
          mapping:
            # Map HTTP status codes to log severity levels
            info: ["200", "201", "204", "301", "302", "304"]
            warn: ["400", "401", "403", "404", "405"]
            error: ["500", "502", "503", "504"]

      # Convert bytes and status to integers for proper typing
      - type: add
        field: attributes.http.method
        value: EXPR(attributes.method)

      # Clean up the temporary parsed fields
      - type: remove
        field: attributes.method
```

## Example 2: Parsing Custom Application Logs

Many legacy apps use their own format. Let's say you have logs that look like this:

```
2026-02-06 14:22:33.145 [WARN] [thread-pool-7] com.app.OrderService - Order processing delayed for customer cust_1234, retry attempt 3
```

Here is the receiver config for that format:

```yaml
receivers:
  filelog/app:
    include:
      - /var/log/myapp/*.log
    start_at: end
    # Handle multi-line stack traces: lines starting with whitespace
    # or "Caused by" belong to the previous log entry
    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2}'
    operators:
      # Parse the main log line structure
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[(?P<severity>[A-Z]+)\] \[(?P<thread>[^\]]+)\] (?P<logger>[^\s]+) - (?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "2006-01-02 15:04:05.000"
        severity:
          parse_from: attributes.severity
          mapping:
            trace: "TRACE"
            debug: "DEBUG"
            info: "INFO"
            warn: "WARN"
            error: "ERROR"
            fatal: "FATAL"

      # Move the message to the log body where it belongs
      - type: move
        from: attributes.message
        to: body

      # Try to extract structured data from the message text
      # For example, extract customer IDs and retry counts
      - type: regex_parser
        parse_from: body
        regex: 'customer (?P<customer_id>cust_\w+)'
        if: 'body matches "customer cust_"'

      - type: regex_parser
        parse_from: body
        regex: 'retry attempt (?P<retry_count>\d+)'
        if: 'body matches "retry attempt"'
```

## Example 3: Parsing Syslog Messages

Syslog messages from network devices and older Linux services follow RFC 3164 or RFC 5424 formats:

```
<134>Feb  6 14:30:22 webserver01 nginx: upstream timed out (110: Connection timed out) while reading response header
```

The Filelog receiver has a built-in syslog parser for this:

```yaml
receivers:
  filelog/syslog:
    include:
      - /var/log/syslog
      - /var/log/messages
    start_at: end
    operators:
      # Use the built-in syslog parser
      - type: syslog_parser
        protocol: rfc3164

      # Add the facility and priority as attributes
      - type: add
        field: attributes.log.source
        value: "syslog"
```

## Putting It All Together

You can run multiple Filelog receivers in a single collector, each handling a different log format. Here is a complete collector config that handles all three formats:

```yaml
receivers:
  filelog/apache:
    include: ["/var/log/apache2/access.log"]
    start_at: end
    operators:
      - type: regex_parser
        regex: '^(?P<remote_addr>[^\s]+) - (?P<remote_user>[^\s]+) \[(?P<timestamp>[^\]]+)\] "(?P<method>[A-Z]+) (?P<path>[^\s]+) (?P<protocol>[^"]+)" (?P<status>\d+) (?P<bytes>\d+)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "02/Jan/2006:15:04:05 -0700"

  filelog/app:
    include: ["/var/log/myapp/*.log"]
    start_at: end
    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2}'
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[(?P<severity>[A-Z]+)\] \[(?P<thread>[^\]]+)\] (?P<logger>[^\s]+) - (?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "2006-01-02 15:04:05.000"
        severity:
          parse_from: attributes.severity

processors:
  # Tag each log source for easy filtering
  resource:
    attributes:
      - key: service.name
        value: "legacy-log-collector"
        action: upsert

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/apache, filelog/app]
      processors: [resource, batch]
      exporters: [otlp]
```

## Tips for Writing Regex Parsers

Test your regex patterns against real log samples before deploying. An incorrect pattern will silently drop fields or fail to parse entirely. Use a tool like regex101.com with the Go flavor (since the collector is written in Go and uses Go's regex engine).

Named capture groups (`?P<name>`) become attributes on the log record. Keep the names consistent with OpenTelemetry semantic conventions where possible (e.g., `http.method` instead of just `method`).

## Wrapping Up

The Filelog receiver is the workhorse for bringing legacy logs into OpenTelemetry. You do not need to modify the applications producing the logs. Just point the receiver at the log files, define a parsing pipeline, and your unstructured text becomes structured, queryable log records that live alongside your traces and metrics.
