# How to Deploy Grafana Tempo with kube-prometheus-stack for Trace Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Tempo, Distributed Tracing, Prometheus, Kubernetes, Observability

Description: Learn how to integrate Grafana Tempo with kube-prometheus-stack to add distributed tracing capabilities and link traces to metrics and logs.

---

Metrics alone do not provide complete observability. Distributed tracing shows how requests flow through microservices, identifying bottlenecks and failures. Grafana Tempo provides scalable, cost-effective trace storage that integrates seamlessly with Prometheus metrics and Loki logs. This unified observability stack enables jumping from metrics to traces to logs, accelerating troubleshooting.

## Understanding Grafana Tempo

Tempo is a distributed tracing backend that:
- Stores traces in object storage (S3, GCS, Azure)
- Can retrieve traces directly by trace ID without full trace indexing
- Integrates with Grafana for visualization
- Supports OpenTelemetry, Jaeger, and Zipkin formats
- Links to metrics via exemplars
- Can be deployed in microservices mode for high trace volumes

Unlike traditional tracing systems, Tempo does not rely on full trace indexing, reducing costs significantly.

## Prerequisites

You need:
- kube-prometheus-stack installed
- Kubernetes cluster supported by your kube-prometheus-stack chart version
- Object storage for trace data
- Applications instrumented with OpenTelemetry or Jaeger

## Deploying Grafana Tempo

Create Tempo configuration:

```yaml
# tempo-config.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: tempo-config
  namespace: monitoring
data:
  tempo.yaml: |
    target: all
    multitenancy_enabled: false

    server:
      http_listen_port: 3200

    distributor:
      receivers:
        jaeger:
          protocols:
            thrift_http:
              endpoint: 0.0.0.0:14268
            grpc:
              endpoint: 0.0.0.0:14250
        otlp:
          protocols:
            grpc:
              endpoint: 0.0.0.0:4317
            http:
              endpoint: 0.0.0.0:4318
        zipkin:
          endpoint: 0.0.0.0:9411

    live_store:
      max_trace_idle: 30s
      max_block_duration: 10m

    backend_scheduler:
      provider:
        compaction:
          compaction:
            block_retention: 720h  # 30 days

    backend_worker:
      compaction:
        block_retention: 720h  # 30 days

    storage:
      trace:
        backend: s3
        s3:
          bucket: tempo-traces
          endpoint: s3.amazonaws.com
          region: us-east-1
          access_key: YOUR_ACCESS_KEY
          secret_key: YOUR_SECRET_KEY
        pool:
          max_workers: 100
          queue_depth: 10000
```

Deploy Tempo components:

```yaml
# tempo-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: tempo
  namespace: monitoring
spec:
  serviceName: tempo
  replicas: 1
  selector:
    matchLabels:
      app: tempo
  template:
    metadata:
      labels:
        app: tempo
    spec:
      containers:
        - name: tempo
          image: grafana/tempo:3.0.0
          args:
            - -config.file=/etc/tempo/tempo.yaml
          ports:
            - containerPort: 3200
              name: http
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
            - containerPort: 14268
              name: jaeger-http
            - containerPort: 14250
              name: jaeger-grpc
            - containerPort: 9411
              name: zipkin
          volumeMounts:
            - name: config
              mountPath: /etc/tempo
            - name: data
              mountPath: /var/tempo
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 2
              memory: 4Gi
      volumes:
        - name: config
          configMap:
            name: tempo-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi
```

Create services:

```yaml
# tempo-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: tempo
  namespace: monitoring
  labels:
    app: tempo
spec:
  selector:
    app: tempo
  ports:
    - name: http
      port: 3200
      targetPort: 3200
    - name: jaeger-http
      port: 14268
      targetPort: 14268
    - name: jaeger-grpc
      port: 14250
      targetPort: 14250
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
    - name: otlp-http
      port: 4318
      targetPort: 4318
    - name: zipkin
      port: 9411
      targetPort: 9411
```

Deploy Tempo:

```bash
kubectl apply -f tempo-config.yaml
kubectl apply -f tempo-deployment.yaml
kubectl apply -f tempo-services.yaml
```

## Configuring Grafana Datasource

Add Tempo as a Grafana datasource:

```yaml
# grafana-tempo-datasource.yaml
grafana:
  additionalDataSources:
    - name: Tempo
      type: tempo
      access: proxy
      url: http://tempo.monitoring.svc.cluster.local:3200
      jsonData:
        httpMethod: GET
        tracesToLogsV2:
          datasourceUid: 'loki'
          tags: [{ key: 'job' }, { key: 'instance' }, { key: 'pod' }, { key: 'namespace' }]
          spanStartTimeShift: '-1m'
          spanEndTimeShift: '1m'
          filterByTraceID: true
          filterBySpanID: true
        tracesToMetrics:
          datasourceUid: 'prometheus'
          tags: [{ key: 'service.name', value: 'service' }]
          spanStartTimeShift: '-1m'
          spanEndTimeShift: '1m'
          queries:
            - name: 'Request rate'
              query: 'sum(rate(http_requests_total{$$__tags}[5m]))'
        serviceMap:
          datasourceUid: 'prometheus'
        search:
          hide: false
        nodeGraph:
          enabled: true
        lokiSearch:
          datasourceUid: 'loki'
```

## Instrumenting Applications

Configure OpenTelemetry to send traces to Tempo:

```yaml
# otel-collector-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  otel-collector-config.yaml: |
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
        send_batch_size: 1024

      memory_limiter:
        check_interval: 1s
        limit_mib: 512

    exporters:
      # Send to Tempo
      otlp:
        endpoint: tempo.monitoring.svc.cluster.local:4317
        tls:
          insecure: true

      # Expose metrics for Prometheus to scrape
      prometheus:
        endpoint: "0.0.0.0:8889"

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlp]

        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [prometheus]
```

Deploy OpenTelemetry Collector:

```yaml
# otel-collector-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:0.153.0
          args:
            - --config=/etc/otel-collector-config.yaml
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
            - containerPort: 8889
              name: prometheus
          volumeMounts:
            - name: config
              mountPath: /etc/otel-collector-config.yaml
              subPath: otel-collector-config.yaml
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1Gi
      volumes:
        - name: config
          configMap:
            name: otel-collector-config

---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  selector:
    app: otel-collector
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
    - name: otlp-http
      port: 4318
      targetPort: 4318
    - name: prometheus
      port: 8889
      targetPort: 8889
```

## Linking Metrics to Traces with Exemplars

Configure Prometheus to collect exemplars:

```yaml
prometheus:
  prometheusSpec:
    # Enable exemplar storage
    enableFeatures:
      - exemplar-storage

    # Exemplar configuration
    exemplars:
      maxSize: 100000
```

Application code example (Go):

```go
import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/metric"
)

func recordRequest(ctx context.Context) error {
    meter := otel.Meter("checkout-service")
    counter, err := meter.Int64Counter(
        "http_requests_total",
        metric.WithDescription("Total HTTP requests"),
    )
    if err != nil {
        return err
    }

    // If ctx contains a sampled span and exemplars are enabled, the SDK can attach trace/span IDs.
    counter.Add(ctx, 1)
    return nil
}
```

## Creating Grafana Dashboards with Traces

Create a dashboard that links metrics to traces:

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "targets": [
        {
          "expr": "rate(http_requests_total[5m])",
          "exemplar": true
        }
      ],
      "type": "timeseries"
    },
    {
      "title": "Trace View",
      "datasource": "Tempo",
      "type": "traces",
      "targets": [
        {
          "query": "${traceId}",
          "queryType": "traceql"
        }
      ]
    }
  ]
}
```

## Monitoring Tempo

Create ServiceMonitors for Tempo:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: tempo
  namespace: monitoring
spec:
  jobLabel: app
  selector:
    matchLabels:
      app: tempo
  endpoints:
    - port: http
      interval: 30s
```

Create alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tempo-alerts
  namespace: monitoring
spec:
  groups:
    - name: tempo
      interval: 30s
      rules:
        - alert: TempoDown
          expr: up{job="tempo"} == 0
          for: 5m
          labels:
            severity: critical

        - alert: TempoHighIngestionRate
          expr: rate(tempo_distributor_spans_received_total[5m]) > 10000
          for: 10m
          labels:
            severity: warning
```

## Best Practices

1. Use sampling to reduce trace volume in high-traffic systems
2. Configure appropriate retention periods based on requirements
3. Monitor object storage costs and optimize trace retention
4. Enable exemplars in metrics for trace correlation
5. Use consistent service naming across traces, metrics, and logs
6. Implement trace context propagation in all services
7. Set up proper RBAC for Tempo components
8. Use OpenTelemetry for standardized instrumentation
9. Monitor Tempo component health and resource usage
10. Test trace queries regularly to ensure proper operation

## Conclusion

Grafana Tempo completes the observability stack by adding distributed tracing to Prometheus metrics and Loki logs. By storing traces in object storage without indexing, Tempo provides cost-effective, scalable tracing. Integration with Grafana enables seamless navigation between metrics, traces, and logs, dramatically reducing mean time to resolution for production issues.
