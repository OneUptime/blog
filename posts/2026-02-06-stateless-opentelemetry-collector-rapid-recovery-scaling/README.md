# How to Design Stateless OpenTelemetry Collector Architectures for Rapid Recovery and Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Stateless Architecture, Scaling, Collector Design

Description: Design OpenTelemetry Collector deployments that are stateless by default, enabling instant horizontal scaling and near-zero recovery times after failures.

Stateful collectors are hard to recover. When a collector pod dies and takes its in-memory queue with it, that telemetry data is gone. When you need to scale from 3 collectors to 10 to handle a traffic spike, stateful deployments make that painful because new instances need time to warm up or synchronize state.

A stateless collector architecture sidesteps these problems entirely. Every collector instance is identical, holds no critical state locally, and can be replaced instantly by any other instance.

## What Makes a Collector Stateful

Before designing for statelessness, you need to understand what creates state in a collector:

- **In-memory queues** - data sitting in the sending queue waiting to be exported
- **Tail-based sampling decisions** - trace IDs that have been seen but not yet decided on
- **Aggregation buffers** - metrics being aggregated across time windows
- **Persistent queue storage** - data written to local disk for durability

Each of these creates a dependency on the specific collector instance. Lose that instance, lose that state.

## The Stateless Collector Pattern

The core idea is to push all state to external systems and treat each collector as a pure data transformation pipeline.

Here is a minimal stateless collector configuration:

```yaml
# stateless-collector.yaml
# This collector holds no local state. Queues are kept small because
# the upstream load balancer will redistribute traffic to healthy instances
# if this one fails. Processors are limited to stateless operations.

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  # Batch processor is stateless in practice - it just buffers briefly
  batch:
    timeout: 5s
    send_batch_size: 1024
    send_batch_max_size: 2048

  # Resource detection adds metadata but holds no state
  resourcedetection:
    detectors: [env, system, docker, ec2, gcp, azure]
    timeout: 5s

  # Memory limiter prevents OOM but does not create persistent state
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  otlp:
    endpoint: "backend.example.com:4317"
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 10s
      max_elapsed_time: 30s    # give up quickly, let the LB retry elsewhere
    sending_queue:
      enabled: true
      num_consumers: 5
      queue_size: 500          # keep it small - favor fast failure over buffering

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otlp]
```

Notice the short `max_elapsed_time` on the exporter. Instead of buffering for minutes, this collector gives up after 30 seconds. The assumption is that a load balancer in front of the collector fleet will redirect the client to a healthy instance on the next attempt.

## Handling Tail-Based Sampling Without State

Tail-based sampling is the biggest challenge for stateless architectures. It requires seeing all spans for a trace before making a sampling decision, which means trace affinity - all spans from a single trace must go to the same collector.

The solution is a two-tier architecture:

```yaml
# tier1-load-balancer.yaml
# Tier 1 collectors receive all spans and route them to Tier 2 collectors
# based on trace ID. This ensures trace affinity without requiring
# individual collectors to maintain global state.

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

exporters:
  loadbalancing:
    protocol:
      otlp:
        endpoint: "tier2-collector-headless.monitoring:4317"
    resolver:
      dns:
        hostname: "tier2-collector-headless.monitoring"
        port: 4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [loadbalancing]
```

```yaml
# tier2-sampler.yaml
# Tier 2 collectors perform tail-based sampling. Because Tier 1 routes
# by trace ID, each Tier 2 instance sees complete traces and can make
# correct sampling decisions independently.

processors:
  tail_sampling:
    decision_wait: 30s
    policies:
      - name: errors-always
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: sample-rest
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [otlp]
```

Tier 1 collectors are fully stateless. They just hash the trace ID and route. Tier 2 collectors hold short-lived state (the 30-second sampling window), but since trace affinity is guaranteed by Tier 1, losing a Tier 2 instance only loses the traces currently in its sampling window.

## Kubernetes Deployment for Rapid Scaling

Stateless collectors are perfect for Horizontal Pod Autoscaling because adding or removing instances requires no state migration:

```yaml
# collector-hpa.yaml
# Scale the collector fleet based on CPU utilization.
# Because collectors are stateless, new pods immediately start
# processing traffic with zero warm-up time.

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: otel-collector
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30    # scale up quickly
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300   # scale down slowly to avoid flapping
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

The asymmetric scaling behavior is intentional. Scale up fast because traffic spikes are urgent. Scale down slowly because premature scale-down during a fluctuating load pattern causes unnecessary churn.

## Recovery Characteristics

With a stateless design, recovery looks like this:

- **Pod failure**: Kubernetes restarts the pod. New pod starts processing immediately. Recovery time equals pod startup time (typically 2-5 seconds for the collector).
- **Node failure**: All pods on the node are rescheduled. Other nodes absorb traffic during rescheduling. Recovery time equals scheduling plus startup (typically 10-30 seconds).
- **Full cluster failure**: New cluster deploys the same stateless config. Recovery time equals cluster provisioning time.

Compare this to stateful collectors where recovery involves restoring persistent volumes, replaying queued data, and rebuilding aggregation windows. The difference is dramatic.

## When Stateless is Not Enough

There are cases where you genuinely need persistent queues: if your backend has extended outages and you cannot afford to lose any data during the outage window. In those cases, use a hybrid approach - stateless collector tier for ingestion and routing, with a small stateful tier at the edge closest to the backend that handles persistent queuing. This keeps most of your pipeline stateless while limiting the blast radius of state-related failures to a single, well-understood component.

The key principle is simple: minimize the state each collector holds, and you minimize the cost of losing any individual collector.
