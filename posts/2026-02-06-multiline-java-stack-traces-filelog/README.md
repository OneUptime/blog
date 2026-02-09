# How to Handle Multiline Java Stack Traces in the Filelog Receiver with multiline.line_start_pattern Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Stack Traces, Multiline Logs, Filelog Receiver

Description: Configure the OpenTelemetry filelog receiver to correctly group multiline Java stack traces into single log records.

Java stack traces are the classic multiline log problem. A single exception can span dozens of lines, and if each line becomes a separate log record, you lose all the context that makes stack traces useful. The filelog receiver's multiline configuration solves this by grouping related lines together before they enter the parsing pipeline.

## The Problem

A typical Java exception in a log file looks like this:

```
2026-02-06 14:23:45.123 ERROR c.e.PaymentService - Payment processing failed
java.lang.RuntimeException: Transaction declined
    at com.example.payment.PaymentProcessor.process(PaymentProcessor.java:42)
    at com.example.payment.PaymentService.handlePayment(PaymentService.java:87)
    at com.example.api.OrderController.createOrder(OrderController.java:123)
Caused by: java.sql.SQLException: Connection refused
    at com.mysql.cj.jdbc.ConnectionImpl.createNewIO(ConnectionImpl.java:823)
    at com.mysql.cj.jdbc.ConnectionImpl.<init>(ConnectionImpl.java:456)
    ... 15 more
2026-02-06 14:23:45.456 INFO c.e.OrderService - Retrying order ORD-12345
```

Without multiline handling, the filelog receiver would produce separate log records for each line. The stack trace lines (starting with whitespace, "at", "Caused by", or "...") would appear as disconnected log entries.

## Using line_start_pattern

The `multiline.line_start_pattern` tells the receiver what a new log entry looks like. Everything between one match and the next is grouped into a single record:

```yaml
receivers:
  filelog/java:
    include:
      - /var/log/java-app/*.log
    start_at: end
    multiline:
      # A new log entry starts with a timestamp pattern
      line_start_pattern: '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'
```

With this configuration, lines that do not match the timestamp pattern (stack trace lines, continuation lines) get appended to the previous log entry.

## Complete Configuration with Parsing

```yaml
receivers:
  filelog/java:
    include:
      - /var/log/java-app/*.log
    start_at: end
    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'
    operators:
      # Parse the first line to extract timestamp, level, logger, and message
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) (?P<level>\w+)\s+(?P<logger>[^\s]+) - (?P<message>[\s\S]*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%d %H:%M:%S.%L"
        severity:
          parse_from: attributes.level

      # Move the full message (including stack trace) to the body
      - type: move
        from: attributes.message
        to: body

      # Extract the exception class name if present
      - type: regex_parser
        parse_from: body
        regex: '(?P<exception_type>[a-zA-Z_.]+Exception|[a-zA-Z_.]+Error): (?P<exception_message>[^\n]+)'
        on_error: send
        preserve_to: body

      # Map to OTel semantic conventions
      - type: move
        from: attributes.exception_type
        to: attributes["exception.type"]
        if: 'attributes.exception_type != nil'
      - type: move
        from: attributes.exception_message
        to: attributes["exception.message"]
        if: 'attributes.exception_message != nil'

      # Clean up
      - type: remove
        field: attributes.timestamp
      - type: remove
        field: attributes.level

processors:
  resource:
    attributes:
      - key: service.name
        value: "java-payment-service"
        action: upsert
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/java]
      processors: [resource, batch]
      exporters: [otlp]
```

## Handling Different Java Log Formats

### Logback/SLF4J Default Format

```
14:23:45.123 [main] ERROR com.example.App - Something failed
```

```yaml
multiline:
  line_start_pattern: '^\d{2}:\d{2}:\d{2}\.\d{3} \['
```

### Log4j2 Default Pattern

```
2026-02-06 14:23:45,123 ERROR [com.example.App] (main) Something failed
```

```yaml
multiline:
  line_start_pattern: '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}'
```

### Spring Boot Default

```
2026-02-06T14:23:45.123+00:00 ERROR 1 --- [main] c.e.App : Something failed
```

```yaml
multiline:
  line_start_pattern: '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
```

## Handling Nested Exceptions (Caused by)

Java stack traces often have chained "Caused by" sections. The multiline grouping handles these automatically since "Caused by" lines do not match the timestamp pattern. The entire chain ends up in a single log record:

```
2026-02-06 14:23:45.123 ERROR c.e.App - Failed
com.example.AppException: Operation failed
    at com.example.App.run(App.java:10)
Caused by: java.io.IOException: Connection reset
    at java.net.SocketInputStream.read(SocketInputStream.java:186)
Caused by: java.net.SocketException: Connection reset
    at java.net.SocketInputStream.read(SocketInputStream.java:140)
    ... 8 more
```

All of this becomes one log record with the full stack trace in the body.

## Dealing with Suppressed Exceptions

Java 7+ supports suppressed exceptions that appear with a different indentation:

```
java.lang.Exception: Main exception
    at com.example.App.method(App.java:10)
    Suppressed: java.lang.Exception: Suppressed one
        at com.example.App.close(App.java:20)
    Suppressed: java.lang.Exception: Suppressed two
        at com.example.App.close(App.java:25)
```

These are handled correctly by the same `line_start_pattern` since suppressed exception lines start with whitespace.

## Performance Considerations

Multiline grouping uses a flush timeout to decide when a multiline entry is complete. The default is typically 500ms. If your application logs infrequently, you might need to increase this:

```yaml
receivers:
  filelog/java:
    include:
      - /var/log/java-app/*.log
    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2}'
    # Force flush after this duration if no new matching line appears
    force_flush_period: 1s
```

Setting this too low can split stack traces. Setting it too high delays log delivery. For most Java applications logging at a reasonable rate, the default works fine.

Proper multiline handling is essential for Java applications. Without it, your logs are fragmented and unusable for debugging. With it, each exception becomes a single, searchable log record with the complete stack trace preserved.
