# How to Parse Docker JSON Container Log Files with the Container Log Parser Operator in the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker, Container Logs, Filelog Receiver, Log Parsing

Description: Parse Docker JSON container log files using the container log parser operator in the OpenTelemetry Collector filelog receiver.

Docker stores container logs as JSON files on disk. Each line in these files is a JSON object with the log output, stream (stdout/stderr), and timestamp. The OpenTelemetry Collector's filelog receiver has a dedicated `container` parser operator that understands this format out of the box.

## Docker JSON Log Format

Docker's default logging driver (json-file) writes log entries like this:

```json
{"log":"2026-02-06 14:23:45 INFO Starting application server\n","stream":"stdout","time":"2026-02-06T14:23:45.123456789Z"}
{"log":"2026-02-06 14:23:45 ERROR Connection to database failed\n","stream":"stderr","time":"2026-02-06T14:23:45.456789012Z"}
```

The files live at `/var/lib/docker/containers/<container-id>/<container-id>-json.log`.

## Using the Container Log Parser

The filelog receiver includes a `container` parser type designed for Docker and containerd log formats:

```yaml
receivers:
  filelog/docker:
    include:
      - /var/lib/docker/containers/*/*-json.log
    start_at: end
    operators:
      # The container parser handles Docker JSON format automatically
      - type: container
```

The `container` operator parses the JSON structure, extracts the timestamp from the `time` field, maps `stream` to the appropriate severity (stderr maps to ERROR), and places the actual log content in the body.

## Complete Configuration with Metadata Extraction

```yaml
receivers:
  filelog/docker:
    include:
      - /var/lib/docker/containers/*/*-json.log
    start_at: end
    # Include the file path as an attribute for container ID extraction
    include_file_path: true
    include_file_name: true
    operators:
      # Step 1: Parse the Docker JSON log format
      - type: container

      # Step 2: Extract container ID from the file path
      - type: regex_parser
        parse_from: attributes["log.file.path"]
        regex: '/var/lib/docker/containers/(?P<container_id>[a-f0-9]{64})/'
        on_error: send
        preserve_to: attributes["log.file.path"]

      # Step 3: Map to OTel semantic conventions
      - type: move
        from: attributes.container_id
        to: attributes["container.id"]
        if: 'attributes.container_id != nil'

processors:
  resource:
    attributes:
      - key: service.name
        value: "docker-host"
        action: upsert

  # Optionally enrich with Docker metadata
  # This requires the Docker observer extension
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/docker]
      processors: [resource, batch]
      exporters: [otlp]
```

## Parsing Application Logs Inside Container Logs

The Docker JSON wrapper contains the actual application log as the `log` field. If your application outputs structured JSON, you end up with JSON-inside-JSON. You need a second parsing step:

```yaml
receivers:
  filelog/docker-json-app:
    include:
      - /var/lib/docker/containers/*/*-json.log
    start_at: end
    operators:
      # Step 1: Parse the outer Docker JSON
      - type: container

      # Step 2: Try to parse the inner application JSON
      - type: json_parser
        parse_from: body
        on_error: send
        # If the body is valid JSON, its fields become attributes
        # If not, the body is kept as-is (plain text log)

      # Step 3: Extract timestamp from application log if present
      - type: move
        from: attributes.timestamp
        to: attributes["app.timestamp"]
        if: 'attributes.timestamp != nil'

      # Step 4: Extract log level from application log
      - type: severity_parser
        parse_from: attributes.level
        if: 'attributes.level != nil'
        mapping:
          error: ["ERROR", "error", "CRITICAL"]
          warn: ["WARN", "warn", "WARNING"]
          info: ["INFO", "info"]
          debug: ["DEBUG", "debug"]
```

## Handling Multiple Container Log Sources

You might want different parsing for different containers. Use the file path to route:

```yaml
receivers:
  filelog/docker-all:
    include:
      - /var/lib/docker/containers/*/*-json.log
    start_at: end
    include_file_path: true
    operators:
      # Parse Docker JSON format first
      - type: container

      # Route based on patterns in the log body
      - type: router
        routes:
          - output: parse_nginx
            expr: 'body matches "^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+ - "'
          - output: parse_json
            expr: 'body matches "^\\{"'
        default: keep_raw

      - id: parse_nginx
        type: regex_parser
        parse_from: body
        regex: '^(?P<remote_addr>[^\s]+) - (?P<remote_user>[^\s]+) \[(?P<time_local>[^\]]+)\]'
        on_error: send

      - id: parse_json
        type: json_parser
        parse_from: body
        on_error: send

      - id: keep_raw
        type: noop
```

## Docker Compose Label-Based Filtering

If you only want logs from specific containers, filter by file path patterns or use Docker labels. The file path approach:

```yaml
receivers:
  filelog/docker-specific:
    include:
      # Only include specific container IDs
      - /var/lib/docker/containers/abc123*/*-json.log
      - /var/lib/docker/containers/def456*/*-json.log
    operators:
      - type: container
```

A more maintainable approach is to use the Docker stats receiver alongside the filelog receiver and filter by container labels in a processor.

## Log Rotation Handling

Docker rotates logs based on the `max-size` and `max-file` options in the Docker daemon configuration. The filelog receiver handles rotation automatically through fingerprint tracking:

```yaml
receivers:
  filelog/docker:
    include:
      - /var/lib/docker/containers/*/*-json.log
    start_at: end
    # Fingerprint size helps track files across rotation
    fingerprint_size: 1kb
    # How many concurrent log files to track
    max_concurrent_files: 100
```

## Excluding Health Check Noise

Docker health checks can generate a lot of log noise. Filter them out:

```yaml
processors:
  filter/no-healthcheck:
    logs:
      exclude:
        match_type: regexp
        bodies:
          - '.*GET /health.*'
          - '.*GET /ready.*'
          - '.*GET /healthz.*'
```

Using the container log parser gives you clean, structured logs from Docker containers without needing to configure sidecar containers or Docker logging drivers. It works with the logs already on disk, making it simple to deploy alongside existing Docker setups.
