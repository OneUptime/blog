# How to Parse Multiline Python Tracebacks with the OpenTelemetry Filelog Receiver multiline Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Tracebacks, Multiline Logs, Filelog Receiver

Description: Configure the OpenTelemetry filelog receiver to group and parse multiline Python tracebacks into single structured log records.

Python tracebacks have a distinctive format that differs from Java stack traces. They start with "Traceback (most recent call last):" and end with the actual exception line. The filelog receiver needs specific configuration to group these correctly.

## Python Traceback Format

A Python traceback looks like this:

```
2026-02-06 14:23:45,123 ERROR django.request - Internal Server Error: /api/orders
Traceback (most recent call last):
  File "/app/views.py", line 42, in create_order
    result = payment_service.charge(order)
  File "/app/services/payment.py", line 87, in charge
    response = self.client.post(url, data=payload)
  File "/app/lib/http.py", line 23, in post
    raise ConnectionError(f"Failed to connect to {url}")
ConnectionError: Failed to connect to https://payments.internal/charge
2026-02-06 14:23:45,456 INFO django.request - Returning 500 for /api/orders
```

The key challenge is that Python tracebacks are "bottom-up" - the root cause is at the bottom, and lines start with "File", "Traceback", or the exception class.

## Multiline Configuration

Use `line_start_pattern` to match the beginning of each log entry (the timestamp line):

```yaml
receivers:
  filelog/python:
    include:
      - /var/log/python-app/*.log
    start_at: end
    multiline:
      # Match timestamp at the start of a new log entry
      line_start_pattern: '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'
```

This groups the traceback with the log line that precedes it, producing a single log record containing both the error message and the full traceback.

## Complete Configuration

```yaml
receivers:
  filelog/python:
    include:
      - /var/log/python-app/*.log
      - /var/log/django/*.log
    start_at: end
    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'
    operators:
      # Parse the first line for timestamp, level, logger, and message
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) (?P<level>\w+) (?P<logger>[^\s]+) - (?P<message>[\s\S]*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%d %H:%M:%S,%L"
        severity:
          parse_from: attributes.level

      # Move the full content (message + traceback) to the body
      - type: move
        from: attributes.message
        to: body

      # Extract the exception type from the traceback
      - type: regex_parser
        parse_from: body
        regex: '(?P<exception_type>[A-Za-z_.]+(?:Error|Exception|Warning)): (?P<exception_message>[^\n]+)'
        on_error: send
        preserve_to: body

      # Map to semantic conventions
      - type: move
        from: attributes.exception_type
        to: attributes["exception.type"]
        if: 'attributes.exception_type != nil'
      - type: move
        from: attributes.exception_message
        to: attributes["exception.message"]
        if: 'attributes.exception_message != nil'

      # Clean up parsed fields
      - type: remove
        field: attributes.timestamp
      - type: remove
        field: attributes.level

processors:
  resource:
    attributes:
      - key: service.name
        value: "python-app"
        action: upsert
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/python]
      processors: [resource, batch]
      exporters: [otlp]
```

## Handling Different Python Log Formats

### Standard logging Module

```python
import logging
logging.basicConfig(format='%(asctime)s %(levelname)s %(name)s - %(message)s')
```

```
2026-02-06 14:23:45,123 ERROR myapp - Something failed
```

```yaml
multiline:
  line_start_pattern: '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}'
```

### Gunicorn/Uvicorn Access Logs

```
[2026-02-06 14:23:45 +0000] [12345] [ERROR] Worker failed
```

```yaml
multiline:
  line_start_pattern: '^\[\d{4}-\d{2}-\d{2}'
```

### Structlog JSON Output

If your Python app uses structlog with JSON output, multiline is not needed since each log entry is a single JSON line. Use the `json_parser` instead:

```yaml
receivers:
  filelog/python-json:
    include:
      - /var/log/python-app/*.log
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"
```

## Handling Chained Exceptions (Python 3)

Python 3 supports exception chaining with "During handling of the above exception, another exception occurred:" syntax:

```
2026-02-06 14:23:45,123 ERROR app - Request failed
Traceback (most recent call last):
  File "/app/db.py", line 10, in query
    cursor.execute(sql)
psycopg2.OperationalError: connection refused

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/app/views.py", line 42, in get_users
    results = db.query("SELECT * FROM users")
  File "/app/db.py", line 15, in query
    raise DatabaseError("Query failed") from e
app.errors.DatabaseError: Query failed
```

The multiline configuration handles this correctly because none of the intermediate lines match the timestamp pattern. The entire chained exception becomes a single log record.

## Extracting the File and Line Number

You can extract the source location from the traceback's last "File" line before the exception:

```yaml
operators:
  # Extract the last file reference before the exception
  - type: regex_parser
    parse_from: body
    regex: '(?s).*File "(?P<code_filepath>[^"]+)", line (?P<code_lineno>\d+), in (?P<code_function>\w+)\n[^\n]*$'
    on_error: send
    preserve_to: body
  - type: move
    from: attributes.code_filepath
    to: attributes["code.filepath"]
    if: 'attributes.code_filepath != nil'
  - type: move
    from: attributes.code_lineno
    to: attributes["code.lineno"]
    if: 'attributes.code_lineno != nil'
  - type: move
    from: attributes.code_function
    to: attributes["code.function"]
    if: 'attributes.code_function != nil'
```

## Flush Period Tuning

Python applications can have bursty logging patterns. During normal operation, logs might be sparse, but during an error cascade, many tracebacks arrive in quick succession:

```yaml
receivers:
  filelog/python:
    include:
      - /var/log/python-app/*.log
    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2}'
    force_flush_period: 500ms
```

The 500ms default flush period works well for most Python applications. If you have very long tracebacks with many chained exceptions, consider increasing it to 1s.

Proper multiline handling for Python tracebacks preserves the full diagnostic context that developers need when debugging production issues. Combined with exception type extraction, you can build alerts on specific exception classes and quickly identify recurring error patterns.
