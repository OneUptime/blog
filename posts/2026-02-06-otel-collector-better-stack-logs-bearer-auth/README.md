# How to Configure the OpenTelemetry Collector to Export to Better Stack Logs with Bearer Token Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Better Stack, Logs, Collector Configuration

Description: Learn how to configure the OpenTelemetry Collector to export logs to Better Stack using bearer token authentication and the OTLP exporter.

Better Stack (formerly Logtail) provides a modern logging platform that works well with OpenTelemetry. The integration uses the OTLP/HTTP exporter built into the OpenTelemetry Collector, which makes the setup straightforward. You authenticate with a bearer token, point the exporter at the Better Stack ingest endpoint, and you are up and running.

This guide walks through the full Collector configuration, from receivers to the final export pipeline.

## Prerequisites

Before starting, you need:

- An OpenTelemetry Collector binary (v0.90.0 or newer recommended)
- A Better Stack account with a source token
- Logs flowing into the Collector from your applications

## Getting Your Better Stack Source Token

Log into your Better Stack dashboard and navigate to Sources. Create a new source or use an existing one. Copy the source token - this is what you will use as your bearer token in the Collector config.

## Collector Configuration

Here is the complete configuration file:

```yaml
# otel-collector-config.yaml

receivers:
  # Accept OTLP logs from your applications
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Optionally collect log files from disk
  filelog:
    include:
      - /var/log/myapp/*.log
    start_at: beginning
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(?P<severity>\w+)\s+(?P<body>.*)$'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
        severity:
          parse_from: attributes.severity

processors:
  # Add resource attributes for identification
  resource:
    attributes:
      - key: service.name
        value: "my-application"
        action: upsert
      - key: deployment.environment
        value: "production"
        action: upsert

  # Batch logs before sending to reduce HTTP overhead
  batch:
    send_batch_size: 1000
    send_batch_max_size: 1500
    timeout: 5s

exporters:
  # Better Stack uses the OTLP/HTTP exporter with bearer token auth
  otlphttp/betterstack:
    endpoint: https://in-otel.logs.betterstack.com
    headers:
      Authorization: "Bearer ${BETTER_STACK_SOURCE_TOKEN}"
    compression: gzip

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [resource, batch]
      exporters: [otlphttp/betterstack]
```

## Breaking Down the Key Sections

### The Exporter Configuration

The exporter section is where the Better Stack integration happens:

```yaml
exporters:
  otlphttp/betterstack:
    endpoint: https://in-otel.logs.betterstack.com
    headers:
      Authorization: "Bearer ${BETTER_STACK_SOURCE_TOKEN}"
    compression: gzip
```

A few things to note here. The endpoint is the Better Stack OTLP ingest URL. The authorization header uses the standard Bearer scheme. The `${BETTER_STACK_SOURCE_TOKEN}` syntax pulls the token from an environment variable, which keeps secrets out of your config files.

Gzip compression is enabled because log payloads can be large, and compressing them saves bandwidth and speeds up delivery.

### Batching for Performance

The batch processor is important for production workloads:

```yaml
processors:
  batch:
    send_batch_size: 1000
    send_batch_max_size: 1500
    timeout: 5s
```

This groups up to 1000 log records per batch and sends them every 5 seconds (whichever comes first). Without batching, the Collector would send individual log records as separate HTTP requests, which would be inefficient.

## Running the Collector

Set your environment variable and start the Collector:

```bash
# Export your Better Stack source token
export BETTER_STACK_SOURCE_TOKEN="your-source-token-here"

# Run the Collector with your config
otelcol --config otel-collector-config.yaml
```

If you are running in Docker:

```bash
docker run -d \
  --name otel-collector \
  -e BETTER_STACK_SOURCE_TOKEN="your-source-token-here" \
  -p 4317:4317 \
  -p 4318:4318 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector-contrib:latest
```

## Adding Retry and Queue Settings

For production use, add retry logic and a sending queue to handle transient failures:

```yaml
exporters:
  otlphttp/betterstack:
    endpoint: https://in-otel.logs.betterstack.com
    headers:
      Authorization: "Bearer ${BETTER_STACK_SOURCE_TOKEN}"
    compression: gzip
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
```

The retry configuration handles temporary network issues or Better Stack downtime. The sending queue buffers log data in memory if the export pipeline falls behind, preventing data loss during traffic spikes.

## Verifying the Integration

After starting the Collector, send a test log and check your Better Stack dashboard:

```bash
# Send a test log via OTLP/HTTP
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "resourceLogs": [{
      "resource": {
        "attributes": [{"key": "service.name", "value": {"stringValue": "test"}}]
      },
      "scopeLogs": [{
        "logRecords": [{
          "timeUnixNano": "1704067200000000000",
          "body": {"stringValue": "Hello from OpenTelemetry!"},
          "severityText": "INFO",
          "severityNumber": 9
        }]
      }]
    }]
  }'
```

You should see this log appear in your Better Stack Live Tail within a few seconds.

## Troubleshooting

If logs are not appearing in Better Stack, enable debug logging on the Collector:

```yaml
service:
  telemetry:
    logs:
      level: debug
```

Common issues include incorrect source tokens (double-check the token value), network connectivity problems (ensure the Collector can reach `in-otel.logs.betterstack.com` on port 443), and misconfigured pipelines (make sure your exporter name matches in the pipeline definition).

The OpenTelemetry Collector's OTLP/HTTP exporter works reliably with Better Stack, and the bearer token auth pattern keeps the configuration simple. Once you have this working, you can expand the pipeline with additional processors for log enrichment or filtering before export.
