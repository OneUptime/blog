# How to Use OTTL Transformations That Convert Log Severity Strings to

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
          - set(log.severity_number, SEVERITY_NUMBER_TRACE) where log.severity_text == "TRACE"
          - set(log.severity_number, SEVERITY_NUMBER_DEBUG) where log.severity_text == "DEBUG"
          - set(log.severity_number, SEVERITY_NUMBER_INFO) where log.severity_text == "INFO"
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where log.severity_text == "WARN"
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where log.severity_text == "WARNING"
          - set(log.severity_number, SEVERITY_NUMBER_ERROR) where log.severity_text == "ERROR"
          - set(log.severity_number, SEVERITY_NUMBER_FATAL) where log.severity_text == "FATAL"
          - set(log.severity_number, SEVERITY_NUMBER_FATAL) where log.severity_text == "CRITICAL"
          - set(log.severity_number, SEVERITY_NUMBER_FATAL) where log.severity_text == "PANIC"
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
          - set(log.severity_number, SEVERITY_NUMBER_DEBUG) where log.severity_text == "DEBUG"
          - set(log.severity_number, SEVERITY_NUMBER_INFO) where log.severity_text == "INFO"
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where log.severity_text == "WARN"
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where log.severity_text == "WARNING"
          - set(log.severity_number, SEVERITY_NUMBER_ERROR) where log.severity_text == "ERROR"
          - set(log.severity_number, SEVERITY_NUMBER_FATAL) where log.severity_text == "FATAL"

          # Lowercase variants
          - set(log.severity_number, SEVERITY_NUMBER_DEBUG) where log.severity_text == "debug"
          - set(log.severity_number, SEVERITY_NUMBER_INFO) where log.severity_text == "info"
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where log.severity_text == "warn"
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where log.severity_text == "warning"
          - set(log.severity_number, SEVERITY_NUMBER_ERROR) where log.severity_text == "error"
          - set(log.severity_number, SEVERITY_NUMBER_FATAL) where log.severity_text == "fatal"

          # Mixed case (Java/log4j style)
          - set(log.severity_number, SEVERITY_NUMBER_DEBUG) where log.severity_text == "Debug"
          - set(log.severity_number, SEVERITY_NUMBER_INFO) where log.severity_text == "Info"
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where log.severity_text == "Warn"
          - set(log.severity_number, SEVERITY_NUMBER_ERROR) where log.severity_text == "Error"
          - set(log.severity_number, SEVERITY_NUMBER_FATAL) where log.severity_text == "Fatal"
```

A cleaner approach using `IsMatch` with case-insensitive regex:

```yaml
processors:
  transform/severity_regex:
    log_statements:
      - context: log
        statements:
          - set(log.severity_number, SEVERITY_NUMBER_TRACE) where IsMatch(log.severity_text, "(?i)^trace$")
          - set(log.severity_number, SEVERITY_NUMBER_DEBUG) where IsMatch(log.severity_text, "(?i)^debug$")
          - set(log.severity_number, SEVERITY_NUMBER_INFO) where IsMatch(log.severity_text, "(?i)^info$")
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where IsMatch(log.severity_text, "(?i)^warn(ing)?$")
          - set(log.severity_number, SEVERITY_NUMBER_ERROR) where IsMatch(log.severity_text, "(?i)^err(or)?$")
          - set(log.severity_number, SEVERITY_NUMBER_FATAL) where IsMatch(log.severity_text, "(?i)^(fatal|critical|panic|emerg(ency)?)$")
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
          - set(log.severity_number, SEVERITY_NUMBER_DEBUG) where log.attributes["python.logging.level"] == 10
          - set(log.severity_number, SEVERITY_NUMBER_INFO) where log.attributes["python.logging.level"] == 20
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where log.attributes["python.logging.level"] == 30
          - set(log.severity_number, SEVERITY_NUMBER_ERROR) where log.attributes["python.logging.level"] == 40
          - set(log.severity_number, SEVERITY_NUMBER_FATAL) where log.attributes["python.logging.level"] == 50

          # Also set log.severity_text for consistency
          - set(log.severity_text, "DEBUG") where log.attributes["python.logging.level"] == 10
          - set(log.severity_text, "INFO") where log.attributes["python.logging.level"] == 20
          - set(log.severity_text, "WARN") where log.attributes["python.logging.level"] == 30
          - set(log.severity_text, "ERROR") where log.attributes["python.logging.level"] == 40
          - set(log.severity_text, "FATAL") where log.attributes["python.logging.level"] == 50
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
          - set(log.severity_text, "ERROR") where log.severity_text == "" and IsString(log.body) and IsMatch(log.body, "(?i)\\bERROR\\b")
          - set(log.severity_text, "WARN") where log.severity_text == "" and IsString(log.body) and IsMatch(log.body, "(?i)\\bWARN(ING)?\\b")
          - set(log.severity_text, "INFO") where log.severity_text == "" and IsString(log.body) and IsMatch(log.body, "(?i)\\bINFO\\b")
          - set(log.severity_text, "DEBUG") where log.severity_text == "" and IsString(log.body) and IsMatch(log.body, "(?i)\\bDEBUG\\b")
          - set(log.severity_text, "FATAL") where log.severity_text == "" and IsString(log.body) and IsMatch(log.body, "(?i)\\b(FATAL|CRITICAL)\\b")

          # Then map text to number
          - set(log.severity_number, SEVERITY_NUMBER_DEBUG) where log.severity_text == "DEBUG"
          - set(log.severity_number, SEVERITY_NUMBER_INFO) where log.severity_text == "INFO"
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where log.severity_text == "WARN"
          - set(log.severity_number, SEVERITY_NUMBER_ERROR) where log.severity_text == "ERROR"
          - set(log.severity_number, SEVERITY_NUMBER_FATAL) where log.severity_text == "FATAL"
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
          - set(log.severity_number, SEVERITY_NUMBER_TRACE) where IsMatch(log.severity_text, "(?i)^trace$")
          - set(log.severity_number, SEVERITY_NUMBER_DEBUG) where IsMatch(log.severity_text, "(?i)^debug$")
          - set(log.severity_number, SEVERITY_NUMBER_INFO) where IsMatch(log.severity_text, "(?i)^info$")
          - set(log.severity_number, SEVERITY_NUMBER_WARN) where IsMatch(log.severity_text, "(?i)^warn(ing)?$")
          - set(log.severity_number, SEVERITY_NUMBER_ERROR) where IsMatch(log.severity_text, "(?i)^err(or)?$")
          - set(log.severity_number, SEVERITY_NUMBER_FATAL) where IsMatch(log.severity_text, "(?i)^(fatal|critical|panic)$")

          # Normalize log.severity_text to uppercase
          - set(log.severity_text, "TRACE") where log.severity_number >= SEVERITY_NUMBER_TRACE and log.severity_number <= SEVERITY_NUMBER_TRACE4
          - set(log.severity_text, "DEBUG") where log.severity_number >= SEVERITY_NUMBER_DEBUG and log.severity_number <= SEVERITY_NUMBER_DEBUG4
          - set(log.severity_text, "INFO") where log.severity_number >= SEVERITY_NUMBER_INFO and log.severity_number <= SEVERITY_NUMBER_INFO4
          - set(log.severity_text, "WARN") where log.severity_number >= SEVERITY_NUMBER_WARN and log.severity_number <= SEVERITY_NUMBER_WARN4
          - set(log.severity_text, "ERROR") where log.severity_number >= SEVERITY_NUMBER_ERROR and log.severity_number <= SEVERITY_NUMBER_ERROR4
          - set(log.severity_text, "FATAL") where log.severity_number >= SEVERITY_NUMBER_FATAL and log.severity_number <= SEVERITY_NUMBER_FATAL4

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
    log_conditions:
      - 'log.severity_number < SEVERITY_NUMBER_INFO'  # Drop TRACE and DEBUG logs
```

Mapping severity strings to numbers in the Collector normalizes log severity across all your applications and log sources. This gives you consistent severity-based filtering, routing, and alerting regardless of which logging framework each service uses.
