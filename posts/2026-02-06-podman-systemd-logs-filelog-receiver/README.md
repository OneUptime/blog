# How to Configure Podman systemd Container Services to Export Structured Logs to the Collector Filelog Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Podman, systemd, Filelog Receiver

Description: Configure Podman containers managed by systemd to export structured logs to the OpenTelemetry Collector filelog receiver for centralized logging.

Podman integrates tightly with systemd. You can generate systemd unit files for your containers and manage them with `systemctl`. When containers run under systemd, their logs flow through the journal. The OpenTelemetry Collector can read these logs using either the filelog receiver (for file-based logs) or the journald receiver (for journal entries).

## Setting Up Podman Containers with systemd

First, create a container and generate a systemd unit file for it:

```bash
# Create the container (but do not start it yet)
podman create \
  --name web-server \
  --label app=web \
  -p 8080:80 \
  docker.io/nginx:latest

# Generate a systemd unit file
mkdir -p ~/.config/systemd/user/
podman generate systemd --new --name web-server \
  > ~/.config/systemd/user/container-web-server.service

# Reload systemd and enable the service
systemctl --user daemon-reload
systemctl --user enable --now container-web-server.service
```

The `--new` flag tells Podman to recreate the container each time the service starts, pulling the latest configuration.

## Understanding Where Logs Go

When Podman runs under systemd, container stdout and stderr go to the systemd journal. You can view them with:

```bash
journalctl --user -u container-web-server.service --no-pager -n 20
```

Alternatively, Podman can write logs to files. Configure the log driver:

```bash
podman create \
  --name web-server \
  --log-driver=json-file \
  --log-opt path=/var/log/containers/web-server.log \
  -p 8080:80 \
  docker.io/nginx:latest
```

## Collecting Journal Logs with the Journald Receiver

The OpenTelemetry Collector has a journald receiver that reads directly from the systemd journal:

```yaml
receivers:
  journald:
    # Read from the user journal
    directory: /run/user/1000/journal
    # Filter to only Podman container units
    units:
      - container-web-server
      - container-api-server
    # Parse priority levels
    priority: info

processors:
  batch:
    timeout: 5s

  # Extract structured fields from journal entries
  attributes:
    actions:
      - key: container.runtime
        value: podman
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [journald]
      processors: [attributes, batch]
      exporters: [otlp]
```

## Collecting File-Based Logs with the Filelog Receiver

If you prefer file-based logging, configure Podman to write JSON logs and use the filelog receiver:

```yaml
receivers:
  filelog:
    include:
      - /var/log/containers/*.log
    start_at: end
    operators:
      # Parse JSON log lines from Podman
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
      # Move the log message to the body
      - type: move
        from: attributes.log
        to: body
      # Extract the container name from the file path
      - type: regex_parser
        regex: '/var/log/containers/(?P<container_name>[^.]+)\.log'
        parse_from: attributes["log.file.path"]
      # Set the stream attribute
      - type: move
        from: attributes.stream
        to: attributes["log.iostream"]

processors:
  batch:
    timeout: 5s
    send_batch_size: 500

  resource:
    attributes:
      - key: container.runtime
        value: podman
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [resource, batch]
      exporters: [otlp]
```

## Structured Logging from Applications

For best results, configure your applications to output structured JSON logs. Here is an example with a Python application:

```python
import logging
import json
from datetime import datetime

class StructuredLogFormatter(logging.Formatter):
    """Format log records as JSON for structured collection."""
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

# Set up the logger
logger = logging.getLogger("myapp")
handler = logging.StreamHandler()
handler.setFormatter(StructuredLogFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

logger.info("Application started")
logger.error("Database connection failed", exc_info=True)
```

Then parse the JSON in your filelog receiver:

```yaml
operators:
  - type: json_parser
    # If the log body itself is JSON, parse it
    parse_from: body
    timestamp:
      parse_from: attributes.timestamp
      layout: '%Y-%m-%dT%H:%M:%S.%LZ'
    severity:
      parse_from: attributes.level
```

## Running the Collector as a systemd Service

Run the Collector itself under systemd alongside your containers:

```bash
# Create the Collector container
podman create \
  --name otel-collector \
  -v /var/log/containers:/var/log/containers:ro,Z \
  -v ./collector-config.yaml:/etc/otelcol-contrib/config.yaml:Z \
  -p 4317:4317 \
  docker.io/otel/opentelemetry-collector-contrib:latest

# Generate and enable the systemd service
podman generate systemd --new --name otel-collector \
  > ~/.config/systemd/user/container-otel-collector.service

systemctl --user daemon-reload
systemctl --user enable --now container-otel-collector.service
```

## Ordering Dependencies

Make sure the Collector starts before your application containers by adding dependencies in the unit files:

```ini
# In container-web-server.service, add:
[Unit]
After=container-otel-collector.service
Requires=container-otel-collector.service
```

This ensures logs are collected from the moment your applications start.

## Summary

Podman's systemd integration provides two paths for log collection: reading from the journal with the journald receiver, or reading from log files with the filelog receiver. Both approaches work well with the OpenTelemetry Collector. The journal approach is simpler to set up, while the file-based approach gives you more control over parsing and structured log formats. Running everything under systemd ensures your containers and the Collector start automatically and restart on failure.
