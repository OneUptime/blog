# How to Recombine Partial CRI-O Container Log Lines in the Collector Pipeline Using the Container Parser

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CRI-O, Logging, Container Parser

Description: Recombine partial CRI-O container log lines that are split across multiple entries using the OpenTelemetry Collector container log parser.

CRI-O is the container runtime built specifically for Kubernetes. It writes container logs in the CRI (Container Runtime Interface) log format, where long log lines get split into multiple partial entries. If you collect these without recombining them, you end up with fragmented log messages that are hard to read and query. The OpenTelemetry Collector's container parser handles this recombination automatically.

## Understanding the CRI Log Format

CRI-O writes logs at `/var/log/containers/` with the following format:

```
2026-02-06T10:00:00.000000000Z stdout F This is a complete log line
2026-02-06T10:00:00.000000001Z stdout P This is the first part of a very long
2026-02-06T10:00:00.000000002Z stdout P log line that was split across multiple
2026-02-06T10:00:00.000000003Z stdout F entries by the container runtime
```

Each line has four fields separated by spaces:
- **Timestamp**: RFC3339Nano format
- **Stream**: `stdout` or `stderr`
- **Tag**: `F` for full (complete line) or `P` for partial (continued on next line)
- **Message**: The actual log content

When you see `P` tags, the message continues on the next line. The final segment has an `F` tag. Without recombination, each partial line appears as a separate log record.

## Configuring the Container Parser

The filelog receiver includes a `container` operator type that handles CRI log format parsing and partial line recombination:

```yaml
receivers:
  filelog:
    include:
      - /var/log/containers/*.log
    # Exclude collector logs to prevent feedback loops
    exclude:
      - /var/log/containers/otel-collector*.log
    start_at: end
    operators:
      # The container parser handles CRI format and recombines partial logs
      - type: container
        # Add the container ID from the file path
        add_metadata_from_filepath: true
        # Maximum time to wait for partial log completion
        max_log_size: 1048576

processors:
  batch:
    timeout: 5s
    send_batch_size: 500

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [batch]
      exporters: [otlp]
```

The `container` operator does several things automatically:
1. Parses the CRI timestamp, stream, and tag fields
2. Detects partial lines (tag `P`) and buffers them
3. Concatenates partial lines until it sees a full line (tag `F`)
4. Outputs a single log record with the complete message

## Manual Recombination with the Recombine Operator

If you need more control over the recombination process, you can use the individual operators:

```yaml
receivers:
  filelog:
    include:
      - /var/log/containers/*.log
    start_at: end
    operators:
      # Step 1: Parse the CRI log format
      - type: regex_parser
        regex: '^(?P<timestamp>\S+)\s+(?P<stream>stdout|stderr)\s+(?P<logtag>[FP])\s+(?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'

      # Step 2: Recombine partial log lines
      - type: recombine
        # Continue combining when the tag is P (partial)
        is_first_entry: attributes.logtag == "F" or attributes.logtag == "P"
        combine_field: attributes.message
        # Use the logtag to determine if this is a partial entry
        is_last_entry: attributes.logtag == "F"
        # Maximum time to wait for the final entry
        force_flush_timeout: 5s
        # Maximum combined message size (1MB)
        max_batch_size: 1048576
        combine_with: ""

      # Step 3: Move the combined message to the log body
      - type: move
        from: attributes.message
        to: body

      # Step 4: Set the stream attribute
      - type: move
        from: attributes.stream
        to: attributes["log.iostream"]

      # Step 5: Clean up the temporary logtag attribute
      - type: remove
        field: attributes.logtag
```

This approach gives you full control over timeout values, maximum batch sizes, and how partial lines are concatenated.

## Handling Mixed Log Formats

Some clusters run both Docker and CRI-O containers. The log formats are different:

```
# Docker JSON format
{"log":"Hello from Docker\n","stream":"stdout","time":"2026-02-06T10:00:00Z"}

# CRI format
2026-02-06T10:00:00.000000000Z stdout F Hello from CRI-O
```

You can handle both by using a router operator:

```yaml
operators:
  # Detect the format by checking the first character
  - type: router
    routes:
      # JSON format starts with {
      - output: json_parser
        expr: 'body startsWith "{"'
      # CRI format starts with a timestamp
      - output: cri_parser
        expr: 'body matches "^\\d{4}-"'

  - id: json_parser
    type: json_parser
    output: move_body

  - id: cri_parser
    type: regex_parser
    regex: '^(?P<timestamp>\S+)\s+(?P<stream>stdout|stderr)\s+(?P<logtag>[FP])\s+(?P<message>.*)'
    output: recombine_partial

  - id: recombine_partial
    type: recombine
    is_last_entry: attributes.logtag == "F"
    combine_field: attributes.message
    force_flush_timeout: 5s
    output: move_body

  - id: move_body
    type: move
    from: attributes.message
    to: body
```

## Performance Considerations

The recombine operator buffers partial lines in memory. On nodes with many containers producing long multi-line logs (like stack traces), this can consume significant memory. Tune these settings:

```yaml
- type: recombine
  # Flush after 5 seconds even if no F tag arrives
  force_flush_timeout: 5s
  # Limit combined message to 256KB
  max_batch_size: 262144
  # Maximum number of entries to buffer
  max_sources: 1000
```

If a partial log sequence never receives its final `F` entry (for example, if the container crashes mid-line), the `force_flush_timeout` ensures the buffered data is eventually emitted.

## Testing the Configuration

Generate a long log line from a test container:

```bash
# This produces a line longer than the CRI-O buffer size
kubectl run log-test --image=alpine --restart=Never -- \
  sh -c 'python3 -c "print(\"x\" * 20000)"'
```

Check that the Collector produces a single log record with the full 20,000 character message instead of multiple partial entries.

## Summary

CRI-O splits long log lines into partial entries tagged with `P` and `F`. The OpenTelemetry Collector's container parser or recombine operator reassembles these fragments into complete log records. Use the container operator for simplicity or the recombine operator when you need fine-grained control over buffering and timeouts. Always set a force flush timeout to handle edge cases where partial sequences are never completed.
