# How to Configure Tempo Metrics Generator to Create RED Metrics from Kubernetes Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Grafana Tempo, Distributed Tracing, Metrics, Observability

Description: Learn how to configure Grafana Tempo's metrics generator to automatically create Rate, Error, and Duration (RED) metrics from distributed traces in Kubernetes for unified observability without dual instrumentation.

---

Grafana Tempo's metrics generator creates service-level metrics directly from trace data, eliminating the need for separate metrics instrumentation. By analyzing span data, Tempo automatically generates Request Rate, Error Rate, and Duration metrics that power RED method dashboards and alerts.

This approach provides consistent metrics derived from the same instrumentation that produces traces. You instrument once for tracing and get both detailed traces and aggregate metrics. The metrics generator processes spans in real-time, producing Prometheus-compatible metrics that integrate with existing monitoring workflows.

## Understanding Tempo Metrics Generator

The metrics generator analyzes trace spans as they flow through Tempo. For each span, it extracts service name, operation, status, and duration. These attributes feed into metric calculations that track request rates, error rates, and latency distributions across services.

The generator creates three core metric types. Request rate counters track the number of requests per service and operation. Error rate counters count failed requests based on span status. Duration histograms capture latency distributions at multiple percentiles. Together, these metrics implement the RED method for service monitoring.

## Deploying Tempo with Metrics Generator

Configure Tempo with the metrics generator enabled:

```yaml
# tempo-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tempo-config
  namespace: observability
data:
  tempo.yaml: |
    server:
      http_listen_port: 3100

    distributor:
      receivers:
        otlp:
          protocols:
            grpc:
              endpoint: 0.0.0.0:4317
            http:
              endpoint: 0.0.0.0:4318

    metrics_generator:
      # Enable metrics generator
      processor:
        service_graphs:
          # Generate service graph metrics
          dimensions:
            - http.method
            - http.target
            - http.status_code
            - k8s.namespace.name
            - k8s.deployment.name
        span_metrics:
          # Generate span metrics (RED)
          enable_target_info: true
          dimensions:
            - http.method
            - http.status_code
            - rpc.grpc.status_code
            - k8s.namespace.name
            - k8s.deployment.name
            - k8s.pod.name
          histogram_buckets: [0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

      storage:
        path: /var/tempo/generator/wal
        remote_write:
          - url: http://prometheus.observability.svc.cluster.local:9090/api/v1/write
            send_exemplars: true

    ingester:
      trace_idle_period: 10s
      max_block_bytes: 1048576

    compactor:
      compaction:
        block_retention: 48h

    storage:
      trace:
        backend: local
        local:
          path: /var/tempo/traces
        wal:
          path: /var/tempo/wal
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo
  namespace: observability
spec:
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
        image: grafana/tempo:2.3.1
        args:
          - "-config.file=/etc/tempo/tempo.yaml"
        ports:
        - containerPort: 3100
        - containerPort: 4317
        - containerPort: 4318
        volumeMounts:
        - name: config
          mountPath: /etc/tempo
        - name: storage
          mountPath: /var/tempo
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
      volumes:
      - name: config
        configMap:
          name: tempo-config
      - name: storage
        emptyDir: {}
```

## Configuring Prometheus Remote Write

Enable Prometheus to receive metrics from Tempo:

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: observability
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    remote_write:
      - url: http://prometheus.observability.svc.cluster.local:9090/api/v1/write

    scrape_configs:
    - job_name: 'tempo'
      static_configs:
        - targets: ['tempo.observability.svc.cluster.local:3100']
```

## Creating RED Method Dashboards

Build Grafana dashboards using generated metrics:

```json
{
  "dashboard": {
    "title": "RED Metrics from Traces",
    "panels": [
      {
        "title": "Request Rate (requests/sec)",
        "type": "graph",
        "targets": [
          {
            "datasource": "Prometheus",
            "expr": "sum(rate(traces_spanmetrics_calls_total{service_name=\"$service\"}[5m])) by (span_name)",
            "legendFormat": "{{span_name}}"
          }
        ],
        "yaxes": [
          {"format": "reqps"}
        ]
      },
      {
        "title": "Error Rate (%)",
        "type": "graph",
        "targets": [
          {
            "datasource": "Prometheus",
            "expr": "sum(rate(traces_spanmetrics_calls_total{service_name=\"$service\", status_code=\"STATUS_CODE_ERROR\"}[5m])) by (span_name) / sum(rate(traces_spanmetrics_calls_total{service_name=\"$service\"}[5m])) by (span_name) * 100",
            "legendFormat": "{{span_name}}"
          }
        ],
        "yaxes": [
          {"format": "percent"}
        ]
      },
      {
        "title": "Duration P50/P95/P99 (ms)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(traces_spanmetrics_latency_bucket{service_name=\"$service\"}[5m])) by (le, span_name))",
            "legendFormat": "P50 - {{span_name}}"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(traces_spanmetrics_latency_bucket{service_name=\"$service\"}[5m])) by (le, span_name))",
            "legendFormat": "P95 - {{span_name}}"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(traces_spanmetrics_latency_bucket{service_name=\"$service\"}[5m])) by (le, span_name))",
            "legendFormat": "P99 - {{span_name}}"
          }
        ]
      },
      {
        "title": "Service Graph",
        "type": "nodeGraph",
        "targets": [
          {
            "datasource": "Prometheus",
            "expr": "traces_service_graph_request_total"
          }
        ]
      }
    ],
    "templating": {
      "list": [
        {
          "name": "service",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(traces_spanmetrics_calls_total, service_name)"
        }
      ]
    }
  }
}
```

## Setting Up Alerts on Generated Metrics

Create alerting rules:

```yaml
# tempo-metrics-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tempo-metrics-alerts
  namespace: observability
data:
  alerts.yml: |
    groups:
    - name: red_metrics
      rules:
      - alert: HighErrorRate
        expr: |
          (sum(rate(traces_spanmetrics_calls_total{status_code="STATUS_CODE_ERROR"}[5m])) by (service_name)
          /
          sum(rate(traces_spanmetrics_calls_total[5m])) by (service_name)) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate for {{ $labels.service_name }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(traces_spanmetrics_latency_bucket[5m])) by (le, service_name)
          ) > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High P95 latency for {{ $labels.service_name }}"
```

Tempo's metrics generator provides RED metrics without additional instrumentation. By deriving metrics from trace data, you maintain a single source of truth for both detailed traces and aggregate service performance metrics in Kubernetes environments.
