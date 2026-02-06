# How to Recombine Partial CRI-O and containerd Container Logs Using the Recombine Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CRI-O, containerd, Container Logs, Recombine Operator

Description: Use the recombine operator in the OpenTelemetry filelog receiver to reassemble partial CRI-O and containerd container log lines.

Container runtimes like CRI-O and containerd split long log lines into multiple partial entries. When a container outputs a log line longer than the runtime's buffer size (typically 16KB for CRI-O), the line gets broken into chunks marked with a "P" (partial) flag, and only the last chunk is marked "F" (full). You need the recombine operator to stitch these back together.

## CRI Log Format

CRI-O and containerd both follow the CRI logging format:

```
2026-02-06T14:23:45.123456789Z stdout F This is a complete log line
2026-02-06T14:23:45.123456789Z stdout P This is the first part of a very long log line that exceeds the
2026-02-06T14:23:45.123456790Z stdout P buffer size and gets split across multiple entries by the container
2026-02-06T14:23:45.123456791Z stdout F runtime until the final part is marked with F
```

The format is: `<timestamp> <stream> <flag> <log content>`

Where the flag is either `P` (partial, more chunks follow) or `F` (full, this is the last or only chunk).

## Parsing and Recombining

The filelog receiver needs to first parse the CRI format, then recombine partial entries:

```yaml
receivers:
  filelog/cri:
    include:
      - /var/log/pods/*/*/*.log
    start_at: end
    operators:
      # Step 1: Parse the CRI log format
      - type: regex_parser
        id: cri_parser
        regex: '^(?P<time>[^ ]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]+) (?P<log>.*)'
        timestamp:
          parse_from: attributes.time
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"

      # Step 2: Recombine partial logs
      - type: recombine
        id: recombine_partials
        combine_field: attributes.log
        # Keep combining while the logtag is P (partial)
        is_last_entry: "attributes.logtag == 'F'"
        combine_with: ""
        max_log_size: 1048576  # 1MB max combined size
        source_identifier: attributes["log.file.path"]

      # Step 3: Move the recombined log to the body
      - type: move
        from: attributes.log
        to: body

      # Step 4: Set severity based on stream
      - type: severity_parser
        parse_from: attributes.stream
        mapping:
          error: stderr
          info: stdout

      # Step 5: Clean up intermediate attributes
      - type: remove
        field: attributes.time
      - type: remove
        field: attributes.logtag
```

## Complete Collector Configuration

```yaml
receivers:
  filelog/cri:
    include:
      - /var/log/pods/*/*/*.log
    start_at: end
    # Include file path to extract pod metadata
    include_file_path: true
    include_file_name: true
    operators:
      - type: regex_parser
        id: cri_parser
        regex: '^(?P<time>[^ ]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]+) (?P<log>.*)'
        timestamp:
          parse_from: attributes.time
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"

      - type: recombine
        id: recombine_cri
        combine_field: attributes.log
        is_last_entry: "attributes.logtag == 'F'"
        combine_with: ""
        max_log_size: 1048576
        source_identifier: attributes["log.file.path"]
        force_flush_period: 5s

      # Extract pod metadata from file path
      # Path format: /var/log/pods/<namespace>_<pod-name>_<pod-uid>/<container-name>/0.log
      - type: regex_parser
        parse_from: attributes["log.file.path"]
        regex: '/var/log/pods/(?P<namespace>[^_]+)_(?P<pod_name>[^_]+)_(?P<pod_uid>[^/]+)/(?P<container_name>[^/]+)/'
        on_error: send
        preserve_to: attributes["log.file.path"]

      - type: move
        from: attributes.log
        to: body
      - type: move
        from: attributes.namespace
        to: resource["k8s.namespace.name"]
        if: 'attributes.namespace != nil'
      - type: move
        from: attributes.pod_name
        to: resource["k8s.pod.name"]
        if: 'attributes.pod_name != nil'
      - type: move
        from: attributes.pod_uid
        to: resource["k8s.pod.uid"]
        if: 'attributes.pod_uid != nil'
      - type: move
        from: attributes.container_name
        to: resource["k8s.container.name"]
        if: 'attributes.container_name != nil'

      - type: remove
        field: attributes.time
      - type: remove
        field: attributes.logtag

processors:
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/cri]
      processors: [batch]
      exporters: [otlp]
```

## Recombine Operator Parameters

The recombine operator has several important parameters:

```yaml
- type: recombine
  # The field to combine across partial entries
  combine_field: attributes.log

  # Condition that identifies the last entry in a group
  is_last_entry: "attributes.logtag == 'F'"

  # Alternatively, use is_first_entry for formats where the first line is marked
  # is_first_entry: "attributes.logtag == 'S'"

  # String to join partial entries with (empty = direct concatenation)
  combine_with: ""

  # Maximum size of the combined log (prevents memory issues)
  max_log_size: 1048576

  # How to identify which partial entries belong together
  source_identifier: attributes["log.file.path"]

  # How long to wait before force-flushing an incomplete group
  force_flush_period: 5s

  # Maximum number of entries to accumulate
  max_batch_size: 1000
```

## Handling containerd vs CRI-O Differences

While both use the CRI format, there are subtle differences:

### containerd (newer versions)
```
2026-02-06T14:23:45.123456789Z stdout P partial line content
2026-02-06T14:23:45.123456790Z stdout F remaining content
```

### CRI-O (some versions)
```
2026-02-06T14:23:45.123456789+00:00 stdout P partial line content
2026-02-06T14:23:45.123456790+00:00 stdout F remaining content
```

The timestamp format might differ. Update the timestamp layout accordingly:

```yaml
# For CRI-O with timezone offset
timestamp:
  parse_from: attributes.time
  layout: "%Y-%m-%dT%H:%M:%S.%L%z"
```

## Testing with Partial Logs

Generate test partial logs to verify your configuration:

```bash
# Create a test log file simulating partial CRI entries
cat > /tmp/test-cri.log << 'EOF'
2026-02-06T14:23:45.000000000Z stdout F Short complete line
2026-02-06T14:23:46.000000000Z stdout P {"level":"error","message":"This is a really long JSON log message that
2026-02-06T14:23:46.000000001Z stdout P  gets split into multiple partial entries because it exceeds the container
2026-02-06T14:23:46.000000002Z stdout F  runtime buffer size limit"}
2026-02-06T14:23:47.000000000Z stdout F Another complete line
EOF
```

After processing, you should see three log records: two complete lines and one recombined JSON entry.

The recombine operator is essential when collecting logs from Kubernetes clusters using CRI-O or containerd. Without it, long log lines get fragmented and your log queries return incomplete information. The operator handles the reassembly transparently, and once combined, the full log content can be parsed by downstream operators.
