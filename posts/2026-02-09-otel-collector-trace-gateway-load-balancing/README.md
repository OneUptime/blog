# How to Deploy the OpenTelemetry Collector as a Trace Gateway with Load Balancing in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenTelemetry, Distributed Tracing, Load Balancing, Observability

Description: Learn how to deploy the OpenTelemetry Collector as a centralized trace gateway with load balancing in Kubernetes to handle high-volume trace ingestion and route traces to multiple backends efficiently.

---

As trace volumes grow in Kubernetes environments, individual applications sending traces directly to backends creates scalability bottlenecks and operational complexity. Deploying the OpenTelemetry Collector as a centralized trace gateway solves these problems by providing a single ingestion point with built-in load balancing, buffering, and routing capabilities.

A trace gateway architecture separates concerns between application instrumentation and trace delivery. Applications send traces to local collectors or directly to the gateway using OTLP. The gateway handles batching, sampling, enrichment, and distribution to multiple backends, enabling horizontal scaling and operational flexibility.

## Understanding Trace Gateway Architecture

The trace gateway pattern uses two collector tiers. Applications send traces to agent collectors running as DaemonSets on each node or directly to gateway collectors. Gateway collectors run as Deployments with multiple replicas, providing high availability and load distribution. The gateway layer performs expensive operations like tail-based sampling and exports to backends.

This architecture provides several benefits. Gateway collectors can scale independently of applications. Buffering in the gateway protects backends from traffic spikes. Centralized configuration simplifies operations. Load balancing distributes traces evenly across gateway replicas and backend endpoints.

## Deploying Agent Collectors as DaemonSets

Start with agent collectors on each Kubernetes node:

```yaml
# otel-agent-daemonset.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-agent-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 200ms
        send_batch_size: 1000

      # Add k8s metadata
      k8sattributes:
        auth_type: "serviceAccount"
        passthrough: false
        extract:
          metadata:
            - k8s.namespace.name
            - k8s.pod.name
            - k8s.pod.uid
            - k8s.node.name

      memory_limiter:
        check_interval: 1s
        limit_mib: 512

    exporters:
      # Load balance across gateway collectors
      loadbalancing:
        routing_key: "traceID"
        protocol:
          otlp:
            tls:
              insecure: true
        resolver:
          dns:
            hostname: otel-gateway.observability.svc.cluster.local
            port: 4317

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [loadbalancing]
---
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
      serviceAccountName: otel-agent
      containers:
      - name: otel-agent
        image: otel/opentelemetry-collector-contrib:0.92.0
        args:
          - "--config=/conf/config.yaml"
        ports:
        - containerPort: 4317  # OTLP gRPC
        - containerPort: 4318  # OTLP HTTP
        - containerPort: 8888  # Metrics
        volumeMounts:
        - name: config
          mountPath: /conf
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: config
        configMap:
          name: otel-agent-config
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-agent
  namespace: observability
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-agent
rules:
- apiGroups: [""]
  resources:
  - pods
  - nodes
  - namespaces
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-agent
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-agent
subjects:
- kind: ServiceAccount
  name: otel-agent
  namespace: observability
```

## Deploying Gateway Collectors with Load Balancing

Deploy gateway collectors as a Deployment with multiple replicas:

```yaml
# otel-gateway-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-gateway-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 10s
        send_batch_size: 2000

      # Tail-based sampling for expensive operations
      tail_sampling:
        decision_wait: 10s
        num_traces: 100000
        expected_new_traces_per_sec: 1000
        policies:
          - name: errors
            type: status_code
            status_code:
              status_codes: [ERROR]
          - name: slow
            type: latency
            latency:
              threshold_ms: 1000
          - name: probabilistic
            type: probabilistic
            probabilistic:
              sampling_percentage: 10

      # Resource attribute enrichment
      resource:
        attributes:
          - key: cluster.name
            value: production-us-east-1
            action: upsert

      memory_limiter:
        check_interval: 1s
        limit_mib: 2048

    exporters:
      # Export to Tempo with load balancing
      loadbalancing/tempo:
        routing_key: "traceID"
        protocol:
          otlp:
            endpoint: tempo-distributor.observability.svc.cluster.local:4317
            tls:
              insecure: true
            sending_queue:
              num_consumers: 10
              queue_size: 5000
            retry_on_failure:
              enabled: true
              initial_interval: 5s
              max_interval: 30s
              max_elapsed_time: 300s
        resolver:
          static:
            hostnames:
              - tempo-distributor-0.tempo-distributor.observability.svc.cluster.local:4317
              - tempo-distributor-1.tempo-distributor.observability.svc.cluster.local:4317
              - tempo-distributor-2.tempo-distributor.observability.svc.cluster.local:4317

      # Export to Jaeger with load balancing
      loadbalancing/jaeger:
        routing_key: "traceID"
        protocol:
          otlp:
            endpoint: jaeger-collector.observability.svc.cluster.local:4317
            tls:
              insecure: true
        resolver:
          dns:
            hostname: jaeger-collector.observability.svc.cluster.local
            port: 4317

      # Metrics for monitoring
      prometheus:
        endpoint: "0.0.0.0:8889"

    service:
      telemetry:
        metrics:
          address: ":8888"

      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, tail_sampling, resource, batch]
          exporters: [loadbalancing/tempo, loadbalancing/jaeger]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-gateway
  namespace: observability
spec:
  replicas: 5
  selector:
    matchLabels:
      app: otel-gateway
  template:
    metadata:
      labels:
        app: otel-gateway
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8888"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: otel-gateway
        image: otel/opentelemetry-collector-contrib:0.92.0
        args:
          - "--config=/conf/config.yaml"
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 8888
          name: metrics
        - containerPort: 8889
          name: prom-exporter
        volumeMounts:
        - name: config
          mountPath: /conf
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /
            port: 13133
        readinessProbe:
          httpGet:
            path: /
            port: 13133
      volumes:
      - name: config
        configMap:
          name: otel-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-gateway
  namespace: observability
spec:
  selector:
    app: otel-gateway
  ports:
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
  - name: metrics
    port: 8888
    targetPort: 8888
  type: ClusterIP
  sessionAffinity: None  # Don't pin connections
```

## Configuring Horizontal Pod Autoscaling

Enable HPA for gateway collectors based on CPU and memory:

```yaml
# otel-gateway-hpa.yaml
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
  minReplicas: 5
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: otelcol_receiver_accepted_spans
      target:
        type: AverageValue
        averageValue: "10000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

## Implementing Pod Disruption Budgets

Ensure gateway availability during maintenance:

```yaml
# otel-gateway-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: otel-gateway
  namespace: observability
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: otel-gateway
```

## Monitoring Gateway Health

Deploy ServiceMonitor for Prometheus scraping:

```yaml
# otel-gateway-monitoring.yaml
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
    interval: 30s
    path: /metrics
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-gateway-alerts
  namespace: observability
data:
  alerts.yaml: |
    groups:
    - name: otel-gateway
      rules:
      - alert: OtelGatewayHighMemory
        expr: |
          container_memory_usage_bytes{pod=~"otel-gateway.*"}
          / container_spec_memory_limit_bytes{pod=~"otel-gateway.*"} > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "OTel Gateway high memory usage"

      - alert: OtelGatewayHighSpanDropRate
        expr: |
          rate(otelcol_processor_dropped_spans[5m]) > 100
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "OTel Gateway dropping spans"

      - alert: OtelGatewayExporterFailures
        expr: |
          rate(otelcol_exporter_send_failed_spans[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "OTel Gateway export failures"
```

## Testing Load Balancing

Create a test to verify load balancing:

```go
// test_load_balancing.go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
)

func testGatewayLoadBalancing() {
    ctx := context.Background()

    // Create OTLP exporter pointing to gateway
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("otel-gateway.observability.svc.cluster.local:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        panic(err)
    }

    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)

    tracer := tp.Tracer("load-test")

    // Generate load
    var wg sync.WaitGroup
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()

            ctx, span := tracer.Start(ctx, fmt.Sprintf("test-span-%d", id))
            time.Sleep(10 * time.Millisecond)
            span.End()
        }(i)
    }

    wg.Wait()
    tp.Shutdown(ctx)

    fmt.Println("Load test complete. Check gateway metrics for distribution.")
}
```

A centralized trace gateway with load balancing provides the scalability and reliability needed for production Kubernetes environments. By separating trace ingestion from delivery and implementing proper load distribution, you build a robust observability infrastructure that handles high trace volumes efficiently.
