# How to Configure the OpenTelemetry Collector to Export to Better Stack Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Better Stack, Log, Collector Configuration

Description: Learn how to configure the OpenTelemetry Collector to export logs to Better Stack using bearer token authentication and the OTLP exporter.

Better Stack (formerly Logtail) provides a modern logging platform that works well with OpenTelemetry. The integration uses the OTLP/HTTP exporter built into the OpenTelemetry Collector, which makes the setup straightforward. You authenticate with a bearer token, point the exporter at the Better Stack ingest endpoint, and you are up and running.

This guide walks through the full Collector configuration, from receivers to the final export pipeline.

## Prerequisites

Before starting, you need:

- A current OpenTelemetry Collector binary
- An OpenTelemetry Collector Contrib binary if you use the optional `file_log` receiver
- A Better Stack account with a source token and ingesting host
- Logs flowing into the Collector from your applications

## Getting Your Better Stack Source Token

Log into your Better Stack dashboard and navigate to Sources. Create a new source or use an existing one. Copy the source token - this is what you will use as your bearer token in the Collector config. Also copy the ingesting host for that source.

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
  file_log:
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
  otlp_http/betterstack:
    endpoint: https://${env:BETTER_STACK_INGESTING_HOST}
    headers:
      Authorization: "Bearer ${env:BETTER_STACK_SOURCE_TOKEN}"
    compression: gzip

service:
  pipelines:
    logs:
      receivers: [otlp, file_log]
      processors: [resource, batch]
      exporters: [otlp_http/betterstack]
```

## Breaking Down the Key Sections

### The Exporter Configuration

The exporter section is where the Better Stack integration happens:

```yaml
exporters:
  otlp_http/betterstack:
    endpoint: https://${env:BETTER_STACK_INGESTING_HOST}
    headers:
      Authorization: "Bearer ${env:BETTER_STACK_SOURCE_TOKEN}"
    compression: gzip
```

A few things to note here. The endpoint is the Better Stack OTLP ingest URL for your source. The authorization header uses the standard Bearer scheme. The `${env:BETTER_STACK_SOURCE_TOKEN}` syntax pulls the token from an environment variable, which keeps secrets out of your config files.

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

This sends a batch when it reaches 1000 log records or after 5 seconds, and `send_batch_max_size` caps any single batch at 1500 records. Without batching, the Collector would send smaller, more frequent HTTP requests, which would be inefficient.

## Running the Collector

Set your environment variable and start the Collector:

```bash
# Export your Better Stack source token

export BETTER_STACK_SOURCE_TOKEN="your-source-token-here"
export BETTER_STACK_INGESTING_HOST="your-ingesting-host-here"

# Run the Collector with your config
otelcol-contrib --config otel-collector-config.yaml
```

If you are running in Docker:

```bash
docker run -d \
  --name otel-collector \
  -e BETTER_STACK_SOURCE_TOKEN="your-source-token-here" \
  -e BETTER_STACK_INGESTING_HOST="your-ingesting-host-here" \
  -p 4317:4317 \
  -p 4318:4318 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml \
  ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:latest
```

## Adding Retry and Queue Settings

For production use, add retry logic and a sending queue to handle transient failures:

```yaml
exporters:
  otlp_http/betterstack:
    endpoint: https://${env:BETTER_STACK_INGESTING_HOST}
    headers:
      Authorization: "Bearer ${env:BETTER_STACK_SOURCE_TOKEN}"
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

The retry configuration handles temporary network issues or Better Stack downtime. The sending queue buffers log data in memory if the export pipeline falls behind, reducing data loss during traffic spikes while the queue has capacity.

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

Common issues include incorrect source tokens (double-check the token value), network connectivity problems (ensure the Collector can reach your Better Stack ingesting host on port 443), and misconfigured pipelines (make sure your exporter name matches in the pipeline definition).

The OpenTelemetry Collector's OTLP/HTTP exporter works reliably with Better Stack, and the bearer token auth pattern keeps the configuration simple. Once you have this working, you can expand the pipeline with additional processors for log enrichment or filtering before export.
