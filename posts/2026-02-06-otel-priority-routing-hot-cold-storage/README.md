# How to Implement Priority-Based Routing: Send Critical Service Traces to Fast Storage, Non-Critical to Cold Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Priority Routing, Hot Storage, Cold Storage, Cost Optimization

Description: Implement priority-based routing in the OpenTelemetry Collector to send critical traces to fast storage and non-critical traces to cold storage.

Storing every trace in fast, expensive storage is wasteful. Your payment service traces need to be queryable in milliseconds, but your internal cron job traces can sit in cold storage where queries take a few seconds. Priority-based routing lets you send telemetry to different storage tiers based on the service criticality, reducing costs while keeping critical data instantly accessible.

## The Storage Tier Architecture

```
                              +--> [Hot Storage: SSD-backed, 7-day retention]
[Collector] --> [Routing] ----|
                              +--> [Cold Storage: Object storage, 90-day retention]
```

Hot storage is expensive but fast. Cold storage is cheap but slow. The routing decision is made at the collector level based on service attributes.

## Defining Service Priorities

Start by classifying your services. You can do this with a resource attribute, a Kubernetes label, or inline in the collector config:

```yaml
# Service priority classification
# Tier 1 (Hot): Revenue-impacting, customer-facing
#   - payment-service, checkout-service, auth-service
# Tier 2 (Cold): Internal, batch, background
#   - cron-runner, report-generator, cleanup-worker, migration-job
# Tier 3 (Drop): Extremely noisy, low value
#   - synthetic-monitor, load-test-runner
```

## Collector Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  routing/priority:
    table:
      # Tier 1: Critical services go to hot storage
      - statement: >
          route() where resource.attributes["service.name"] == "payment-service"
          or resource.attributes["service.name"] == "checkout-service"
          or resource.attributes["service.name"] == "auth-service"
          or resource.attributes["service.name"] == "api-gateway"
          or resource.attributes["service.name"] == "order-service"
        pipelines: [traces/hot]

      # Tier 3: Drop noisy, low-value services entirely
      - statement: >
          route() where resource.attributes["service.name"] == "synthetic-monitor"
          or resource.attributes["service.name"] == "load-test-runner"
        pipelines: [traces/drop]

    # Everything else (Tier 2) goes to cold storage
    default_pipelines: [traces/cold]

processors:
  batch/hot:
    send_batch_size: 256
    timeout: 2s

  batch/cold:
    send_batch_size: 2048
    timeout: 30s

  # Sample cold storage more aggressively
  probabilistic_sampler/cold:
    sampling_percentage: 25
    hash_seed: 42

exporters:
  # Hot storage: fast backend with short retention
  otlp/hot:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
      x-storage-tier: "hot"
    sending_queue:
      enabled: true
      queue_size: 10000

  # Cold storage: cheap backend with long retention
  otlp/cold:
    endpoint: "cold-storage.internal:4317"
    tls:
      insecure: true
    compression: zstd
    sending_queue:
      enabled: true
      queue_size: 20000

  # Drop pipeline: use the debug exporter in dev, nop in prod
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [routing/priority]

    traces/hot:
      receivers: [routing/priority]
      processors: [batch/hot]
      exporters: [otlp/hot]

    traces/cold:
      receivers: [routing/priority]
      processors: [probabilistic_sampler/cold, batch/cold]
      exporters: [otlp/cold]

    traces/drop:
      receivers: [routing/priority]
      processors: []
      exporters: [debug]
```

## Using Labels Instead of Hardcoded Service Names

Hardcoding service names is fragile. A better approach is to use a priority label that services set themselves or that gets added via Kubernetes labels:

```yaml
connectors:
  routing/priority:
    table:
      - statement: >
          route() where resource.attributes["service.priority"] == "critical"
        pipelines: [traces/hot]
      - statement: >
          route() where resource.attributes["service.priority"] == "low"
        pipelines: [traces/cold]
      - statement: >
          route() where resource.attributes["service.priority"] == "none"
        pipelines: [traces/drop]
    default_pipelines: [traces/cold]
```

Then in your Kubernetes pod specs:

```yaml
# deployment.yaml for payment-service
spec:
  template:
    metadata:
      labels:
        service-priority: critical
```

And in the k8sattributes processor:

```yaml
processors:
  k8sattributes:
    extract:
      labels:
        - tag_name: service.priority
          key: service-priority
          from: pod
```

## Error Override: Send All Errors to Hot Storage

Even non-critical services should have their errors in hot storage for debugging:

```yaml
connectors:
  routing/priority:
    table:
      # Rule 1: All errors go to hot storage regardless of service
      - statement: >
          route() where attributes["otel.status_code"] == "ERROR"
        pipelines: [traces/hot]

      # Rule 2: Critical services go to hot storage
      - statement: >
          route() where resource.attributes["service.priority"] == "critical"
        pipelines: [traces/hot]

    default_pipelines: [traces/cold]
```

Since routing rules are evaluated top to bottom, the error rule catches all errors first. Critical service traces that are not errors get caught by the second rule. Everything else falls through to cold storage.

## Cost Impact

Here is a rough example of the cost savings:

```
Before: 100% of traces to hot storage
  - 10TB/day * $0.50/GB = $5,000/day

After: Priority routing
  - Tier 1 (30% of traces) to hot storage: 3TB * $0.50/GB = $1,500/day
  - Tier 2 (60% of traces, 25% sampled) to cold: 1.5TB * $0.05/GB = $75/day
  - Tier 3 (10% of traces) dropped: $0/day
  - Total: $1,575/day (68% savings)
```

## Wrapping Up

Priority-based routing is one of the highest-impact cost optimizations you can do with the OpenTelemetry Collector. It ensures critical data is always fast to query while non-critical data goes to cheaper storage. The key is choosing the right classification strategy and making sure errors always get the fast treatment, regardless of which service produced them.
