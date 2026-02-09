# How to configure OpenTelemetry Collector pipelines for routing telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Observability, Pipelines, Routing, Architecture

Description: Configure OpenTelemetry Collector pipelines for intelligent telemetry routing including multi-pipeline architectures, conditional routing, fan-out patterns, and tenant isolation strategies for complex observability requirements.

---

OpenTelemetry Collector pipelines define the flow of telemetry data from receivers through processors to exporters. Advanced routing allows sending different data to different backends based on attributes, implementing multi-tenancy, and creating sophisticated observability architectures. This guide covers building complex pipeline configurations for real-world scenarios.

## Understanding Pipeline Architecture

A pipeline consists of three components: receivers accept data, processors transform it, and exporters send it to backends. The collector can run multiple pipelines simultaneously, each handling different signal types (traces, metrics, logs) or routing data differently based on criteria.

Multiple pipelines enable sophisticated routing patterns. You might send high-priority traces to one backend and sampled traces to another. Or route metrics from production services to one Prometheus instance and development metrics to another. The routing processor and multiple pipeline definitions make this possible.

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
  logging:
    loglevel: debug

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
      exporters: [otlp/dev, logging]

    # Metrics pipeline (single path)
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/prod]
```

This creates separate pipelines but doesn't route dynamically. For conditional routing, use the routing processor.

## Implementing Attribute-Based Routing

Route telemetry based on attributes using the routing processor:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

  routing:
    from_attribute: service.namespace
    default_exporters:
    - otlp/default
    table:
    - value: production
      exporters:
      - otlp/prod-jaeger
      - otlp/prod-oneuptime
    - value: staging
      exporters:
      - otlp/staging-jaeger
    - value: development
      exporters:
      - logging

exporters:
  otlp/prod-jaeger:
    endpoint: prod-jaeger:4317
  otlp/prod-oneuptime:
    endpoint: oneuptime.com:443
    headers:
      "x-oneuptime-api-key": "${env:PROD_API_KEY}"
  otlp/staging-jaeger:
    endpoint: staging-jaeger:4317
  otlp/default:
    endpoint: default-backend:4317
  logging:
    loglevel: info

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [routing, batch]
      exporters:
      - otlp/prod-jaeger
      - otlp/prod-oneuptime
      - otlp/staging-jaeger
      - otlp/default
      - logging
```

The routing processor examines `service.namespace` attribute and routes to appropriate exporters based on the value.

## Implementing Multi-Tenant Routing

Route telemetry from different tenants to isolated backends:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  attributes/extract-tenant:
    actions:
    - key: tenant.id
      from_context: metadata.tenant-id
      action: insert

  routing/tenant:
    from_attribute: tenant.id
    table:
    - value: tenant-a
      exporters:
      - otlp/tenant-a
    - value: tenant-b
      exporters:
      - otlp/tenant-b
    - value: tenant-c
      exporters:
      - otlp/tenant-c

  resource/add-tenant:
    attributes:
    - key: tenant.id
      from_attribute: tenant.id
      action: upsert

  batch:
    timeout: 10s

exporters:
  otlp/tenant-a:
    endpoint: tenant-a-backend:4317
    headers:
      "x-tenant-id": "tenant-a"
  otlp/tenant-a:
    endpoint: tenant-b-backend:4317
    headers:
      "x-tenant-id": "tenant-b"
  otlp/tenant-c:
    endpoint: tenant-c-backend:4317
    headers:
      "x-tenant-id": "tenant-c"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
      - attributes/extract-tenant
      - routing/tenant
      - resource/add-tenant
      - batch
      exporters:
      - otlp/tenant-a
      - otlp/tenant-b
      - otlp/tenant-c
```

## Implementing Priority-Based Routing

Route high-priority telemetry to premium backends:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Classify traces by priority
  attributes/classify:
    actions:
    - key: priority
      value: high
      action: insert
      from_context: status.code
      pattern: "ERROR"
    - key: priority
      value: high
      action: insert
      from_context: attributes["http.status_code"]
      pattern: "^5[0-9]{2}$"
    - key: priority
      value: high
      action: insert
      from_context: attributes["duration_ms"]
      pattern: "^[5-9][0-9]{3,}$"  # > 5000ms
    - key: priority
      value: normal
      action: insert
      from_context: priority
      pattern: "^$"  # If not set

  routing/priority:
    from_attribute: priority
    table:
    - value: high
      exporters:
      - otlp/premium  # Low latency, high retention
      - otlp/alerting
    - value: normal
      exporters:
      - otlp/standard  # Standard latency, sampled

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
    # High priority path (no sampling)
    traces/high-priority:
      receivers: [otlp]
      processors:
      - attributes/classify
      - routing/priority
      - batch
      exporters:
      - otlp/premium
      - otlp/alerting

    # Normal priority path (sampled)
    traces/normal:
      receivers: [otlp]
      processors:
      - attributes/classify
      - routing/priority
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

  # Aggregated metrics from traces
  spanmetrics:
    metrics_exporter: prometheusremotewrite
    latency_histogram_buckets: [2ms, 8ms, 50ms, 100ms, 200ms, 500ms, 1s, 5s, 10s]
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
  otlp/oneuptime:
    endpoint: oneuptime.com:443
    headers:
      "x-oneuptime-api-key": "${env:ONEUPTIME_API_KEY}"

service:
  pipelines:
    # Full fidelity traces for real-time analysis
    traces/realtime:
      receivers: [otlp]
      processors: [batch/full]
      exporters: [otlp/jaeger, otlp/oneuptime]

    # Sampled traces for long-term storage
    traces/longterm:
      receivers: [otlp]
      processors: [tail_sampling/sampled, batch/sampled]
      exporters: [otlp/s3]

    # Generate metrics from traces
    traces/metrics:
      receivers: [otlp]
      processors: [spanmetrics]
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

processors:
  resource/detect-env:
    attributes:
    - key: deployment.environment
      from_attribute: k8s.namespace.name
      action: insert

  routing/environment:
    from_attribute: deployment.environment
    default_exporters:
    - logging
    table:
    - value: prod
      exporters:
      - otlp/prod-premium
    - value: prod-*
      exporters:
      - otlp/prod-standard
    - value: staging-*
      exporters:
      - otlp/staging
    - value: dev-*
      exporters:
      - otlp/dev

  filter/prod-only:
    traces:
      span:
      - 'resource.attributes["deployment.environment"] == "prod"'

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
  logging:
    loglevel: warn

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
      - resource/detect-env
      - routing/environment
      - batch
      exporters:
      - otlp/prod-premium
      - otlp/prod-standard
      - otlp/staging
      - otlp/dev
      - logging
```

## Implementing Cost-Optimized Routing

Route expensive telemetry differently to optimize costs:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Classify by data volume
  attributes/classify-volume:
    actions:
    - key: data.class
      value: high-volume
      action: insert
      from_context: attributes["http.target"]
      pattern: "^/(metrics|health|readiness)"
    - key: data.class
      value: business-critical
      action: insert
      from_context: attributes["service.name"]
      pattern: "^(payment|auth|checkout)"

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

  routing/cost:
    from_attribute: data.class
    table:
    - value: high-volume
      exporters:
      - otlp/cheap-storage
    - value: business-critical
      exporters:
      - otlp/premium-storage
    default_exporters:
    - otlp/standard-storage

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
    traces/high-volume:
      receivers: [otlp]
      processors:
      - attributes/classify-volume
      - tail_sampling/high-volume
      - routing/cost
      - batch
      exporters: [otlp/cheap-storage]

    traces/business:
      receivers: [otlp]
      processors:
      - attributes/classify-volume
      - tail_sampling/business
      - routing/cost
      - batch
      exporters: [otlp/premium-storage]

    traces/standard:
      receivers: [otlp]
      processors:
      - attributes/classify-volume
      - routing/cost
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
# otelcol_processor_accepted_spans{pipeline="traces/prod",processor="routing"}
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

OpenTelemetry Collector pipelines enable sophisticated telemetry routing patterns. By combining multiple pipelines, routing processors, and conditional logic, you can build cost-effective observability architectures that send the right data to the right place based on priority, tenant, environment, or any other criteria relevant to your organization.
