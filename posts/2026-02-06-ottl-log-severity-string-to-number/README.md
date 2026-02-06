# How to Implement OTTL Transformations That Convert Log Severity Strings to OpenTelemetry Severity Numbers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Log Severity, Transform Processor

Description: Convert log severity strings like ERROR, WARN, INFO to OpenTelemetry severity numbers using OTTL in the Collector transform processor.

The OpenTelemetry log data model defines both `severity_text` (a string like "ERROR") and `severity_number` (a numeric value like 17). Many log sources only provide severity as text, but backends often need the numeric value for filtering, sorting, and alerting. OTTL in the transform processor lets you map severity strings to the standard OpenTelemetry severity numbers.

## The OpenTelemetry Severity Number Scale

The specification defines this mapping:

| Severity Text | Severity Number | Short Name |
|--------------|-----------------|------------|
| TRACE | 1 | TRACE |
| TRACE2 | 2 | TRACE2 |
| TRACE3 | 3 | TRACE3 |
| TRACE4 | 4 | TRACE4 |
| DEBUG | 5 | DEBUG |
| DEBUG2 | 6 | DEBUG2 |
| DEBUG3 | 7 | DEBUG3 |
| DEBUG4 | 8 | DEBUG4 |
| INFO | 9 | INFO |
| INFO2 | 10 | INFO2 |
| INFO3 | 11 | INFO3 |
| INFO4 | 12 | INFO4 |
| WARN | 13 | WARN |
| WARN2 | 14 | WARN2 |
| WARN3 | 15 | WARN3 |
| WARN4 | 16 | WARN4 |
| ERROR | 17 | ERROR |
| ERROR2 | 18 | ERROR2 |
| ERROR3 | 19 | ERROR3 |
| ERROR4 | 20 | ERROR4 |
| FATAL | 21 | FATAL |
| FATAL2 | 22 | FATAL2 |
| FATAL3 | 23 | FATAL3 |
| FATAL4 | 24 | FATAL4 |

## Basic Severity Mapping

```yaml
processors:
  transform/severity:
    log_statements:
      - context: log
        statements:
          # Map common severity strings to OpenTelemetry severity numbers
          - set(severity_number, 1) where severity_text == "TRACE"
          - set(severity_number, 5) where severity_text == "DEBUG"
          - set(severity_number, 9) where severity_text == "INFO"
          - set(severity_number, 13) where severity_text == "WARN"
          - set(severity_number, 13) where severity_text == "WARNING"
          - set(severity_number, 17) where severity_text == "ERROR"
          - set(severity_number, 21) where severity_text == "FATAL"
          - set(severity_number, 21) where severity_text == "CRITICAL"
          - set(severity_number, 21) where severity_text == "PANIC"
```

## Handling Case Variations

Different logging frameworks use different casing. Handle them all:

```yaml
processors:
  transform/severity_case:
    log_statements:
      - context: log
        statements:
          # Uppercase variants
          - set(severity_number, 5) where severity_text == "DEBUG"
          - set(severity_number, 9) where severity_text == "INFO"
          - set(severity_number, 13) where severity_text == "WARN"
          - set(severity_number, 13) where severity_text == "WARNING"
          - set(severity_number, 17) where severity_text == "ERROR"
          - set(severity_number, 21) where severity_text == "FATAL"

          # Lowercase variants
          - set(severity_number, 5) where severity_text == "debug"
          - set(severity_number, 9) where severity_text == "info"
          - set(severity_number, 13) where severity_text == "warn"
          - set(severity_number, 13) where severity_text == "warning"
          - set(severity_number, 17) where severity_text == "error"
          - set(severity_number, 21) where severity_text == "fatal"

          # Mixed case (Java/log4j style)
          - set(severity_number, 5) where severity_text == "Debug"
          - set(severity_number, 9) where severity_text == "Info"
          - set(severity_number, 13) where severity_text == "Warn"
          - set(severity_number, 17) where severity_text == "Error"
          - set(severity_number, 21) where severity_text == "Fatal"
```

A cleaner approach using `IsMatch` with case-insensitive regex:

```yaml
processors:
  transform/severity_regex:
    log_statements:
      - context: log
        statements:
          - set(severity_number, 1) where IsMatch(severity_text, "(?i)^trace$")
          - set(severity_number, 5) where IsMatch(severity_text, "(?i)^debug$")
          - set(severity_number, 9) where IsMatch(severity_text, "(?i)^info$")
          - set(severity_number, 13) where IsMatch(severity_text, "(?i)^warn(ing)?$")
          - set(severity_number, 17) where IsMatch(severity_text, "(?i)^err(or)?$")
          - set(severity_number, 21) where IsMatch(severity_text, "(?i)^(fatal|critical|panic|emerg(ency)?)$")
```

## Python Logging Level Mapping

Python uses numeric levels that differ from OpenTelemetry:

```yaml
processors:
  transform/python_severity:
    log_statements:
      - context: log
        statements:
          # Python logging levels to OTel severity numbers
          # Python DEBUG=10, INFO=20, WARNING=30, ERROR=40, CRITICAL=50
          - set(severity_number, 5) where attributes["python.logging.level"] == 10
          - set(severity_number, 9) where attributes["python.logging.level"] == 20
          - set(severity_number, 13) where attributes["python.logging.level"] == 30
          - set(severity_number, 17) where attributes["python.logging.level"] == 40
          - set(severity_number, 21) where attributes["python.logging.level"] == 50

          # Also set severity_text for consistency
          - set(severity_text, "DEBUG") where attributes["python.logging.level"] == 10
          - set(severity_text, "INFO") where attributes["python.logging.level"] == 20
          - set(severity_text, "WARN") where attributes["python.logging.level"] == 30
          - set(severity_text, "ERROR") where attributes["python.logging.level"] == 40
          - set(severity_text, "FATAL") where attributes["python.logging.level"] == 50
```

## Extracting Severity from Log Body

When severity is embedded in the log body text:

```yaml
processors:
  transform/extract_severity:
    log_statements:
      - context: log
        statements:
          # Extract severity from log body patterns like:
          # "2026-02-06 10:30:00 ERROR Something went wrong"
          - set(severity_text, "ERROR") where severity_text == "" and IsMatch(body, "(?i)\\bERROR\\b")
          - set(severity_text, "WARN") where severity_text == "" and IsMatch(body, "(?i)\\bWARN(ING)?\\b")
          - set(severity_text, "INFO") where severity_text == "" and IsMatch(body, "(?i)\\bINFO\\b")
          - set(severity_text, "DEBUG") where severity_text == "" and IsMatch(body, "(?i)\\bDEBUG\\b")
          - set(severity_text, "FATAL") where severity_text == "" and IsMatch(body, "(?i)\\b(FATAL|CRITICAL)\\b")

          # Then map text to number
          - set(severity_number, 5) where severity_text == "DEBUG"
          - set(severity_number, 9) where severity_text == "INFO"
          - set(severity_number, 13) where severity_text == "WARN"
          - set(severity_number, 17) where severity_text == "ERROR"
          - set(severity_number, 21) where severity_text == "FATAL"
```

## Full Pipeline Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  filelog:
    include:
      - /var/log/myapp/*.log

processors:
  transform/severity:
    log_statements:
      - context: log
        statements:
          # Case-insensitive severity mapping
          - set(severity_number, 1) where IsMatch(severity_text, "(?i)^trace$")
          - set(severity_number, 5) where IsMatch(severity_text, "(?i)^debug$")
          - set(severity_number, 9) where IsMatch(severity_text, "(?i)^info$")
          - set(severity_number, 13) where IsMatch(severity_text, "(?i)^warn(ing)?$")
          - set(severity_number, 17) where IsMatch(severity_text, "(?i)^err(or)?$")
          - set(severity_number, 21) where IsMatch(severity_text, "(?i)^(fatal|critical|panic)$")

          # Normalize severity_text to uppercase
          - set(severity_text, "TRACE") where severity_number >= 1 and severity_number <= 4
          - set(severity_text, "DEBUG") where severity_number >= 5 and severity_number <= 8
          - set(severity_text, "INFO") where severity_number >= 9 and severity_number <= 12
          - set(severity_text, "WARN") where severity_number >= 13 and severity_number <= 16
          - set(severity_text, "ERROR") where severity_number >= 17 and severity_number <= 20
          - set(severity_text, "FATAL") where severity_number >= 21 and severity_number <= 24

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
      receivers: [otlp, filelog]
      processors: [transform/severity, batch]
      exporters: [otlp]
```

## Filtering by Severity Number

Once severity numbers are set, you can filter logs by severity in subsequent processors:

```yaml
processors:
  filter/drop_debug:
    logs:
      log_record:
        - 'severity_number < 9'  # Drop TRACE and DEBUG logs
```

Mapping severity strings to numbers in the Collector normalizes log severity across all your applications and log sources. This gives you consistent severity-based filtering, routing, and alerting regardless of which logging framework each service uses.
