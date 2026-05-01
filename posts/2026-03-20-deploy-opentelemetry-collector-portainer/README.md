# How to Deploy OpenTelemetry Collector via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Observability, Portainer, Docker, Tracing, Metric, Logging

Description: Learn how to deploy and configure the OpenTelemetry Collector as a centralized telemetry pipeline using Portainer's stack management interface.

---

The OpenTelemetry Collector is the hub of any modern observability stack - it receives traces, metrics, and logs from your applications and routes them to your backend of choice. Deploying it via Portainer gives you a visual interface for managing the collector's lifecycle, scaling it, and inspecting its configuration.

## What Is the OpenTelemetry Collector?

The OTel Collector is a vendor-agnostic proxy that sits between your instrumented applications and observability backends (Jaeger, Zipkin, Prometheus, Datadog, etc.). It supports three core pipeline components:

- **Receivers** - accept telemetry (OTLP, Jaeger, Zipkin, Prometheus)
- **Processors** - transform, batch, filter, or enrich data
- **Exporters** - forward to backends

## Prerequisites

- Portainer running with access to a Docker environment
- Basic familiarity with Docker Compose / Portainer stacks

## Step 1: Create the Collector Configuration

Before deploying the stack, you need an OTel Collector config file. Store it as a Docker config or bind-mount it.

The following config accepts OTLP over gRPC and HTTP, applies batching, and exports to the collector logs (replace with your actual backend exporter):

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  batch:
    # Batch spans/metrics before exporting to reduce network overhead
    timeout: 5s
    send_batch_size: 512

exporters:
  debug:
    verbosity: detailed
  # Uncomment to export to Jaeger via OTLP
  # otlp/jaeger:
  #   endpoint: "jaeger:4317"
  #   tls:
  #     insecure: true

service:
  telemetry:
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: "0.0.0.0"
                port: 8888
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
```

## Step 2: Deploy via Portainer Stack

In Portainer, go to **Stacks > Add Stack**, name it `otel-collector`, and paste the following:

```yaml
# docker-compose stack for OpenTelemetry Collector
version: "3.8"

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.151.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      # Bind-mount the config file from the host
      - /opt/otel/otel-collector-config.yaml:/etc/otel-collector-config.yaml:ro
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8888:8888"   # Collector metrics (Prometheus format)
      - "8889:8889"   # Prometheus exporter endpoint (if enabled)
    restart: unless-stopped
    networks:
      - observability

networks:
  observability:
    driver: bridge
```

## Step 3: Point Applications to the Collector

Configure your instrumented services to export to the collector using environment variables:

```bash
# For OTLP HTTP exporter
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_SERVICE_NAME=my-service

# For OTLP gRPC exporter
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_SERVICE_NAME=my-service
```

## Step 4: Verify in Portainer

After deploying, use Portainer's **Container Logs** view to confirm the collector started successfully. You should see:

```text
Everything is ready. Begin running and processing data.
```

## Monitoring the Collector Itself

With the telemetry reader above, the collector exposes its own metrics on port `8888`. You can scrape them with Prometheus:

```yaml
# Add to your Prometheus scrape config
scrape_configs:
  - job_name: "otel-collector"
    static_configs:
      - targets: ["otel-collector:8888"]
```

## Scaling the Collector

For high-throughput environments, run multiple collector replicas behind a load balancer. In Portainer, service scaling controls apply to Docker Swarm environments, so update the stack to use Swarm services before scaling replicas.

## Next Steps

- Add an OTLP exporter for Jaeger, or a Zipkin exporter, to visualize traces
- Enable the Prometheus exporter if you want Prometheus to scrape application metrics from the collector
- Use Portainer's environment variables to manage backend endpoints without editing the config file directly
