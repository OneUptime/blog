# How to Build Multi-Line Log Parsing for Stack Traces in the OpenTelemetry Filelog Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Log Parsing, Stack Traces, Filelog Receiver

Description: Configure the OpenTelemetry filelog receiver to correctly parse multi-line log entries like Java stack traces into single log records.

Stack traces are the bane of log parsers. A single Java exception can span 30+ lines, and if your log collector treats each line as a separate log record, you end up with fragmented noise instead of actionable error data. The first line says `NullPointerException`, the next 29 lines are `at com.example.SomeClass.method(SomeClass.java:42)`, and your log backend has no idea they belong together.

The OpenTelemetry filelog receiver has built-in support for multi-line log parsing that solves this problem. This post covers how to configure it for common stack trace formats.

## How Multi-Line Parsing Works

The filelog receiver reads log files line by line. By default, each line becomes one log record. When you enable multi-line parsing, the receiver uses a regex pattern to identify where a new log entry begins. Everything between two "start" markers gets combined into a single log record.

For example, if your log format starts each entry with a timestamp:

```
2026-02-06 10:15:23 ERROR Something went wrong
java.lang.NullPointerException: object was null
    at com.example.OrderService.process(OrderService.java:42)
    at com.example.ApiHandler.handle(ApiHandler.java:88)
2026-02-06 10:15:24 INFO Next request processed
```

The multi-line parser knows that lines starting with a timestamp pattern are new entries. The stack trace lines (which do not match the timestamp pattern) get appended to the previous entry.

## Basic Configuration for Java Stack Traces

Here is a filelog receiver config that handles the standard Java log format:

```yaml
receivers:
  filelog:
    include:
      - /var/log/apps/*.log
    start_at: end
    # Multi-line configuration
    multiline:
      # A new log entry starts with a timestamp pattern
      # This matches formats like: 2026-02-06 10:15:23
      line_start_pattern: '^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}'
    operators:
      # Parse the first line to extract timestamp and severity
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}[.,]\d{3})\s+(?P<severity>\w+)\s+(?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%d %H:%M:%S,%L'
        severity:
          parse_from: attributes.severity
```

With this config, the entire stack trace gets combined into the `body` of a single log record before the regex parser runs. The parser extracts the timestamp and severity from the first line, and the full multi-line content (including the stack trace) is preserved in the body.

## Handling Different Log Formats

Different frameworks produce different formats. Here are patterns for the most common ones.

### Python Tracebacks

Python tracebacks start with `Traceback (most recent call last):` and end with the exception line. But the easier approach is to match the start of log entries:

```yaml
receivers:
  filelog/python:
    include:
      - /var/log/apps/python-*.log
    multiline:
      # Python logging typically starts with a log level
      line_start_pattern: '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} - '
```

### Go Panic Stack Traces

Go panics have a distinctive format:

```yaml
receivers:
  filelog/go:
    include:
      - /var/log/apps/go-*.log
    multiline:
      # Go structured logs typically start with a JSON object or a timestamp
      # Goroutine dumps start with "goroutine" but should be part of the panic entry
      line_start_pattern: '^\{"level"|^\d{4}/\d{2}/\d{2}|^time='
```

### .NET Exception Stack Traces

```yaml
receivers:
  filelog/dotnet:
    include:
      - /var/log/apps/dotnet-*.log
    multiline:
      # .NET logs typically start with a severity level or timestamp
      line_start_pattern: '^\s*(info|warn|fail|crit|dbug|trce):\s|^\d{4}-\d{2}-\d{2}'
```

## Combining Multi-Line with Container Logs

In Kubernetes, container logs from CRI have a prefix on every line. You need to handle the CRI format first, then apply multi-line parsing. This requires chaining operators:

```yaml
receivers:
  filelog:
    include:
      - /var/log/pods/*/*/*.log
    start_at: end
    operators:
      # Step 1: Parse the CRI log format
      - type: regex_parser
        id: parser-cri
        regex: '^(?P<time>[^ ]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$'
        output: recombine
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'

      # Step 2: Recombine multi-line entries after CRI parsing
      - type: recombine
        id: recombine
        combine_field: attributes.log
        # Start a new group when the log content matches a timestamp pattern
        is_first_entry: 'attributes.log matches "^\\d{4}-\\d{2}-\\d{2}"'
        # Maximum number of lines to combine into one entry
        max_batch_size: 100
        # Time to wait for more lines before flushing
        combine_with: "\n"
        source_identifier: attributes["log.file.path"]

      # Step 3: Move the combined log to the body
      - type: move
        from: attributes.log
        to: body
```

The `recombine` operator is the key here. It buffers lines and groups them based on the `is_first_entry` condition. Lines that do not match the condition get appended to the current group. The `max_batch_size` prevents runaway grouping if a log file has an unexpected format.

## Setting Reasonable Limits

Multi-line parsing involves buffering, and you need to protect against pathological cases. A single log entry should not be allowed to grow indefinitely:

```yaml
receivers:
  filelog:
    include:
      - /var/log/apps/*.log
    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2}'
    # Maximum size of a single log entry (bytes)
    max_log_size: 65536
```

The `max_log_size` setting (default is 1 MiB) caps how large a single log record can be. If a multi-line entry exceeds this limit, it gets split. For most stack traces, 64 KB is more than enough.

## Verifying Multi-Line Parsing

To verify your config is working, check the collector's debug output:

```yaml
exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: []
      exporters: [debug]
```

Run the collector and trigger an exception in your application. The debug exporter will print the full log record. Confirm that the entire stack trace appears in a single record's body rather than being split across multiple records.

## Wrapping Up

Multi-line log parsing is essential for any application that produces stack traces. Without it, your logs are fragmented and hard to search. The OpenTelemetry filelog receiver gives you two approaches: the `multiline` config for simple cases and the `recombine` operator for complex scenarios like container logs. Get the `line_start_pattern` right for your log format, set reasonable size limits, and your stack traces will arrive intact.
