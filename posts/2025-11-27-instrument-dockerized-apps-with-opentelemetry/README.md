# How to Instrument Dockerized Apps with OpenTelemetry Sidecars and Agents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, OpenTelemetry, Observability, DevOps, Monitoring

Description: Step-by-step playbooks for instrumenting containerized services using OpenTelemetry SDKs, sidecars, and collector agents—complete with Compose and Swarm manifests and guidance on shipping data to OneUptime.

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

Install the OpenTelemetry SDK in your app and emit data to OTLP:

```ts
// src/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })
});

sdk.start();
```

Set env vars in Compose:

```yaml
services:
  api:
    build: .
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-sidecar:4317
      - OTEL_SERVICE_NAME=payments-api
```

## 3. Sidecar Collector Pattern

Add an OpenTelemetry Collector container alongside each service.

```yaml
services:
  api:
    image: ghcr.io/acme/api:latest
    depends_on:
      - api-otel
  api-otel:
    image: otel/opentelemetry-collector-contrib:0.93.0
    command: ["--config=/etc/otel-config.yaml"]
    volumes:
      - ./otel/api.yaml:/etc/otel-config.yaml
```

`./otel/api.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
processors:
  batch: {}
exporters:
  otlphttp:
    endpoint: https://telemetry.oneuptime.com/v1
    headers:
      Authorization: "Bearer ${ONEUPTIME_API_KEY}"
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Benefits: app SDK only talks to localhost, and you can inject processors (redaction, attributes) per service.

## 4. Host/Swarm Agent Pattern

On Docker Swarm or large Compose stacks, run a single Collector per node.

```yaml
services:
  otel-agent:
    image: otel/opentelemetry-collector-contrib:0.93.0
    deploy:
      mode: global
    configs:
      - source: otel-config
        target: /etc/otel-config.yaml
    ports:
      - 4317:4317/tcp
      - 4318:4318/tcp
configs:
  otel-config:
    file: ./otel/agent.yaml
```

Applications export to `http://otel-agent:4318`. The agent fans data out to OneUptime, Prometheus, or any backend you choose.

## 5. Instrument Logs Too

Use the Collector `filelog` receiver or Docker logging drivers:

```yaml
receivers:
  filelog:
    include: [/var/lib/docker/containers/*/*.log]
    start_at: beginning
processors:
  transform:
    log_statements:
      - context: log
        statements:
          - set(attributes.container_id, attributes["container.id"])
```

Ship transformed logs to OTLP, Loki, or any supported exporter. For JSON logs, set `docker run --log-driver=json-file --log-opt mode=non-blocking` to reduce backpressure.

## 6. Correlate Metrics and Traces

Configure exemplar sampling:

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
exporters:
  otlphttp/oneuptime:
    endpoint: https://oneuptime.com/otlp
    sending_queue:
      queue_size: 2048
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

1. `docker compose up -d`.
2. Hit the API: `hey -z 30s http://localhost:8080/checkout`.
3. Check Collector logs for `Export completed` messages.
4. Confirm traces/metrics/logs in OneUptime dashboards.

Automate this smoke test in CI so telemetry regressions get caught before prod.

---

By standardizing SDK defaults and packaging Collectors as sidecars or agents, you make observability part of every Docker deployment. The result: richer context, faster incident response, and a single pipeline feeding the rest of your reliability tooling.
