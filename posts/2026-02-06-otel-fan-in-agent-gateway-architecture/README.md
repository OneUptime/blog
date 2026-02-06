# How to Build a Fan-In Architecture That Aggregates Telemetry from Hundreds of Agent Collectors into Gateway Collectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Fan-In, Gateway Collector, Agent, Architecture

Description: Build a fan-in architecture where hundreds of lightweight agent collectors aggregate telemetry into a fleet of gateway collectors for export.

As your infrastructure grows, running a single monolithic collector becomes a bottleneck. The fan-in pattern solves this: deploy lightweight agent collectors on every node that do minimal processing and forward data to a smaller set of gateway collectors that handle enrichment, batching, and export. This two-tier architecture scales to thousands of nodes.

## The Two-Tier Architecture

```
[Node 1: Agent] --\
[Node 2: Agent] ---+--> [Gateway 1] --\
[Node 3: Agent] --/                    +--> [Backend]
                                      /
[Node 4: Agent] --\                  /
[Node 5: Agent] ---+--> [Gateway 2] -
[Node 6: Agent] --/
```

Agent collectors are deployed as DaemonSets (one per node). Gateway collectors are deployed as Deployments (3-5 replicas behind a load balancer).

## Agent Collector Configuration

The agent collector should be as lightweight as possible. Its job is to receive telemetry from local pods, add the node's resource attributes, and forward to the gateway:

```yaml
# agent-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

  # Collect host metrics from the node
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
      memory:
      disk:
      network:

processors:
  # Tight memory limits since this runs on every node
  memory_limiter:
    check_interval: 1s
    limit_mib: 128
    spike_limit_mib: 32

  # Small batches, frequent flushes
  batch:
    send_batch_size: 128
    timeout: 2s

  # Add node-level resource attributes
  resourcedetection:
    detectors: [env, system]
    system:
      hostname_sources: ["os"]

exporters:
  # Send to the gateway collector service
  otlp/gateway:
    endpoint: "otel-gateway.monitoring.svc.cluster.local:4317"
    tls:
      insecure: true
    # Compression reduces network usage between agent and gateway
    compression: zstd
    sending_queue:
      enabled: true
      queue_size: 500
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 10s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otlp/gateway]

    metrics:
      receivers: [otlp, hostmetrics]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otlp/gateway]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otlp/gateway]
```

## Gateway Collector Configuration

The gateway is where the heavy processing happens: Kubernetes metadata enrichment, sampling, transformations, and export to the backend:

```yaml
# gateway-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        # Larger receive buffer for handling many agents
        max_recv_msg_size_mib: 16

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

  # Kubernetes enrichment happens at the gateway level
  k8sattributes:
    auth_type: "serviceAccount"
    extract:
      metadata:
        - k8s.pod.name
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.node.name

  # Tail sampling at the gateway sees complete traces
  tail_sampling:
    decision_wait: 30s
    policies:
      - name: error-policy
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: latency-policy
        type: latency
        latency:
          threshold_ms: 1000
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

  # Large batches for efficient export
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
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 60s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, tail_sampling, batch]
      exporters: [otlp]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlp]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlp]
```

## Kubernetes Deployment Manifests

Deploy the agent as a DaemonSet:

```yaml
# agent-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: otel-agent
  template:
    metadata:
      labels:
        app: otel-agent
    spec:
      containers:
        - name: otel-agent
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config=/etc/otel/config.yaml"]
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-agent-config
```

Deploy the gateway as a Deployment with a Service:

```yaml
# gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-gateway
  namespace: monitoring
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-gateway
  template:
    metadata:
      labels:
        app: otel-gateway
    spec:
      containers:
        - name: otel-gateway
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config=/etc/otel/config.yaml"]
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "2"
              memory: 4Gi
---
apiVersion: v1
kind: Service
metadata:
  name: otel-gateway
  namespace: monitoring
spec:
  selector:
    app: otel-gateway
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
```

## Sizing Guidelines

- **Agents**: 128-256 MB RAM, 0.1-0.5 CPU per node
- **Gateways**: 2-4 GB RAM, 1-2 CPU per replica
- **Gateway replicas**: Start with 3, add more when CPU utilization exceeds 60%
- **Ratio**: Roughly 1 gateway replica per 50-100 agent nodes

The fan-in architecture is the standard pattern for scaling OpenTelemetry collection in Kubernetes. It keeps agents lightweight, centralizes expensive processing at the gateway, and scales each tier independently.
