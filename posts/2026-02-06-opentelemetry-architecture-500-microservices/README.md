# How to Design an OpenTelemetry Architecture for 500+ Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Architecture, Microservice, Scalability, Collector, Observability

Description: Learn how to design a scalable OpenTelemetry architecture that handles telemetry from 500 or more microservices without bottlenecks or data loss.

---

When you have a handful of microservices, any reasonable OpenTelemetry setup works. You spin up a collector, point your services at it, and you are done. But when you cross the threshold of hundreds of microservices generating thousands of spans per second, the architecture decisions you made early on start to show their limits. Collectors become bottlenecks. Sampling decisions get complicated. Configuration management becomes a full-time job. Network bandwidth for telemetry traffic becomes a real cost.

This post covers the architectural patterns that work at scale for organizations running 500 or more microservices. These are not theoretical designs. They are patterns that have been proven in production at companies dealing with massive telemetry volumes.

## The Scale Challenge

Let us put some numbers on the problem. Assume 500 microservices, each producing an average of 100 spans per second. That is 50,000 spans per second across the system. At an average span size of 1KB, you are looking at 50MB/s of raw trace data, or about 4.3TB per day. And that is just traces. Add metrics and logs, and you are easily dealing with 10TB+ per day of telemetry data.

At this scale, you need:
- Multiple collector tiers to handle the load
- Intelligent sampling to reduce data volume
- Configuration management that does not require touching 500 services
- Fault tolerance so that collector failures do not cause data loss
- Cost management to keep observability affordable

## Multi-Tier Collector Architecture

The foundation of a scalable architecture is a multi-tier collector deployment:

```mermaid
graph TD
    subgraph "Tier 1 - Agents"
        A1[Agent Collector] --- S1[Service 1..50]
        A2[Agent Collector] --- S2[Service 51..100]
        A3[Agent Collector] --- S3[Service 101..150]
        AN[Agent Collector x N] --- SN[Service N..500+]
    end

    subgraph "Tier 2 - Gateways"
        G1[Gateway Collector 1]
        G2[Gateway Collector 2]
        G3[Gateway Collector 3]
    end

    subgraph "Tier 3 - Backends"
        B1[Trace Backend]
        B2[Metrics Backend]
        B3[Log Backend]
    end

    A1 --> G1
    A2 --> G2
    A3 --> G1
    AN --> G3
    G1 --> B1
    G1 --> B2
    G2 --> B1
    G2 --> B2
    G3 --> B1
    G3 --> B3
```

**Tier 1: Agent collectors** run as DaemonSets on every Kubernetes node. Each agent handles telemetry from all pods on its node. They do minimal processing: receive, batch, and forward. This tier absorbs the burst traffic from applications and provides a stable local endpoint.

**Tier 2: Gateway collectors** are the workhorses. They handle sampling decisions, attribute enrichment, filtering, and routing. Run them as a horizontally-scalable Deployment behind a Kubernetes Service. This is where your processing logic lives.

**Tier 3: Backends** receive the processed and sampled data. These are your tracing, metrics, and logging platforms.

## Agent Collector Configuration

Agent collectors should be lightweight and fast:

```yaml
# agent-collector-config.yaml

# Minimal configuration for DaemonSet agent collectors.
# These run on every node and handle local telemetry collection.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Memory limiter prevents OOM kills on busy nodes
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  # Batch for efficient network usage to the gateway tier
  batch:
    timeout: 2s
    send_batch_size: 512

  # Add node-level metadata to all telemetry
  resource:
    attributes:
      - key: k8s.node.name
        action: insert
        value: "${env:K8S_NODE_NAME}"

exporters:
  # Use the load-balancing exporter for traces so each trace stays on one gateway
  load_balancing/traces:
    routing_key: traceID
    protocol:
      otlp:
        timeout: 5s
        tls:
          insecure: true
    resolver:
      dns:
        hostname: otel-gateway-headless.observability.svc
        port: 4317
  # Metrics and logs can use the normal Kubernetes Service load balancer
  otlp/metrics:
    endpoint: otel-gateway.observability.svc:4317
    tls:
      insecure: true
  otlp/logs:
    endpoint: otel-gateway.observability.svc:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [load_balancing/traces]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp/metrics]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp/logs]
```

The load-balancing exporter is crucial for traces. It distributes trace traffic across gateway instances, and it routes spans with the same trace ID to the same gateway. This is important for tail-based sampling, which needs to see all spans of a trace in one place.

## Gateway Collector Configuration

Gateway collectors handle the complex processing:

```yaml
# gateway-collector-config.yaml
# Gateway collectors perform sampling, enrichment, and routing.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 4096
    spike_limit_mib: 1024

  # Tail-based sampling makes decisions after seeing the complete trace
  tail_sampling:
    decision_wait: 30s
    num_traces: 100000
    policies:
      # Always keep traces with errors
      - name: errors
        type: status_code
        status_code:
          status_codes:
            - ERROR
      # Always keep slow traces
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 2000
      # Sample 5% of normal traces
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 5

  # Enrich spans with Kubernetes metadata
  k8sattributes:
    auth_type: "serviceAccount"
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.pod.name
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip

  batch:
    timeout: 5s
    send_batch_size: 1024
    send_batch_max_size: 2048

exporters:
  otlphttp/traces:
    endpoint: https://oneuptime.com/otlp
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s

  otlphttp/metrics:
    endpoint: https://oneuptime.com/otlp

  otlphttp/logs:
    endpoint: https://oneuptime.com/otlp

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, tail_sampling, batch]
      exporters: [otlphttp/traces]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlphttp/metrics]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [otlphttp/logs]
```

## Kubernetes Deployment

Deploy the agent collectors as a DaemonSet so every node gets one:

```yaml
# DaemonSet for agent collectors - one per node
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-agent
  namespace: observability
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
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.153.0
          args:
            - "--config=/etc/otelcol-contrib/config.yaml"
          ports:
            - name: otlp-grpc
              containerPort: 4317
              hostPort: 4317
            - name: otlp-http
              containerPort: 4318
              hostPort: 4318
            - name: metrics
              containerPort: 8888
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          env:
            - name: K8S_NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          volumeMounts:
            - name: otel-agent-config
              mountPath: /etc/otelcol-contrib
      # Use hostNetwork for performance on high-traffic nodes
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      serviceAccountName: otel-agent
      volumes:
        - name: otel-agent-config
          configMap:
            name: otel-agent-config
```

Deploy gateway collectors as a scalable Deployment:

```yaml
# Deployment for gateway collectors with HPA
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-gateway
  namespace: observability
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
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.153.0
          args:
            - "--config=/etc/otelcol-contrib/config.yaml"
          ports:
            - name: otlp-grpc
              containerPort: 4317
            - name: metrics
              containerPort: 8888
          resources:
            requests:
              cpu: "1"
              memory: 4Gi
            limits:
              cpu: "2"
              memory: 8Gi
          volumeMounts:
            - name: otel-gateway-config
              mountPath: /etc/otelcol-contrib
      volumes:
        - name: otel-gateway-config
          configMap:
            name: otel-gateway-config
---
# Regular Service for metrics/logs and Prometheus scraping
apiVersion: v1
kind: Service
metadata:
  name: otel-gateway
  namespace: observability
  labels:
    app: otel-gateway
spec:
  selector:
    app: otel-gateway
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: otlp-grpc
    - name: metrics
      port: 8888
      targetPort: metrics
---
# Headless Service so the load-balancing exporter can resolve gateway pod IPs
apiVersion: v1
kind: Service
metadata:
  name: otel-gateway-headless
  namespace: observability
  labels:
    app: otel-gateway-headless
spec:
  clusterIP: None
  selector:
    app: otel-gateway
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: otlp-grpc
---
# HPA scales gateway collectors based on CPU usage
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: otel-gateway
  namespace: observability
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: otel-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Service Configuration Strategy

With 500+ services, you cannot configure each one individually. Use environment variable injection through Kubernetes:

```yaml
# Example environment variables injected by a MutatingWebhookConfiguration.
# HOST_IP routes each pod to the agent collector running on the same node.
env:
  - name: HOST_IP
    valueFrom:
      fieldRef:
        fieldPath: status.hostIP
  - name: POD_IP
    valueFrom:
      fieldRef:
        fieldPath: status.podIP
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "http://$(HOST_IP):4318"
  - name: OTEL_EXPORTER_OTLP_PROTOCOL
    value: "http/protobuf"
  - name: OTEL_TRACES_SAMPLER
    value: "parentbased_always_on"
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: "deployment.environment=production,k8s.pod.ip=$(POD_IP)"
```

Use the OpenTelemetry Operator to handle auto-instrumentation for services that support it. This reduces the number of services that need code changes to zero for languages with supported auto-instrumentation, such as Java and Python.

## Monitoring the Observability Infrastructure

At this scale, you need to monitor your monitoring. The collectors expose Prometheus metrics about their own health:

```yaml
# Prometheus ServiceMonitor for collector self-monitoring
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: otel-gateway
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-gateway
  endpoints:
    - port: metrics
      interval: 15s
```

Key metrics to watch:
- `otelcol_exporter_sent_spans_total`: spans successfully exported
- `otelcol_exporter_send_failed_spans_total`: export failures
- `otelcol_processor_dropped_spans_total`: spans dropped by processors
- `otelcol_receiver_accepted_spans_total`: spans received from applications

## Conclusion

Designing an OpenTelemetry architecture for 500+ microservices requires thinking about telemetry as a distributed system in its own right. The multi-tier collector approach with agents and gateways provides the scalability, fault tolerance, and processing flexibility you need. Tail-based sampling at the gateway tier keeps costs manageable while preserving interesting traces. And centralized configuration through Kubernetes primitives and the OpenTelemetry Operator keeps the management overhead reasonable even as you add more services. The architecture should scale horizontally at every tier, so you are never limited by a single component.
