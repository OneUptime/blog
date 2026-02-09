# How to Configure the Load Balancing Exporter for Consistent Hashing Across Multiple Collector Gateways

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Load Balancing, Consistent Hashing, Collector, Gateway

Description: Configure the OpenTelemetry load balancing exporter to distribute traces across multiple gateway collectors using consistent hashing on trace IDs.

When you have multiple gateway collectors, you need all spans from the same trace to land on the same gateway. This is critical for tail sampling, which needs to see the complete trace before making a sampling decision. The load balancing exporter solves this by using consistent hashing on the trace ID.

## Why Not Round-Robin?

Standard Kubernetes services use round-robin load balancing. This means spans from the same trace get scattered across different gateway replicas. If gateway 1 gets the root span and gateway 2 gets the error span, neither has the full picture. Tail sampling on gateway 1 might drop the trace because it never saw the error. The load balancing exporter fixes this by always sending spans with the same trace ID to the same gateway.

## How Consistent Hashing Works

The exporter hashes the trace ID and maps it to one of the available backends. As long as the set of backends stays the same, the same trace ID always maps to the same backend. When a backend is added or removed, only a fraction of traces get remapped, minimizing disruption.

## Agent Collector with Load Balancing Exporter

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

  batch:
    send_batch_size: 128
    timeout: 2s

exporters:
  loadbalancing:
    # Route based on trace ID for trace-aware load balancing
    routing_key: "traceID"
    protocol:
      otlp:
        tls:
          insecure: true
        compression: zstd
    resolver:
      # DNS resolver discovers gateway endpoints
      dns:
        hostname: "otel-gateway-headless.monitoring.svc.cluster.local"
        port: 4317
        # How often to re-resolve DNS for new/removed gateways
        interval: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loadbalancing]
```

## The Headless Service

The load balancing exporter needs a headless Kubernetes Service to discover individual gateway pod IPs (not the cluster IP):

```yaml
# gateway-headless-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: otel-gateway-headless
  namespace: monitoring
spec:
  clusterIP: None  # This makes it headless
  selector:
    app: otel-gateway
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
```

When the agent resolves `otel-gateway-headless.monitoring.svc.cluster.local`, it gets back the individual pod IPs instead of a single virtual IP. The load balancing exporter then distributes traces across these pods using the consistent hash ring.

## Using Static Resolver for Non-Kubernetes Environments

If you are not using Kubernetes, you can list backends statically:

```yaml
exporters:
  loadbalancing:
    routing_key: "traceID"
    protocol:
      otlp:
        tls:
          insecure: false
    resolver:
      static:
        hostnames:
          - "gateway-1.internal:4317"
          - "gateway-2.internal:4317"
          - "gateway-3.internal:4317"
```

## Using the Kubernetes Resolver

For more dynamic discovery, the Kubernetes resolver watches the Kubernetes API directly:

```yaml
exporters:
  loadbalancing:
    routing_key: "traceID"
    protocol:
      otlp:
        tls:
          insecure: true
    resolver:
      k8s:
        service: "otel-gateway-headless"
        ports:
          - 4317
```

This is more responsive than DNS because it watches the API for changes rather than polling DNS at an interval.

## Load Balancing Metrics

The load balancing exporter also routes by `service` for metrics:

```yaml
exporters:
  loadbalancing/traces:
    routing_key: "traceID"
    protocol:
      otlp:
        tls:
          insecure: true
    resolver:
      dns:
        hostname: "otel-gateway-headless.monitoring.svc.cluster.local"
        port: 4317

  loadbalancing/metrics:
    routing_key: "service"
    protocol:
      otlp:
        tls:
          insecure: true
    resolver:
      dns:
        hostname: "otel-gateway-headless.monitoring.svc.cluster.local"
        port: 4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loadbalancing/traces]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loadbalancing/metrics]
```

## Monitoring the Load Balancer

Check that the distribution is even:

```bash
# Query the agent's metrics endpoint
curl -s http://localhost:8888/metrics | grep loadbalancing

# Key metrics:
# otelcol_loadbalancer_num_backends - number of discovered backends
# otelcol_loadbalancer_num_backend_updates - backend list changes
# otelcol_loadbalancer_backend_latency - per-backend latency
```

If you see a big skew in `otelcol_exporter_sent_spans` across gateways, it might mean your trace IDs are not well-distributed. This is rare with standard trace ID generators but can happen with custom ID schemes.

## Gateway Configuration

The gateway configuration stays the same as a normal gateway. The key point is that tail sampling now works correctly because all spans for a given trace arrive at the same gateway:

```yaml
# gateway-config.yaml
processors:
  tail_sampling:
    decision_wait: 30s
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow
        type: latency
        latency:
          threshold_ms: 2000
      - name: default
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

## Wrapping Up

The load balancing exporter is essential for any multi-gateway deployment that uses tail sampling. Without it, traces get fragmented across gateways and sampling decisions are made on incomplete data. With consistent hashing on trace IDs, every span from the same trace lands on the same gateway, giving tail sampling the full picture it needs to make correct decisions.
