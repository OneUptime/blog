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

This minimal SDK setup configures trace export via gRPC to an OpenTelemetry Collector. The key is importing and starting this module before any other application code, so auto-instrumentation can wrap HTTP clients, database drivers, and other libraries.

```ts
// src/telemetry.ts - Initialize OpenTelemetry before importing your app
// IMPORTANT: This file must be imported first in your entry point

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

// Configure the SDK to export traces via gRPC to the collector
// gRPC is more efficient than HTTP for high-volume trace export
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    // Environment variable allows flexible configuration per environment
    // In Docker Compose, this points to the sidecar collector service
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT  // e.g., 'http://otel-sidecar:4317'
  })
});

// Start the SDK - must be called before your app code runs
// This enables auto-instrumentation for HTTP, Express, database clients, etc.
sdk.start();

// Optional: Handle graceful shutdown to flush remaining spans
process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

Set env vars in Compose to configure where traces are sent and how the service is identified.

This Docker Compose snippet shows the essential environment variables for OpenTelemetry configuration. These standard variables are recognized by all OpenTelemetry SDKs, making your configuration portable across languages.

```yaml
services:
  api:
    build: .
    environment:
      # gRPC endpoint of the OpenTelemetry Collector
      # Uses Docker's internal DNS to resolve the sidecar service name
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-sidecar:4317

      # Service name appears in trace visualizations and enables filtering
      # Use a descriptive, unique name for each microservice
      - OTEL_SERVICE_NAME=payments-api

      # Optional: Set resource attributes for additional context
      # - OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,service.version=1.2.3
```

## 3. Sidecar Collector Pattern

Add an OpenTelemetry Collector container alongside each service. This pattern gives you per-service configuration and keeps telemetry traffic local.

This Docker Compose configuration deploys a dedicated collector sidecar for each service. The sidecar pattern keeps telemetry processing local to the service, enables per-service sampling and transformation rules, and reduces cross-network traffic.

```yaml
services:
  # Your application service
  api:
    image: ghcr.io/acme/api:latest
    depends_on:
      - api-otel                    # Wait for collector to be ready before starting

  # Sidecar collector for the API service
  # Each service gets its own collector for isolation and custom configuration
  api-otel:
    image: otel/opentelemetry-collector-contrib:0.93.0
    command: ["--config=/etc/otel-config.yaml"]  # Path to mounted config
    volumes:
      # Mount service-specific config - allows different sampling/processing per service
      - ./otel/api.yaml:/etc/otel-config.yaml  # Service-specific config
```

The collector configuration (`./otel/api.yaml`) defines how telemetry flows from your app to the backend.

This collector configuration file defines a complete telemetry pipeline. The receiver accepts OTLP data from your application, the batch processor groups data for efficient transmission, and the exporter sends it to your observability backend with authentication.

```yaml
# Receivers: How the collector ingests data from applications
# OTLP is the OpenTelemetry Protocol - the standard format for all signals
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317      # Listen on all interfaces, port 4317 (gRPC standard)
        # For HTTP: endpoint: 0.0.0.0:4318

# Processors: Transform data before export
# Order matters - data flows through processors in the order listed in pipelines
processors:
  batch:                            # Group telemetry into batches for efficiency
    timeout: 1s                     # Send batch after 1 second even if not full
    send_batch_size: 1024           # Max items per batch

# Exporters: Where to send the processed data
exporters:
  otlphttp:
    endpoint: https://telemetry.oneuptime.com/v1  # OneUptime's OTLP endpoint
    headers:
      # Auth token from environment variable - never hardcode secrets
      Authorization: "Bearer ${ONEUPTIME_API_KEY}"

# Service section wires everything together into pipelines
# Each pipeline connects: receivers -> processors -> exporters
service:
  pipelines:
    traces:
      receivers: [otlp]             # Accept OTLP trace data
      processors: [batch]           # Batch before sending
      exporters: [otlphttp]         # Send to OneUptime
```

Benefits: app SDK only talks to localhost, and you can inject processors (redaction, attributes) per service.

## 4. Host/Swarm Agent Pattern

On Docker Swarm or large Compose stacks, run a single Collector per node. This reduces the number of collector instances while still providing local endpoints for applications.

This Swarm configuration deploys the collector as a global service, meaning exactly one instance runs on each node. All applications on that node send telemetry to the local collector, which then forwards to the backend. This pattern reduces resource overhead compared to sidecars while maintaining locality.

```yaml
services:
  otel-agent:
    image: otel/opentelemetry-collector-contrib:0.93.0
    deploy:
      mode: global                  # Run exactly one instance per swarm node
      # Optional: Add resource constraints
      # resources:
      #   limits:
      #     cpus: '0.5'
      #     memory: 256M
    configs:
      - source: otel-config
        target: /etc/otel-config.yaml  # Swarm mounts config at this path
    ports:
      - 4317:4317/tcp               # gRPC OTLP endpoint - standard port
      - 4318:4318/tcp               # HTTP OTLP endpoint - for browsers/HTTP clients

# Swarm configs for centralized configuration management
# Changes to configs trigger rolling updates of the service
configs:
  otel-config:
    file: ./otel/agent.yaml         # Local file deployed to all nodes
```

Applications export to `http://otel-agent:4318`. The agent fans data out to OneUptime, Prometheus, or any backend you choose.

## 5. Instrument Logs Too

Use the Collector `filelog` receiver to scrape container logs directly from disk and correlate them with traces.

This configuration enables the collector to ingest container logs from Docker's log directory. The filelog receiver tails log files and the transform processor enriches them with container metadata. This enables log-to-trace correlation when applications include trace IDs in their log output.

```yaml
# Receiver configuration for container logs
# The filelog receiver tails files and emits log records
receivers:
  filelog:
    # Glob pattern matching Docker's container log location
    # Each container has a log file named <container-id>-json.log
    include: [/var/lib/docker/containers/*/*.log]

    # start_at: beginning = process existing logs on collector startup
    # start_at: end = only process new logs (recommended for production)
    start_at: beginning

    # Optional: Add operators to parse JSON logs
    # operators:
    #   - type: json_parser
    #     timestamp:
    #       parse_from: body.time
    #       layout: '%Y-%m-%dT%H:%M:%S.%fZ'

# Transform logs to add useful attributes for filtering and correlation
processors:
  transform:
    log_statements:
      - context: log
        statements:
          # Extract container ID from the file path and add as queryable attribute
          # This enables filtering logs by container in your observability UI
          - set(attributes.container_id, attributes["container.id"])
```

Ship transformed logs to OTLP, Loki, or any supported exporter. For JSON logs, set `docker run --log-driver=json-file --log-opt mode=non-blocking` to reduce backpressure.

## 6. Correlate Metrics and Traces

Configure exemplar sampling to link metrics to specific traces. This lets you jump from a spike in latency directly to the trace that caused it.

This configuration shows a production-ready metrics pipeline with memory protection and reliable delivery. The memory limiter prevents the collector from consuming too much RAM during traffic spikes, while the sending queue buffers data during backend outages.

```yaml
# Processors protect the collector from memory issues
# Memory limiter should be FIRST in the processor chain
processors:
  memory_limiter:
    check_interval: 1s             # How often to check memory usage
    limit_mib: 512                 # Hard limit - start dropping data above this
    spike_limit_mib: 128           # Allow temporary spikes up to this additional amount

  batch:
    timeout: 5s                    # Send batch after 5 seconds max
    send_batch_size: 1000          # Or when batch reaches 1000 items

# Export metrics to OneUptime with queuing for reliability
exporters:
  otlphttp/oneuptime:
    endpoint: https://oneuptime.com/otlp
    sending_queue:
      enabled: true
      queue_size: 2048             # Buffer size - holds data during backend outages
      num_consumers: 4             # Parallel export workers for throughput

# Metrics pipeline connects receivers through processors to exporters
# Note: memory_limiter should be first, batch should be last before export
service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]  # Order matters!
      exporters: [otlphttp/oneuptime]
```

Enable exemplars in your SDK (e.g., Prometheus client) so a high latency data point links to the exact trace id.

## 7. Secure the Pipeline

- Place Collectors on a private network; only expose 4317/4318 internally.
- Use mTLS between apps and collectors where possible (`tls` blocks in the receiver/exporter).
- Store OneUptime API tokens in secrets managers, mount them as files, and reference with `${}` in Collector configs.

## 8. Verify End-to-End

Follow this verification checklist to confirm telemetry is flowing correctly from your containers to your observability backend.

These commands help you verify that your telemetry pipeline is working end-to-end. Start with deploying the stack, generate some traffic, and then verify data appears both in collector logs and your observability backend.

1. Start the entire stack including collectors:
   ```bash
   # Start all services in detached mode
   # The -d flag runs containers in the background
   docker compose up -d

   # Verify all containers are running
   docker compose ps
   ```

2. Generate traffic to create telemetry data:
   ```bash
   # Use 'hey' (HTTP load generator) to send requests for 30 seconds
   # Install with: go install github.com/rakyll/hey@latest
   hey -z 30s http://localhost:8080/checkout

   # Alternative: Use curl for simple verification
   # for i in {1..10}; do curl -s http://localhost:8080/checkout; done
   ```

3. Check Collector logs for export success:
   ```bash
   # Look for "Export completed" messages indicating successful data transmission
   docker compose logs otel-collector | grep -i "export"

   # Check for any errors
   docker compose logs otel-collector | grep -i "error"
   ```

4. Confirm traces/metrics/logs appear in OneUptime dashboards.

Automate this smoke test in CI so telemetry regressions get caught before prod.

---

By standardizing SDK defaults and packaging Collectors as sidecars or agents, you make observability part of every Docker deployment. The result: richer context, faster incident response, and a single pipeline feeding the rest of your reliability tooling.
