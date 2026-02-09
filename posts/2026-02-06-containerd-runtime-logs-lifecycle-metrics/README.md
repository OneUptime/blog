# How to Collect containerd Runtime Logs and Container Lifecycle Metrics with the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, containerd, Logging, Container Metrics

Description: Collect containerd runtime logs and container lifecycle metrics using the OpenTelemetry Collector with filelog and Prometheus receivers.

containerd is the container runtime that sits beneath Docker and Kubernetes. It manages the complete container lifecycle: pulling images, creating containers, starting processes, and cleaning up. Monitoring containerd directly gives you visibility into runtime-level events that application-level instrumentation misses. This post covers how to collect containerd logs and metrics with the OpenTelemetry Collector.

## Where containerd Logs Live

containerd typically runs as a systemd service and writes logs to the journal. On most systems:

```bash
# View containerd logs via journalctl
journalctl -u containerd --no-pager -n 50

# Or check if containerd writes to a file
ls -la /var/log/containerd.log
```

The log format depends on your containerd configuration. Default logs look like:

```
time="2026-02-06T10:00:00.000000000Z" level=info msg="starting containerd" revision=abc123
time="2026-02-06T10:00:01.000000000Z" level=info msg="loading plugin" type=io.containerd.grpc.v1
```

## Collecting containerd Logs with the Filelog Receiver

If containerd writes to a log file, use the filelog receiver:

```yaml
receivers:
  filelog/containerd:
    include:
      - /var/log/containerd.log
    start_at: end
    operators:
      # Parse the containerd log format
      - type: regex_parser
        regex: 'time="(?P<timestamp>[^"]+)"\s+level=(?P<level>\w+)\s+msg="(?P<message>[^"]*)"'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
        severity:
          parse_from: attributes.level
          mapping:
            info: info
            warn: warn
            error: error
            debug: debug
      # Move the parsed message to the log body
      - type: move
        from: attributes.message
        to: body
      # Add a source identifier
      - type: add
        field: attributes["log.source"]
        value: "containerd"

processors:
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog/containerd]
      processors: [batch]
      exporters: [otlp]
```

## Collecting containerd Logs from the Journal

For journal-based setups, use the journald receiver:

```yaml
receivers:
  journald/containerd:
    directory: /var/log/journal
    units:
      - containerd
    priority: info
```

## Collecting containerd Metrics

containerd exposes Prometheus metrics on a configurable endpoint. First, verify metrics are enabled in your containerd config:

```toml
# /etc/containerd/config.toml
[metrics]
  address = "127.0.0.1:1338"
```

Restart containerd after changing the config:

```bash
sudo systemctl restart containerd
```

Verify metrics are available:

```bash
curl http://localhost:1338/v1/metrics
```

Now configure the Collector to scrape these metrics:

```yaml
receivers:
  prometheus/containerd:
    config:
      scrape_configs:
        - job_name: "containerd"
          scrape_interval: 15s
          static_configs:
            - targets: ["localhost:1338"]
          # containerd metrics are at /v1/metrics
          metrics_path: /v1/metrics

processors:
  batch:
    timeout: 10s

  # Add resource attributes to identify the source
  resource:
    attributes:
      - key: service.name
        value: containerd
        action: upsert
      - key: container.runtime
        value: containerd
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [prometheus/containerd]
      processors: [resource, batch]
      exporters: [otlp]
```

## Key containerd Metrics

The metrics endpoint exposes several useful metrics:

```
# Container operations duration
containerd_container_operations_duration_seconds_bucket
containerd_container_operations_duration_seconds_sum
containerd_container_operations_duration_seconds_count

# Active containers and images
containerd_containers_total
containerd_images_total

# gRPC request metrics
containerd_grpc_server_handled_total
containerd_grpc_server_handling_seconds_bucket

# Snapshot usage
containerd_snapshot_ops_duration_seconds_bucket

# Process metrics for containerd itself
process_cpu_seconds_total
process_resident_memory_bytes
process_open_fds
```

## Tracking Container Lifecycle Events

containerd logs container lifecycle events. You can parse these to track how long operations take:

```yaml
receivers:
  filelog/containerd:
    include:
      - /var/log/containerd.log
    start_at: end
    operators:
      - type: regex_parser
        regex: 'time="(?P<timestamp>[^"]+)"\s+level=(?P<level>\w+)\s+msg="(?P<message>[^"]*)"(\s+(?P<extra>.*))?'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
      # Filter for lifecycle events
      - type: filter
        expr: 'attributes.message matches "(starting|killing|deleting|creating) container"'
      - type: move
        from: attributes.message
        to: body
```

This filters the log stream to only container lifecycle events, reducing noise from routine operations.

## Combined Configuration

Here is the full config that collects both logs and metrics:

```yaml
receivers:
  filelog/containerd:
    include:
      - /var/log/containerd.log
    start_at: end
    operators:
      - type: regex_parser
        regex: 'time="(?P<timestamp>[^"]+)"\s+level=(?P<level>\w+)\s+msg="(?P<message>[^"]*)"'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
        severity:
          parse_from: attributes.level
      - type: move
        from: attributes.message
        to: body

  prometheus/containerd:
    config:
      scrape_configs:
        - job_name: "containerd"
          scrape_interval: 15s
          static_configs:
            - targets: ["localhost:1338"]
          metrics_path: /v1/metrics

processors:
  batch:
    timeout: 5s
  resource:
    attributes:
      - key: service.name
        value: containerd
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog/containerd]
      processors: [resource, batch]
      exporters: [otlp]
    metrics:
      receivers: [prometheus/containerd]
      processors: [resource, batch]
      exporters: [otlp]
```

## Summary

containerd exposes both logs and Prometheus metrics that the OpenTelemetry Collector can collect. Logs give you visibility into container lifecycle events and runtime errors, while metrics provide quantitative data about operation durations, container counts, and gRPC performance. Together, they give you a complete picture of your container runtime health.
