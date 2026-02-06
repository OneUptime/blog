# How to Configure the OpenTelemetry Collector to Export to Axiom with Per-Signal Dataset Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Axiom, Dataset Routing

Description: Configure the OpenTelemetry Collector to route traces, metrics, and logs to separate Axiom datasets with per-signal exporter configuration.

When using the OpenTelemetry Collector with Axiom, you typically want each signal type (traces, metrics, logs) going to its own Axiom dataset. This keeps your data organized and lets you apply different retention policies and access controls per signal type. The Collector makes this easy with named exporter instances.

## Per-Signal Dataset Routing

```yaml
# otel-collector-axiom.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 512

  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert

exporters:
  # Separate exporter for traces
  otlphttp/axiom-traces:
    endpoint: "https://api.axiom.co"
    headers:
      Authorization: "Bearer ${AXIOM_API_TOKEN}"
      X-Axiom-Dataset: "otel-traces"
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s

  # Separate exporter for metrics
  otlphttp/axiom-metrics:
    endpoint: "https://api.axiom.co"
    headers:
      Authorization: "Bearer ${AXIOM_API_TOKEN}"
      X-Axiom-Dataset: "otel-metrics"
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s

  # Separate exporter for logs
  otlphttp/axiom-logs:
    endpoint: "https://api.axiom.co"
    headers:
      Authorization: "Bearer ${AXIOM_API_TOKEN}"
      X-Axiom-Dataset: "otel-logs"
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp/axiom-traces]

    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp/axiom-metrics]

    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp/axiom-logs]
```

## Service-Based Dataset Routing

You can also route different services to different datasets using the routing processor:

```yaml
processors:
  routing/traces:
    from_attribute: service.name
    attribute_source: resource
    table:
      frontend-service:
        exporters: [otlphttp/axiom-frontend]
      backend-api:
        exporters: [otlphttp/axiom-backend]
      payment-service:
        exporters: [otlphttp/axiom-payments]
    default_exporters: [otlphttp/axiom-default]

exporters:
  otlphttp/axiom-frontend:
    endpoint: "https://api.axiom.co"
    headers:
      Authorization: "Bearer ${AXIOM_API_TOKEN}"
      X-Axiom-Dataset: "frontend-traces"

  otlphttp/axiom-backend:
    endpoint: "https://api.axiom.co"
    headers:
      Authorization: "Bearer ${AXIOM_API_TOKEN}"
      X-Axiom-Dataset: "backend-traces"

  otlphttp/axiom-payments:
    endpoint: "https://api.axiom.co"
    headers:
      Authorization: "Bearer ${AXIOM_API_TOKEN}"
      X-Axiom-Dataset: "payment-traces"

  otlphttp/axiom-default:
    endpoint: "https://api.axiom.co"
    headers:
      Authorization: "Bearer ${AXIOM_API_TOKEN}"
      X-Axiom-Dataset: "default-traces"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, routing/traces]
      exporters: [otlphttp/axiom-frontend, otlphttp/axiom-backend,
                   otlphttp/axiom-payments, otlphttp/axiom-default]
```

## Adding Sampling to Reduce Volume

Axiom pricing is usage-based, so sampling can help control costs:

```yaml
processors:
  # Probabilistic sampling for traces
  probabilistic_sampler:
    sampling_percentage: 25

  # Filter out debug-level logs
  filter/logs:
    logs:
      log_record:
        - 'severity_number < 9'  # Drop TRACE and DEBUG level

  batch:
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [probabilistic_sampler, batch]
      exporters: [otlphttp/axiom-traces]

    logs:
      receivers: [otlp]
      processors: [filter/logs, batch]
      exporters: [otlphttp/axiom-logs]
```

## Environment-Based Routing

Route staging and production data to different datasets:

```yaml
processors:
  routing/env:
    from_attribute: deployment.environment
    attribute_source: resource
    table:
      production:
        exporters: [otlphttp/axiom-prod]
      staging:
        exporters: [otlphttp/axiom-staging]
    default_exporters: [otlphttp/axiom-prod]

exporters:
  otlphttp/axiom-prod:
    endpoint: "https://api.axiom.co"
    headers:
      Authorization: "Bearer ${AXIOM_PROD_TOKEN}"
      X-Axiom-Dataset: "prod-traces"

  otlphttp/axiom-staging:
    endpoint: "https://api.axiom.co"
    headers:
      Authorization: "Bearer ${AXIOM_STAGING_TOKEN}"
      X-Axiom-Dataset: "staging-traces"
```

## Docker Compose for Local Testing

```yaml
version: "3.8"
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    environment:
      - AXIOM_API_TOKEN=${AXIOM_API_TOKEN}
    ports:
      - "4317:4317"
      - "4318:4318"
      - "8888:8888"
    volumes:
      - ./otel-collector-axiom.yaml:/etc/otelcol-contrib/config.yaml
    command: ["--config", "/etc/otelcol-contrib/config.yaml"]
```

## Verifying Data in Axiom

After setting up the Collector, verify data is flowing:

```bash
# Send a test trace
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{"key": "service.name", "value": {"stringValue": "test"}}]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "5b8efff798038103d269b633813fc60c",
          "spanId": "eee19b7ec3c1b174",
          "name": "test-span",
          "startTimeUnixNano": 1706000000000000000,
          "endTimeUnixNano": 1706000001000000000,
          "kind": 1
        }]
      }]
    }]
  }'
```

Per-signal dataset routing keeps your Axiom workspace organized. Traces, metrics, and logs each get their own dataset with independent retention policies, and you can further split by service or environment for teams that need data isolation.
