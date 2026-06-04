# How to configure OpenTelemetry Collector pipelines for routing telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Observability, Pipeline, Routing, Architecture

Description: Configure OpenTelemetry Collector pipelines for intelligent telemetry routing including multi-pipeline architectures, conditional routing, fan-out patterns.

---

OpenTelemetry Collector pipelines define the flow of telemetry data from receivers through processors to exporters. Connectors can link pipelines together and enable routing different data to different backends based on attributes, implementing multi-tenancy, and creating sophisticated observability architectures. This guide covers building complex pipeline configurations for real-world scenarios.

## Understanding Pipeline Architecture

A pipeline consists of receivers that accept data, processors that transform it, and exporters that send it to backends. Connectors can act as both exporters and receivers to connect pipelines together. The collector can run multiple pipelines simultaneously, each handling different signal types (traces, metrics, logs) or routing data differently based on criteria.

Multiple pipelines enable sophisticated routing patterns. You might send high-priority traces to one backend and sampled traces to another. Or route metrics from production services to one Prometheus instance and development metrics to another. The routing connector and multiple pipeline definitions make this possible.

## Configuring Basic Multi-Pipeline Setup

Start with a simple multi-pipeline configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
  memory_limiter:
    limit_mib: 512

exporters:
  otlp/prod:
    endpoint: prod-backend:4317
  otlp/dev:
    endpoint: dev-backend:4317
  debug:
    verbosity: detailed

service:
  pipelines:
    # Production traces pipeline
    traces/prod:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/prod]

    # Development traces pipeline
    traces/dev:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/dev, debug]

    # Metrics pipeline (single path)
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/prod]
```

This creates separate pipelines but doesn't route dynamically. For conditional routing, use the routing connector.

## Implementing Attribute-Based Routing

Route telemetry based on attributes using the routing connector:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  routing:
    default_pipelines:
    - traces/default
    table:
    - context: resource
      condition: attributes["service.namespace"] == "production"
      pipelines:
      - traces/production
    - context: resource
      condition: attributes["service.namespace"] == "staging"
      pipelines:
      - traces/staging
    - context: resource
      condition: attributes["service.namespace"] == "development"
      pipelines:
      - traces/development

processors:
  batch:
    timeout: 10s

exporters:
  otlp/prod-jaeger:
    endpoint: prod-jaeger:4317
  otlphttp/prod-oneuptime:
    endpoint: https://oneuptime.com/otlp
    headers:
      "x-oneuptime-token": "${env:PROD_API_KEY}"
  otlp/staging-jaeger:
    endpoint: staging-jaeger:4317
  otlp/default:
    endpoint: default-backend:4317
  debug:
    verbosity: basic

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      exporters: [routing]
    traces/production:
      receivers: [routing]
      processors: [batch]
      exporters:
      - otlp/prod-jaeger
      - otlphttp/prod-oneuptime
    traces/staging:
      receivers: [routing]
      processors: [batch]
      exporters:
      - otlp/staging-jaeger
    traces/default:
      receivers: [routing]
      processors: [batch]
      exporters:
      - otlp/default
    traces/development:
      receivers: [routing]
      processors: [batch]
      exporters:
      - debug
```

The routing connector examines the `service.namespace` resource attribute and routes to appropriate pipelines based on the value.

## Implementing Multi-Tenant Routing

Route telemetry from different tenants to isolated backends:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        include_metadata: true

connectors:
  routing/tenant:
    default_pipelines:
    - traces/default
    table:
    - context: request
      condition: request["tenant-id"] == "tenant-a"
      pipelines:
      - traces/tenant-a
    - context: request
      condition: request["tenant-id"] == "tenant-b"
      pipelines:
      - traces/tenant-b
    - context: request
      condition: request["tenant-id"] == "tenant-c"
      pipelines:
      - traces/tenant-c

processors:
  resource/tenant-a:
    attributes:
    - key: tenant.id
      value: tenant-a
      action: upsert
  resource/tenant-b:
    attributes:
    - key: tenant.id
      value: tenant-b
      action: upsert
  resource/tenant-c:
    attributes:
    - key: tenant.id
      value: tenant-c
      action: upsert

  batch:
    timeout: 10s

exporters:
  otlp/tenant-a:
    endpoint: tenant-a-backend:4317
    headers:
      "x-tenant-id": "tenant-a"
  otlp/tenant-b:
    endpoint: tenant-b-backend:4317
    headers:
      "x-tenant-id": "tenant-b"
  otlp/tenant-c:
    endpoint: tenant-c-backend:4317
    headers:
      "x-tenant-id": "tenant-c"
  otlp/default:
    endpoint: default-backend:4317

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      exporters:
      - routing/tenant
    traces/tenant-a:
      receivers: [routing/tenant]
      processors:
      - resource/tenant-a
      - batch
      exporters:
      - otlp/tenant-a
    traces/tenant-b:
      receivers: [routing/tenant]
      processors:
      - resource/tenant-b
      - batch
      exporters:
      - otlp/tenant-b
    traces/tenant-c:
      receivers: [routing/tenant]
      processors:
      - resource/tenant-c
      - batch
      exporters:
      - otlp/tenant-c
    traces/default:
      receivers: [routing/tenant]
      processors: [batch]
      exporters: [otlp/default]
```

## Implementing Priority-Based Routing

Route high-priority telemetry to premium backends:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  routing/priority:
    error_mode: ignore
    default_pipelines:
    - traces/normal
    table:
    - context: span
      condition: status.code == STATUS_CODE_ERROR
      pipelines:
      - traces/high-priority
    - context: span
      condition: attributes["http.status_code"] >= 500 and attributes["http.status_code"] < 600
      pipelines:
      - traces/high-priority
    - context: span
      condition: attributes["duration_ms"] >= 5000
      pipelines:
      - traces/high-priority

processors:
  # Sample normal priority traces
  tail_sampling/normal:
    policies:
    - name: sample-normal
      type: probabilistic
      probabilistic:
        sampling_percentage: 10

  batch:
    timeout: 5s

exporters:
  otlp/premium:
    endpoint: premium-backend:4317
    timeout: 5s
    retry_on_failure:
      enabled: true
  otlp/alerting:
    endpoint: alerting-backend:4317
  otlp/standard:
    endpoint: standard-backend:4317
    timeout: 30s

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      exporters:
      - routing/priority

    # High priority path (no sampling)
    traces/high-priority:
      receivers: [routing/priority]
      processors:
      - batch
      exporters:
      - otlp/premium
      - otlp/alerting

    # Normal priority path (sampled)
    traces/normal:
      receivers: [routing/priority]
      processors:
      - tail_sampling/normal
      - batch
      exporters:
      - otlp/standard
```

## Implementing Fan-Out Pattern

Send same telemetry to multiple backends with different processing:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Full fidelity processing
  batch/full:
    timeout: 10s
    send_batch_size: 1000

  # Sampled processing for long-term storage
  tail_sampling/sampled:
    policies:
    - name: errors
      type: status_code
      status_code:
        status_codes: [ERROR]
    - name: slow
      type: latency
      latency:
        threshold_ms: 1000
    - name: random-sample
      type: probabilistic
      probabilistic:
        sampling_percentage: 5

  batch/sampled:
    timeout: 30s
    send_batch_size: 5000

connectors:
  # Aggregated metrics from traces
  spanmetrics:
    histogram:
      explicit:
        buckets: [2ms, 8ms, 50ms, 100ms, 200ms, 500ms, 1s, 5s, 10s]
    dimensions:
    - name: http.method
      default: GET
    - name: http.status_code
    dimensions_cache_size: 10000

exporters:
  # Real-time trace backend
  otlp/jaeger:
    endpoint: jaeger:4317

  # Long-term trace storage (sampled)
  otlp/s3:
    endpoint: s3-exporter:4317

  # Metrics from traces
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

  # Alerting backend
  otlphttp/oneuptime:
    endpoint: https://oneuptime.com/otlp
    headers:
      "x-oneuptime-token": "${env:ONEUPTIME_API_KEY}"

service:
  pipelines:
    # Full fidelity traces for real-time analysis
    traces/realtime:
      receivers: [otlp]
      processors: [batch/full]
      exporters: [otlp/jaeger, otlphttp/oneuptime, spanmetrics]

    # Sampled traces for long-term storage
    traces/longterm:
      receivers: [otlp]
      processors: [tail_sampling/sampled, batch/sampled]
      exporters: [otlp/s3]

    # Generate metrics from traces
    metrics/spanmetrics:
      receivers: [spanmetrics]
      exporters: [prometheusremotewrite]
```

## Implementing Environment-Based Routing

Route based on deployment environment:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  routing/environment:
    error_mode: ignore
    default_pipelines:
    - traces/default
    table:
    - context: resource
      condition: attributes["deployment.environment"] == "prod"
      pipelines:
      - traces/prod-premium
    - context: resource
      condition: IsMatch(attributes["deployment.environment"], "^prod-.+")
      pipelines:
      - traces/prod-standard
    - context: resource
      condition: IsMatch(attributes["deployment.environment"], "^staging-.+")
      pipelines:
      - traces/staging
    - context: resource
      condition: IsMatch(attributes["deployment.environment"], "^dev-.+")
      pipelines:
      - traces/dev

processors:
  resource/detect-env:
    attributes:
    - key: deployment.environment
      from_attribute: k8s.namespace.name
      action: insert

  batch:
    timeout: 10s

exporters:
  otlp/prod-premium:
    endpoint: prod-premium:4317
  otlp/prod-standard:
    endpoint: prod-standard:4317
  otlp/staging:
    endpoint: staging:4317
  otlp/dev:
    endpoint: dev:4317
  debug:
    verbosity: basic

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      processors:
      - resource/detect-env
      exporters:
      - routing/environment
    traces/prod-premium:
      receivers: [routing/environment]
      processors: [batch]
      exporters:
      - otlp/prod-premium
    traces/prod-standard:
      receivers: [routing/environment]
      processors: [batch]
      exporters:
      - otlp/prod-standard
    traces/staging:
      receivers: [routing/environment]
      processors: [batch]
      exporters:
      - otlp/staging
    traces/dev:
      receivers: [routing/environment]
      processors: [batch]
      exporters:
      - otlp/dev
    traces/default:
      receivers: [routing/environment]
      processors: [batch]
      exporters:
      - debug
```

## Implementing Cost-Optimized Routing

Route expensive telemetry differently to optimize costs:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  routing/cost:
    error_mode: ignore
    default_pipelines:
    - traces/standard
    table:
    - context: span
      condition: IsMatch(attributes["http.target"], "^/(metrics|health|readiness)")
      pipelines:
      - traces/high-volume
    - context: resource
      condition: IsMatch(attributes["service.name"], "^(payment|auth|checkout)")
      pipelines:
      - traces/business

processors:
  # Aggressive sampling for high-volume data
  tail_sampling/high-volume:
    policies:
    - name: errors-only
      type: status_code
      status_code:
        status_codes: [ERROR]
    - name: minimal-sample
      type: probabilistic
      probabilistic:
        sampling_percentage: 1

  # Light sampling for business-critical
  tail_sampling/business:
    policies:
    - name: always-errors
      type: status_code
      status_code:
        status_codes: [ERROR]
    - name: slow-traces
      type: latency
      latency:
        threshold_ms: 500
    - name: sample-rest
      type: probabilistic
      probabilistic:
        sampling_percentage: 20

  batch:
    timeout: 10s

exporters:
  otlp/premium-storage:
    endpoint: premium:4317
    # Full fidelity, fast access
  otlp/standard-storage:
    endpoint: standard:4317
    # Good performance, reasonable cost
  otlp/cheap-storage:
    endpoint: s3-archive:4317
    # Heavily sampled, cold storage

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      exporters:
      - routing/cost

    traces/high-volume:
      receivers: [routing/cost]
      processors:
      - tail_sampling/high-volume
      - batch
      exporters: [otlp/cheap-storage]

    traces/business:
      receivers: [routing/cost]
      processors:
      - tail_sampling/business
      - batch
      exporters: [otlp/premium-storage]

    traces/standard:
      receivers: [routing/cost]
      processors:
      - batch
      exporters: [otlp/standard-storage]
```

## Monitoring Pipeline Health

Track pipeline metrics:

```bash
# View pipeline metrics

kubectl port-forward -n observability svc/otel-collector 8888:8888
curl http://localhost:8888/metrics | grep pipeline

# Key metrics per pipeline:
# otelcol_receiver_accepted_spans{pipeline="traces/prod"}
# otelcol_processor_incoming_items{pipeline="traces/prod",processor="batch"}
# otelcol_exporter_sent_spans{pipeline="traces/prod",exporter="otlp/prod"}
```

Create dashboard for pipeline visualization:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-pipeline-dashboard
  namespace: observability
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "OTel Collector Pipelines",
        "panels": [
          {
            "title": "Spans by Pipeline",
            "targets": [{
              "expr": "rate(otelcol_receiver_accepted_spans[5m])"
            }]
          },
          {
            "title": "Pipeline Latency",
            "targets": [{
              "expr": "histogram_quantile(0.95, rate(otelcol_processor_batch_batch_send_latency_bucket[5m]))"
            }]
          }
        ]
      }
    }
```

## Troubleshooting Complex Pipelines

Debug routing issues:

```bash
# Enable detailed logging
service:
  telemetry:
    logs:
      level: debug

# Trace a specific span through pipelines
kubectl logs -n observability -l app=otel-collector -f | grep "span_id=abc123"

# Check routing decisions
kubectl logs -n observability -l app=otel-collector | grep routing

# Validate configuration
kubectl exec -n observability deployment/otel-collector -- \
  otelcol validate --config=/conf/config.yaml
```

OpenTelemetry Collector pipelines enable sophisticated telemetry routing patterns. By combining multiple pipelines, routing connectors, and conditional logic, you can build cost-effective observability architectures that send the right data to the right place based on priority, tenant, environment, or any other criteria relevant to your organization.
