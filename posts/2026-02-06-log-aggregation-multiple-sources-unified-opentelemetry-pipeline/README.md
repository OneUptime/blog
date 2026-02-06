# How to Set Up Log Aggregation from Multiple Sources into a Unified OpenTelemetry Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Log Aggregation, Pipeline, Observability

Description: Aggregate logs from files, syslog, OTLP, and Fluent Forward into a single unified OpenTelemetry Collector pipeline.

In any real production environment, logs come from everywhere. Your application emits structured logs via OTLP. Your web server writes to local files. Your network gear sends syslog. Your legacy services use Fluentd. Getting all of these into one place where you can search and correlate them is the fundamental challenge of log aggregation.

The OpenTelemetry Collector can serve as that single aggregation point. It supports multiple receiver types, so you can ingest logs from all of these sources simultaneously and push them through a unified pipeline of processors before exporting to your backend.

## Architecture

The setup uses a two-tier collector deployment. Agent collectors run on each host and forward logs to a central gateway collector that handles processing and export:

```
Host 1: [filelog + OTLP agent] ----\
Host 2: [filelog + OTLP agent] ------> [Gateway Collector] --> Backend
Host 3: [syslog + fluent agent] ---/
```

Agent collectors are lightweight. They read local sources and forward with minimal processing. The gateway does the heavy lifting: enrichment, filtering, batching, and export.

## Agent Collector Configuration

This config runs on each application host. It collects logs from local files and from applications that emit OTLP directly:

```yaml
# agent-collector-config.yaml
receivers:
  # Receive OTLP logs from instrumented applications on this host
  otlp:
    protocols:
      grpc:
        endpoint: 127.0.0.1:4317

  # Tail application log files
  filelog/app:
    include:
      - /var/log/myapp/*.log
      - /var/log/myapp/**/*.log
    start_at: end
    # Track reading position so we do not re-read after collector restarts
    storage: file_storage
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z?) (?P<severity>[A-Z]+) (?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"
        severity:
          parse_from: attributes.severity

  # Collect system logs
  filelog/system:
    include:
      - /var/log/syslog
      - /var/log/auth.log
    start_at: end
    storage: file_storage
    operators:
      - type: syslog_parser
        protocol: rfc3164

extensions:
  # Persist file reading positions across restarts
  file_storage:
    directory: /var/lib/otel-collector/storage

processors:
  # Tag logs with the source host
  resource:
    attributes:
      - key: host.name
        from_attribute: ""
        action: upsert
      - key: collector.tier
        value: "agent"
        action: upsert

  # Lightweight batching before forwarding
  batch:
    timeout: 2s
    send_batch_size: 128

exporters:
  # Forward to the gateway collector
  otlp:
    endpoint: "gateway-collector.internal:4317"
    tls:
      insecure: true

service:
  extensions: [file_storage]
  pipelines:
    logs:
      receivers: [otlp, filelog/app, filelog/system]
      processors: [resource, batch]
      exporters: [otlp]
```

## Adding Syslog and Fluent Forward Sources

Some sources cannot use OTLP or file tailing. Network equipment sends syslog over UDP, and you might have existing Fluentd or Fluent Bit deployments. The gateway collector can accept these directly:

```yaml
# gateway-collector-config.yaml (receivers section)
receivers:
  # Receive forwarded logs from agent collectors
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  # Accept syslog from network devices
  syslog:
    udp:
      listen_address: 0.0.0.0:514
    tcp:
      listen_address: 0.0.0.0:514
    protocol: rfc5424

  # Accept logs from Fluentd/Fluent Bit via Forward protocol
  fluentforward:
    endpoint: 0.0.0.0:24224
```

## Gateway Collector Processing

The gateway is where you normalize, enrich, and filter logs before they reach the backend. Here is the full gateway config:

```yaml
# gateway-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
  syslog:
    udp:
      listen_address: 0.0.0.0:514
    protocol: rfc5424
  fluentforward:
    endpoint: 0.0.0.0:24224

processors:
  # Detect and attach resource information
  resourcedetection:
    detectors: [env, system]

  # Normalize attributes across different log sources
  # Different sources use different field names for the same concept
  attributes:
    actions:
      # Standardize hostname fields
      - key: host.name
        from_attribute: hostname
        action: upsert
      - key: host.name
        from_attribute: host
        action: upsert
      # Clean up the source-specific fields
      - key: hostname
        action: delete
      - key: host
        action: delete

  # Filter out health check noise
  filter:
    logs:
      exclude:
        match_type: regexp
        bodies:
          - ".*healthcheck.*"
          - ".*health_check.*"
          - ".*readiness.*"
          - ".*liveness.*"

  # Memory limiter to prevent OOM under load
  memory_limiter:
    check_interval: 5s
    limit_mib: 1024
    spike_limit_mib: 256

  batch:
    timeout: 5s
    send_batch_size: 512
    send_batch_max_size: 1024

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"
    tls:
      insecure: false
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

service:
  pipelines:
    logs:
      receivers: [otlp, syslog, fluentforward]
      processors: [memory_limiter, resourcedetection, attributes, filter, batch]
      exporters: [otlp]
```

## Handling Backpressure

When your backend is slow or unavailable, logs pile up. The gateway config above handles this with three mechanisms:

1. **Memory limiter** - Prevents the collector from consuming all available memory by dropping data when limits are reached. Always put this first in the processor chain.

2. **Sending queue** - Buffers log records in an in-memory queue (5000 entries in this config) and uses 10 concurrent consumers to drain it. For persistent queuing across restarts, use the `file_storage` extension.

3. **Retry on failure** - Automatically retries failed exports with exponential backoff, starting at 5 seconds and capping at 60 seconds.

For production deployments where log loss is unacceptable, add persistent queue storage:

```yaml
extensions:
  file_storage/queue:
    directory: /var/lib/otel-collector/queue
    compaction:
      on_start: true
      directory: /tmp/otel-compaction

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"
    sending_queue:
      enabled: true
      storage: file_storage/queue
      queue_size: 50000
```

## Scaling the Gateway

A single gateway collector can handle a large volume of logs, but for high availability, run multiple instances behind a load balancer. Since log records are independent (unlike traces, which need to be routed by trace ID), simple round-robin load balancing works fine.

## Wrapping Up

The OpenTelemetry Collector's multi-receiver architecture makes it a natural choice for log aggregation. You can ingest from OTLP, files, syslog, and Fluent Forward in a single pipeline, normalize the data, filter out noise, and export to your backend. The two-tier agent-gateway pattern keeps things manageable as your infrastructure grows.
