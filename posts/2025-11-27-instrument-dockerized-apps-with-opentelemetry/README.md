# How to Instrument Dockerized Apps with OpenTelemetry Sidecars and Agents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, OpenTelemetry, Observability, DevOps, Monitoring

Description: Step-by-step playbooks for instrumenting containerized services using OpenTelemetry SDKs, sidecars, and collector agents-complete with Compose and Swarm manifests and guidance on shipping data to OneUptime.

---

Telemetry should be a feature of your container stack, not an afterthought. This guide walks through three tiers of instrumentation for Docker workloads so you can stream traces, metrics, and logs into OneUptime with minimal toil.

## 1. Decide on the Pattern

| Pattern | When to Use | Pros | Trade-offs |
| --- | --- | --- | --- |
| **In-process SDK only** | Single service, simple deploys | Lowest latency, fine-grained control | Every language config is manual |
| **Sidecar Collector** | Polyglot microservices, per-service config | Keeps pipelines close to the app | More containers to run |
| **Daemon/Agent** | Swarm/Kubernetes, shared nodes | Central policy, fewer configs | Requires stable networking and service discovery |

Most teams blend SDK + sidecar or agent.

## 2. SDK Baseline

Install the OpenTelemetry SDK in your app and emit data to OTLP. This initialization code should run before your application starts to capture all traces.

```ts
// src/telemetry.ts - Initialize OpenTelemetry before importing your app
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

// Configure the SDK to export traces via gRPC to the collector
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT  // Points to collector
  })
});

// Start the SDK - must be called before your app code runs
sdk.start();
```

Set env vars in Compose to configure where traces are sent and how the service is identified.

```yaml
services:
  api:
    build: .
    environment:
      # gRPC endpoint of the OpenTelemetry Collector
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-sidecar:4317
      # Service name appears in trace visualizations
      - OTEL_SERVICE_NAME=payments-api
```

## 3. Sidecar Collector Pattern

Add an OpenTelemetry Collector container alongside each service. This pattern gives you per-service configuration and keeps telemetry traffic local.

```yaml
services:
  api:
    image: ghcr.io/acme/api:latest
    depends_on:
      - api-otel                    # Wait for collector to be ready

  # Sidecar collector for the API service
  api-otel:
    image: otel/opentelemetry-collector-contrib:0.93.0
    command: ["--config=/etc/otel-config.yaml"]
    volumes:
      - ./otel/api.yaml:/etc/otel-config.yaml  # Service-specific config
```

The collector configuration (`./otel/api.yaml`) defines how telemetry flows from your app to the backend.

```yaml
# Receivers: How the collector ingests data
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317      # Listen for gRPC OTLP on port 4317

# Processors: Transform data before export
processors:
  batch: {}                         # Batch data for efficient transmission

# Exporters: Where to send the processed data
exporters:
  otlphttp:
    endpoint: https://telemetry.oneuptime.com/v1
    headers:
      Authorization: "Bearer ${ONEUPTIME_API_KEY}"  # Auth via env var

# Pipelines: Connect receivers -> processors -> exporters
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Benefits: app SDK only talks to localhost, and you can inject processors (redaction, attributes) per service.

## 4. Host/Swarm Agent Pattern

On Docker Swarm or large Compose stacks, run a single Collector per node. This reduces the number of collector instances while still providing local endpoints for applications.

```yaml
services:
  otel-agent:
    image: otel/opentelemetry-collector-contrib:0.93.0
    deploy:
      mode: global                  # Run exactly one instance per swarm node
    configs:
      - source: otel-config
        target: /etc/otel-config.yaml
    ports:
      - 4317:4317/tcp               # gRPC OTLP endpoint
      - 4318:4318/tcp               # HTTP OTLP endpoint

# Swarm configs for centralized configuration management
configs:
  otel-config:
    file: ./otel/agent.yaml
```

Applications export to `http://otel-agent:4318`. The agent fans data out to OneUptime, Prometheus, or any backend you choose.

## 5. Instrument Logs Too

Use the Collector `filelog` receiver to scrape container logs directly from disk and correlate them with traces.

```yaml
# Receiver configuration for container logs
receivers:
  filelog:
    include: [/var/lib/docker/containers/*/*.log]  # Docker's default log location
    start_at: beginning                             # Process existing logs on startup

# Transform logs to add useful attributes
processors:
  transform:
    log_statements:
      - context: log
        statements:
          # Extract container ID from the file path and add as attribute
          - set(attributes.container_id, attributes["container.id"])
```

Ship transformed logs to OTLP, Loki, or any supported exporter. For JSON logs, set `docker run --log-driver=json-file --log-opt mode=non-blocking` to reduce backpressure.

## 6. Correlate Metrics and Traces

Configure exemplar sampling to link metrics to specific traces. This lets you jump from a spike in latency directly to the trace that caused it.

```yaml
# Processors protect the collector from memory issues
processors:
  memory_limiter:
    check_interval: 1s             # How often to check memory usage
    limit_mib: 512                 # Maximum memory before dropping data

# Export metrics to OneUptime with queuing for reliability
exporters:
  otlphttp/oneuptime:
    endpoint: https://oneuptime.com/otlp
    sending_queue:
      queue_size: 2048             # Buffer size for backpressure handling

# Metrics pipeline connects receivers through processors to exporters
service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/oneuptime]
```

Enable exemplars in your SDK (e.g., Prometheus client) so a high latency data point links to the exact trace id.

## 7. Secure the Pipeline

- Place Collectors on a private network; only expose 4317/4318 internally.
- Use mTLS between apps and collectors where possible (`tls` blocks in the receiver/exporter).
- Store OneUptime API tokens in secrets managers, mount them as files, and reference with `${}` in Collector configs.

## 8. Verify End-to-End

Follow this verification checklist to confirm telemetry is flowing correctly from your containers to your observability backend.

1. Start the entire stack including collectors:
   ```bash
   docker compose up -d
   ```

2. Generate traffic to create telemetry data:
   ```bash
   # Use 'hey' (HTTP load generator) to send requests for 30 seconds
   hey -z 30s http://localhost:8080/checkout
   ```

3. Check Collector logs for `Export completed` messages indicating successful data transmission.

4. Confirm traces/metrics/logs appear in OneUptime dashboards.

Automate this smoke test in CI so telemetry regressions get caught before prod.

---

By standardizing SDK defaults and packaging Collectors as sidecars or agents, you make observability part of every Docker deployment. The result: richer context, faster incident response, and a single pipeline feeding the rest of your reliability tooling.
