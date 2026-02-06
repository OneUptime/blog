# How to Export OpenTelemetry Logs to Logz.io Using the Logz.io Exporter in the Collector with Shipping Token

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Logz.io, Log Export, Collector Configuration

Description: Configure the Logz.io exporter in the OpenTelemetry Collector to send logs with shipping token authentication and region routing.

Logz.io provides a managed ELK Stack (Elasticsearch, Logstash, Kibana) as a service. The OpenTelemetry Collector has a dedicated Logz.io exporter that sends data using Logz.io's shipping tokens. This is the recommended way to get OpenTelemetry data into Logz.io.

## Installing the Collector with Logz.io Support

The Logz.io exporter is available in the `opentelemetry-collector-contrib` distribution:

```bash
# Download the contrib distribution
docker pull otel/opentelemetry-collector-contrib:latest
```

## Basic Configuration

```yaml
# otel-collector-logzio.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Collect logs from files
  filelog:
    include:
      - /var/log/app/*.log
    start_at: end
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: "%Y-%m-%dT%H:%M:%S.%LZ"

processors:
  batch:
    timeout: 5s
    send_batch_size: 256

  resource:
    attributes:
      - key: service.name
        value: "my-application"
        action: upsert

exporters:
  logzio/logs:
    # Your Logz.io logs shipping token
    account_token: "${LOGZIO_LOGS_TOKEN}"
    # Region-specific endpoint
    # Options: us, eu, au, ca, uk, wa
    region: "us"

  logzio/traces:
    account_token: "${LOGZIO_TRACING_TOKEN}"
    region: "us"

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [resource, batch]
      exporters: [logzio/logs]

    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [logzio/traces]
```

## Region-Specific Endpoints

Logz.io operates in multiple regions. The exporter handles endpoint routing based on the `region` setting:

```yaml
exporters:
  # US region (default)
  logzio/us:
    account_token: "${LOGZIO_TOKEN}"
    region: "us"
    # Resolves to: listener.logz.io

  # EU region
  logzio/eu:
    account_token: "${LOGZIO_TOKEN}"
    region: "eu"
    # Resolves to: listener-eu.logz.io

  # Custom endpoint (if using a dedicated cluster)
  logzio/custom:
    account_token: "${LOGZIO_TOKEN}"
    custom_endpoint: "https://custom-listener.logz.io:8071"
```

## Enriching Logs Before Export

Add useful metadata to logs before sending them to Logz.io:

```yaml
processors:
  resource:
    attributes:
      - key: service.name
        value: "api-service"
        action: upsert
      - key: deployment.environment
        value: "production"
        action: upsert
      - key: host.name
        from_attribute: host.name
        action: upsert

  attributes/logs:
    actions:
      - key: log.source
        value: "opentelemetry"
        action: insert
      - key: team
        value: "backend"
        action: insert

  transform/logs:
    log_statements:
      - context: log
        statements:
          # Set severity based on log body content
          - set(severity_text, "ERROR")
            where IsMatch(body, "(?i)error|exception|fatal")
          - set(severity_text, "WARN")
            where IsMatch(body, "(?i)warn|warning")
```

## Sending Logs from Your Application

Configure your application to send logs to the Collector via OTLP:

```python
import logging
from opentelemetry import _logs
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": "order-processor",
    "deployment.environment": "production",
})

# Send logs to the local Collector (which forwards to Logz.io)
log_exporter = OTLPLogExporter(endpoint="localhost:4317", insecure=True)

logger_provider = LoggerProvider(resource=resource)
logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
_logs.set_logger_provider(logger_provider)

# Bridge standard Python logging
handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
logging.getLogger().addHandler(handler)

# Now use standard Python logging
logger = logging.getLogger("order-processor")
logger.info("Order processing started", extra={"order_id": "ORD-12345"})
logger.error("Payment failed", extra={"order_id": "ORD-12345", "reason": "card_declined"})
```

## Docker Compose Setup

```yaml
version: "3.8"
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    environment:
      - LOGZIO_LOGS_TOKEN=your-logs-shipping-token
      - LOGZIO_TRACING_TOKEN=your-tracing-shipping-token
    ports:
      - "4317:4317"
      - "4318:4318"
    volumes:
      - ./otel-collector-logzio.yaml:/etc/otelcol-contrib/config.yaml
      - /var/log/app:/var/log/app:ro
    command: ["--config", "/etc/otelcol-contrib/config.yaml"]
```

## Verifying Data in Logz.io

After setting up the pipeline, logs should appear in your Logz.io Kibana dashboard. Search for them using:

```
service.name: "order-processor" AND severity_text: "ERROR"
```

If logs are not appearing, check the Collector logs for errors related to authentication or endpoint connectivity. The most common issue is using the wrong shipping token, as Logz.io uses different tokens for logs, traces, and metrics.

The Logz.io exporter in the Collector handles all the protocol-specific details of shipping data to Logz.io. Your applications just need to send OTLP to the Collector, and the exporter takes care of authentication, batching, and region routing.
