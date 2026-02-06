# How to Implement a Multi-Stage Pipeline: Agent Collector for Sampling, Gateway Collector for Enrichment and Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Multi-Stage Pipeline, Sampling, Enrichment, Gateway

Description: Implement a multi-stage OpenTelemetry pipeline where agents handle head sampling and gateways handle enrichment, tail sampling, and export.

Splitting responsibilities between agent and gateway collectors is not just about scale. It is about putting the right processing at the right layer. Head sampling at the agent reduces data volume before it hits the network. Enrichment and tail sampling at the gateway operate on aggregated data with full context. This post shows you how to build this multi-stage pipeline.

## What Goes Where

The rule of thumb is:

- **Agent (per-node)**: Things that reduce data volume early (head sampling, filtering, basic attribute dropping)
- **Gateway (centralized)**: Things that need aggregated context (tail sampling, Kubernetes enrichment, transformations, export)

```
Agent Layer:                    Gateway Layer:
[Head Sample] --> [Filter] --> [K8s Enrich] --> [Tail Sample] --> [Transform] --> [Export]
   (reduce)      (drop noise)   (add context)   (smart sample)   (shape data)   (send)
```

## Agent: Head Sampling and Filtering

The agent runs on every node and should aggressively reduce data volume:

```yaml
# agent-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 128
    spike_limit_mib: 32

  # Head sampling: keep 50% of traces randomly at the agent level
  # This reduces network traffic to the gateway by half
  probabilistic_sampler:
    sampling_percentage: 50
    hash_seed: 22

  # Filter out health check and readiness probe spans
  filter/drop_noise:
    traces:
      span:
        - 'attributes["http.target"] == "/healthz"'
        - 'attributes["http.target"] == "/readyz"'
        - 'attributes["http.target"] == "/livez"'
        - 'attributes["http.route"] == "/metrics"'

  # Remove high-cardinality attributes that bloat data
  attributes/strip:
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: http.request.header.cookie
        action: delete
      - key: db.statement
        action: hash  # Hash instead of delete for correlation

  batch:
    send_batch_size: 128
    timeout: 2s

exporters:
  loadbalancing:
    routing_key: "traceID"
    protocol:
      otlp:
        tls:
          insecure: true
        compression: zstd
    resolver:
      dns:
        hostname: "otel-gateway-headless.monitoring.svc.cluster.local"
        port: 4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - memory_limiter
        - filter/drop_noise     # First: drop noise
        - attributes/strip      # Second: strip sensitive/large attrs
        - probabilistic_sampler # Third: reduce volume
        - batch
      exporters: [loadbalancing]
```

## Gateway: Enrichment and Smart Sampling

The gateway receives pre-filtered traces from all agents and applies enrichment and tail sampling:

```yaml
# gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        max_recv_msg_size_mib: 16

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

  # Kubernetes enrichment - adds pod, namespace, deployment info
  k8sattributes:
    auth_type: "serviceAccount"
    extract:
      metadata:
        - k8s.pod.name
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.node.name
      labels:
        - tag_name: app.team
          key: team
          from: pod
        - tag_name: app.version
          key: version
          from: pod

  # Tail sampling sees complete traces thanks to load-balanced routing
  tail_sampling:
    decision_wait: 30s
    num_traces: 100000
    policies:
      # Always keep error traces
      - name: keep-errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Always keep slow traces (over 2 seconds)
      - name: keep-slow
        type: latency
        latency:
          threshold_ms: 2000

      # Keep traces from critical services
      - name: keep-critical
        type: string_attribute
        string_attribute:
          key: service.name
          values:
            - payment-service
            - auth-service
            - checkout-service

      # Sample 20% of remaining traces
      - name: probabilistic-rest
        type: probabilistic
        probabilistic:
          sampling_percentage: 20

  # Add derived attributes after enrichment
  transform/classify:
    trace_statements:
      - context: resource
        statements:
          - set(attributes["sla.tier"], "gold")
            where attributes["k8s.namespace.name"] == "production"
          - set(attributes["sla.tier"], "silver")
            where attributes["k8s.namespace.name"] == "staging"

  batch:
    send_batch_size: 2048
    timeout: 10s

exporters:
  otlp:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
    sending_queue:
      enabled: true
      num_consumers: 20
      queue_size: 50000

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - memory_limiter
        - k8sattributes      # Enrich with K8s metadata
        - tail_sampling       # Smart sampling on complete traces
        - transform/classify  # Add business attributes
        - batch
      exporters: [otlp]
```

## The Sampling Math

With this multi-stage pipeline, the effective sampling rate is the product of both stages:

```
Agent: 50% head sampling (randomly drops half)
Gateway: tail sampling keeps:
  - 100% of errors
  - 100% of slow traces (>2s)
  - 100% of critical services
  - 20% of everything else

Effective rate for normal, fast, non-critical traces:
50% * 20% = 10% of original volume

Effective rate for error traces:
50% * 100% = 50% of original volume
```

The head sampling at the agent is the only lossy stage for error traces. If you need 100% of errors, skip head sampling at the agent and rely solely on tail sampling at the gateway. The trade-off is more network traffic between agent and gateway.

## Metrics Pipeline (Agent and Gateway)

For metrics, the agent does delta-to-cumulative conversion and the gateway handles aggregation:

```yaml
# agent metrics pipeline
processors:
  cumulativetodelta:
    include:
      match_type: regexp
      metrics:
        - ".*"

# gateway metrics pipeline
processors:
  metricstransform:
    transforms:
      - include: ".*"
        match_type: regexp
        action: update
        operations:
          - action: aggregate_labels
            label_set: [service.name, http.method, http.status_code]
            aggregation_type: sum
```

## Wrapping Up

The multi-stage pipeline pattern gives you the best of both worlds: agents reduce volume cheaply at the source, and gateways apply smart processing with full context. The key decisions are what percentage to head-sample at agents and what tail-sampling policies to apply at gateways. Start with generous head sampling (keep more) and tune down as you understand your data patterns.
