# How to Configure the Webhook Event Receiver in the OpenTelemetry Collector to Ingest External Event Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Webhooks, Event Ingestion

Description: Configure the OpenTelemetry Collector webhook receiver to accept external event data via HTTP and convert it into logs and traces.

Many external services send notifications through webhooks, including GitHub, Stripe, PagerDuty, and countless others. The OpenTelemetry Collector can act as a webhook endpoint, receiving these events and converting them into structured telemetry data. This gives you a single pipeline for all your observability data, whether it originates from your own services or from external systems.

## The Webhook Receiver

The OpenTelemetry Collector has a `webhookevent` receiver that listens for HTTP POST requests and converts the incoming payloads into log records. This is part of the `opentelemetry-collector-contrib` distribution.

## Basic Configuration

Here is a minimal Collector configuration that sets up a webhook endpoint:

```yaml
# otel-collector-config.yaml
receivers:
  webhookevent:
    # Listen on port 8088 for incoming webhooks
    endpoint: 0.0.0.0:8088
    # Path where the webhook will be available
    path: /events
    # Optionally require a specific HTTP method
    # Default is POST
    required_header:
      # You can require a specific header for basic security
      key: "X-Webhook-Secret"
      value: "my-secret-token-12345"

exporters:
  otlp:
    endpoint: "localhost:4317"
    tls:
      insecure: true

  logging:
    loglevel: debug

processors:
  batch:
    timeout: 5s
    send_batch_size: 100

service:
  pipelines:
    logs:
      receivers: [webhookevent]
      processors: [batch]
      exporters: [otlp, logging]
```

## Handling Multiple Webhook Sources

If you need to accept webhooks from different sources, you can configure multiple receiver instances:

```yaml
receivers:
  webhookevent/github:
    endpoint: 0.0.0.0:8088
    path: /webhooks/github
    required_header:
      key: "X-Hub-Signature-256"
      value: ""  # Any non-empty value accepted

  webhookevent/stripe:
    endpoint: 0.0.0.0:8088
    path: /webhooks/stripe
    required_header:
      key: "Stripe-Signature"
      value: ""

  webhookevent/generic:
    endpoint: 0.0.0.0:8089
    path: /events/ingest

processors:
  batch:
    timeout: 5s

  attributes/github:
    actions:
      - key: "webhook.source"
        value: "github"
        action: insert

  attributes/stripe:
    actions:
      - key: "webhook.source"
        value: "stripe"
        action: insert

exporters:
  otlp:
    endpoint: "localhost:4317"
    tls:
      insecure: true

service:
  pipelines:
    logs/github:
      receivers: [webhookevent/github]
      processors: [attributes/github, batch]
      exporters: [otlp]

    logs/stripe:
      receivers: [webhookevent/stripe]
      processors: [attributes/stripe, batch]
      exporters: [otlp]

    logs/generic:
      receivers: [webhookevent/generic]
      processors: [batch]
      exporters: [otlp]
```

## Enriching Webhook Data with Processors

Raw webhook payloads often need enrichment before they are useful. You can use the `transform` processor to parse and annotate the data:

```yaml
processors:
  transform:
    log_statements:
      - context: log
        statements:
          # Parse the JSON body and extract useful fields
          - set(attributes["event.type"], ParseJSON(body)["action"])
            where IsString(body)
          - set(attributes["event.repository"], ParseJSON(body)["repository"]["full_name"])
            where IsString(body)
          - set(severity_text, "INFO")

  resource:
    attributes:
      - key: "service.name"
        value: "webhook-ingester"
        action: upsert
      - key: "deployment.environment"
        value: "production"
        action: upsert
```

## Sending Webhooks to the Collector

Once the Collector is running, external services can send data to it. Here is how to test it with curl:

```bash
# Send a test webhook event
curl -X POST http://localhost:8088/events \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: my-secret-token-12345" \
  -d '{
    "action": "deployment.created",
    "environment": "production",
    "service": "api-gateway",
    "version": "v2.3.1",
    "timestamp": "2026-02-06T10:30:00Z"
  }'
```

## Adding Health Checks

You should also configure a health check endpoint so that webhook senders can verify the receiver is alive:

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133
    path: /health

service:
  extensions: [health_check]
  pipelines:
    logs:
      receivers: [webhookevent]
      processors: [batch]
      exporters: [otlp]
```

## Securing the Webhook Endpoint

In production, you should put the Collector behind a reverse proxy like nginx or use TLS directly:

```yaml
receivers:
  webhookevent:
    endpoint: 0.0.0.0:8088
    path: /events
    tls:
      cert_file: /etc/otel/certs/server.crt
      key_file: /etc/otel/certs/server.key
```

For a reverse proxy setup with nginx:

```nginx
server {
    listen 443 ssl;
    server_name webhooks.example.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location /events {
        proxy_pass http://otel-collector:8088/events;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Docker Compose Setup

Here is a complete Docker Compose setup for running the Collector with webhook ingestion:

```yaml
version: "3.8"
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports:
      - "8088:8088"   # Webhook receiver
      - "4317:4317"   # OTLP gRPC
      - "13133:13133" # Health check
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
```

The webhook receiver turns your OpenTelemetry Collector into a universal event ingestion point. Any system that can send an HTTP POST request can now feed data into your observability pipeline, without needing an OpenTelemetry SDK installed.
