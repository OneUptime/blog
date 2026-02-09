# How to Deploy Grafana Tempo with kube-prometheus-stack for Trace Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Tempo, Distributed Tracing, Prometheus, Kubernetes, Observability

Description: Learn how to integrate Grafana Tempo with kube-prometheus-stack to add distributed tracing capabilities and link traces to metrics and logs.

---

Metrics alone do not provide complete observability. Distributed tracing shows how requests flow through microservices, identifying bottlenecks and failures. Grafana Tempo provides scalable, cost-effective trace storage that integrates seamlessly with Prometheus metrics and Loki logs. This unified observability stack enables jumping from metrics to traces to logs, accelerating troubleshooting.

## Understanding Grafana Tempo

Tempo is a distributed tracing backend that:
- Stores traces in object storage (S3, GCS, Azure)
- Requires only trace ID for queries (no indexing)
- Integrates with Grafana for visualization
- Supports OpenTelemetry, Jaeger, and Zipkin formats
- Links to metrics via exemplars
- Scales horizontally for high trace volumes

Unlike traditional tracing systems, Tempo does not index trace data, reducing costs significantly.

## Prerequisites

You need:
- kube-prometheus-stack installed
- Kubernetes cluster (1.20+)
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

    ingester:
      trace_idle_period: 30s
      max_block_bytes: 1048576
      max_block_duration: 10m

    compactor:
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

    querier:
      frontend_worker:
        frontend_address: tempo-query-frontend:9095

    query_frontend:
      search:
        max_duration: 24h
```

Deploy Tempo components:

```yaml
# tempo-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: tempo-ingester
  namespace: monitoring
spec:
  serviceName: tempo-ingester
  replicas: 3
  selector:
    matchLabels:
      app: tempo-ingester
  template:
    metadata:
      labels:
        app: tempo-ingester
    spec:
      containers:
        - name: tempo
          image: grafana/tempo:latest
          args:
            - -config.file=/etc/tempo/tempo.yaml
            - -target=ingester
          ports:
            - containerPort: 3200
              name: http
            - containerPort: 7946
              name: memberlist
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
              cpu: 2000m
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

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-distributor
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tempo-distributor
  template:
    metadata:
      labels:
        app: tempo-distributor
    spec:
      containers:
        - name: tempo
          image: grafana/tempo:latest
          args:
            - -config.file=/etc/tempo/tempo.yaml
            - -target=distributor
          ports:
            - containerPort: 3200
              name: http
            - containerPort: 14268
              name: jaeger-http
            - containerPort: 14250
              name: jaeger-grpc
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
          volumeMounts:
            - name: config
              mountPath: /etc/tempo
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
      volumes:
        - name: config
          configMap:
            name: tempo-config

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-querier
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tempo-querier
  template:
    metadata:
      labels:
        app: tempo-querier
    spec:
      containers:
        - name: tempo
          image: grafana/tempo:latest
          args:
            - -config.file=/etc/tempo/tempo.yaml
            - -target=querier
          ports:
            - containerPort: 3200
              name: http
          volumeMounts:
            - name: config
              mountPath: /etc/tempo
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
      volumes:
        - name: config
          configMap:
            name: tempo-config

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-query-frontend
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tempo-query-frontend
  template:
    metadata:
      labels:
        app: tempo-query-frontend
    spec:
      containers:
        - name: tempo
          image: grafana/tempo:latest
          args:
            - -config.file=/etc/tempo/tempo.yaml
            - -target=query-frontend
          ports:
            - containerPort: 3200
              name: http
            - containerPort: 9095
              name: grpc
          volumeMounts:
            - name: config
              mountPath: /etc/tempo
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
      volumes:
        - name: config
          configMap:
            name: tempo-config

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo-compactor
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tempo-compactor
  template:
    metadata:
      labels:
        app: tempo-compactor
    spec:
      containers:
        - name: tempo
          image: grafana/tempo:latest
          args:
            - -config.file=/etc/tempo/tempo.yaml
            - -target=compactor
          ports:
            - containerPort: 3200
              name: http
          volumeMounts:
            - name: config
              mountPath: /etc/tempo
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
      volumes:
        - name: config
          configMap:
            name: tempo-config
```

Create services:

```yaml
# tempo-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: tempo-distributor
  namespace: monitoring
spec:
  selector:
    app: tempo-distributor
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

---
apiVersion: v1
kind: Service
metadata:
  name: tempo-query-frontend
  namespace: monitoring
spec:
  selector:
    app: tempo-query-frontend
  ports:
    - name: http
      port: 3200
      targetPort: 3200
    - name: grpc
      port: 9095
      targetPort: 9095

---
apiVersion: v1
kind: Service
metadata:
  name: tempo-querier
  namespace: monitoring
spec:
  selector:
    app: tempo-querier
  ports:
    - name: http
      port: 3200
      targetPort: 3200

---
apiVersion: v1
kind: Service
metadata:
  name: tempo-ingester
  namespace: monitoring
  labels:
    app: tempo-ingester
spec:
  clusterIP: None
  selector:
    app: tempo-ingester
  ports:
    - name: http
      port: 3200
      targetPort: 3200
    - name: memberlist
      port: 7946
      targetPort: 7946
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
      url: http://tempo-query-frontend.monitoring.svc.cluster.local:3200
      jsonData:
        httpMethod: GET
        tracesToLogs:
          datasourceUid: 'loki'
          tags: ['job', 'instance', 'pod', 'namespace']
          mappedTags: [{ key: 'service.name', value: 'service' }]
          mapTagNamesEnabled: true
          spanStartTimeShift: '1m'
          spanEndTimeShift: '1m'
          filterByTraceID: true
          filterBySpanID: true
        tracesToMetrics:
          datasourceUid: 'prometheus'
          tags: [{ key: 'service.name', value: 'service' }]
          spanStartTimeShift: '1m'
          spanEndTimeShift: '1m'
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
        endpoint: tempo-distributor.monitoring.svc.cluster.local:4317
        tls:
          insecure: true

      # Send metrics to Prometheus
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
          image: otel/opentelemetry-collector-contrib:latest
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
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/trace"
)

// Record metric with exemplar
counter.Add(ctx, 1)  // Automatically includes trace ID as exemplar
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
      "type": "tempo-panel"
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
  selector:
    matchLabels:
      app: tempo-distributor
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
        - alert: TempoIngesterUnhealthy
          expr: up{job="tempo-ingester"} == 0
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
