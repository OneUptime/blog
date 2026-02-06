# How to Configure the Mezmo Exporter in the OpenTelemetry Collector for Log Ingestion with Hostname Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Mezmo, Log Ingestion, Collector Exporter

Description: Configure the Mezmo exporter in the OpenTelemetry Collector to ingest logs with proper hostname metadata and ingestion key authentication.

Mezmo (formerly LogDNA) is a log management platform. The OpenTelemetry Collector has a dedicated Mezmo exporter that sends log data using Mezmo's ingestion API. This exporter handles batching, retries, and metadata enrichment specific to Mezmo's requirements.

## The Mezmo Exporter

The Mezmo exporter is part of the `opentelemetry-collector-contrib` distribution. It sends logs to Mezmo's ingestion endpoint with your ingestion key for authentication.

## Basic Configuration

```yaml
# otel-collector-mezmo.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Collect container logs
  filelog:
    include:
      - /var/log/containers/*.log
    start_at: end
    operators:
      - type: regex_parser
        regex: '^(?P<time>[^ ]+) (?P<stream>[^ ]+) (?P<log_type>[^ ]+) (?P<message>.*)$'
        timestamp:
          parse_from: attributes.time
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"

processors:
  batch:
    timeout: 2s
    send_batch_size: 200

  resource:
    attributes:
      - key: service.name
        value: "my-application"
        action: upsert

exporters:
  mezmo:
    # Your Mezmo ingestion key
    ingest_key: "${MEZMO_INGESTION_KEY}"

    # The Mezmo ingestion endpoint (default is the US endpoint)
    ingest_url: "https://logs.mezmo.com/otel/ingest/rest"

    # Timeout for each export request
    timeout: 10s

    # Retry configuration
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
      max_elapsed_time: 120s

    # Queue configuration
    sending_queue:
      enabled: true
      num_consumers: 5
      queue_size: 2000

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [resource, batch]
      exporters: [mezmo]
```

## Adding Hostname Metadata

Mezmo organizes logs by hostname. You can set the hostname through resource attributes:

```yaml
processors:
  resource/hostname:
    attributes:
      # Set the hostname that Mezmo will use for log grouping
      - key: host.name
        value: "${HOSTNAME}"
        action: upsert
      # Additional metadata that Mezmo uses
      - key: mezmo.hostname
        value: "${HOSTNAME}"
        action: upsert
      - key: mezmo.app
        value: "my-application"
        action: upsert

  # Use the resource detection processor for automatic hostname detection
  resourcedetection:
    detectors: [env, system, docker]
    system:
      hostname_sources: ["os"]

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [resourcedetection, resource/hostname, batch]
      exporters: [mezmo]
```

## Enriching Logs with Attributes

Add structured metadata that Mezmo can index:

```yaml
processors:
  attributes/mezmo:
    actions:
      # Add application-level metadata
      - key: app
        value: "payment-service"
        action: insert
      - key: env
        value: "production"
        action: insert
      - key: team
        value: "payments"
        action: insert

  transform/mezmo:
    log_statements:
      - context: log
        statements:
          # Extract log level from the message body
          - set(severity_text, "ERROR")
            where IsMatch(body, "(?i)\\berror\\b|\\bfatal\\b")
          - set(severity_text, "WARN")
            where IsMatch(body, "(?i)\\bwarn\\b|\\bwarning\\b")
          - set(severity_text, "INFO")
            where severity_text == ""
```

## Multi-App Configuration

If you have multiple applications sending logs through the same Collector, use separate pipelines:

```yaml
receivers:
  otlp/app1:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  filelog/app1:
    include:
      - /var/log/app1/*.log

  filelog/app2:
    include:
      - /var/log/app2/*.log

processors:
  resource/app1:
    attributes:
      - key: mezmo.app
        value: "app1"
        action: upsert
      - key: mezmo.hostname
        value: "${HOSTNAME}"
        action: upsert

  resource/app2:
    attributes:
      - key: mezmo.app
        value: "app2"
        action: upsert
      - key: mezmo.hostname
        value: "${HOSTNAME}"
        action: upsert

  batch:
    timeout: 2s

exporters:
  mezmo:
    ingest_key: "${MEZMO_INGESTION_KEY}"
    ingest_url: "https://logs.mezmo.com/otel/ingest/rest"

service:
  pipelines:
    logs/app1:
      receivers: [otlp/app1, filelog/app1]
      processors: [resource/app1, batch]
      exporters: [mezmo]

    logs/app2:
      receivers: [filelog/app2]
      processors: [resource/app2, batch]
      exporters: [mezmo]
```

## Sending Logs from Python

```python
import logging
from opentelemetry import _logs
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": "payment-service",
    "host.name": "web-server-01",
    "deployment.environment": "production",
})

exporter = OTLPLogExporter(endpoint="localhost:4317", insecure=True)

logger_provider = LoggerProvider(resource=resource)
logger_provider.add_log_record_processor(BatchLogRecordProcessor(exporter))
_logs.set_logger_provider(logger_provider)

handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
logging.getLogger().addHandler(handler)

logger = logging.getLogger("payment-service")
logger.info("Payment processed", extra={"order_id": "ORD-123", "amount": 49.99})
logger.error("Payment failed", extra={"order_id": "ORD-456", "error": "insufficient_funds"})
```

## Docker Setup

```yaml
version: "3.8"
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    environment:
      - MEZMO_INGESTION_KEY=${MEZMO_INGESTION_KEY}
      - HOSTNAME=${HOSTNAME}
    ports:
      - "4317:4317"
    volumes:
      - ./otel-collector-mezmo.yaml:/etc/otelcol-contrib/config.yaml
      - /var/log:/var/log:ro
```

The Mezmo exporter handles all the API-specific details of sending logs to Mezmo. Your applications send standard OTLP logs to the Collector, and the exporter formats them with the hostname, app name, and other metadata that Mezmo needs for proper organization and indexing.
