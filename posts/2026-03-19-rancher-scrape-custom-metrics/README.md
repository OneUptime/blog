# How to Scrape Custom Application Metrics in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus, ServiceMonitor, PodMonitor

Description: Learn how to instrument your applications and configure Rancher to scrape custom Prometheus metrics from your Kubernetes workloads.

Monitoring custom application metrics is essential for understanding business logic performance, tracking SLIs, and debugging application-specific issues. This guide covers the full pipeline from instrumenting your application to configuring Rancher's Prometheus to scrape and alert on custom metrics.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- An application deployed in the cluster that you can modify.
- Cluster admin or namespace permissions.

## Step 1: Instrument Your Application

Add a Prometheus client library to your application to expose metrics. Here are examples for common languages.

### Go

```go
package main

import (
    "log"
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal, httpRequestDuration, activeConnections)
}

func main() {
    appMux := http.NewServeMux()
    appMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        activeConnections.Inc()
        defer activeConnections.Dec()

        w.WriteHeader(http.StatusOK)
        _, _ = w.Write([]byte("ok\n"))

        httpRequestsTotal.WithLabelValues(r.Method, "/", "200").Inc()
        httpRequestDuration.WithLabelValues(r.Method, "/").Observe(time.Since(start).Seconds())
    })

    metricsMux := http.NewServeMux()
    metricsMux.Handle("/metrics", promhttp.Handler())

    go func() {
        log.Fatal(http.ListenAndServe(":9090", metricsMux))
    }()

    log.Fatal(http.ListenAndServe(":8080", appMux))
}
```

### Python (Flask)

```python
import time

from flask import Flask, request
from prometheus_client import Counter, Histogram, Gauge, start_http_server

app = Flask(__name__)

REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Number of active connections'
)

@app.route('/')
def index():
    start = time.time()
    ACTIVE_CONNECTIONS.inc()
    try:
        return 'ok', 200
    finally:
        REQUEST_COUNT.labels(request.method, request.path, '200').inc()
        REQUEST_LATENCY.labels(request.method, request.path).observe(time.time() - start)
        ACTIVE_CONNECTIONS.dec()

if __name__ == '__main__':
    start_http_server(9090)
    app.run(host='0.0.0.0', port=8080)
```

### Node.js

```javascript
const client = require('prom-client');
const express = require('express');

const app = express();
const metricsApp = express();
const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'endpoint'],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

app.get('/', (req, res) => {
  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequestsTotal.labels(req.method, '/', String(res.statusCode)).inc();
    httpRequestDuration.labels(req.method, '/').observe(duration);
    activeConnections.dec();
  });

  res.send('ok');
});

metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(8080);
metricsApp.listen(9090);
```

## Step 2: Deploy Your Application with Metrics Port

Include a named metrics port in your Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          ports:
            - name: http
              containerPort: 8080
            - name: metrics
              containerPort: 9090
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: production
  labels:
    app: my-app
spec:
  selector:
    app: my-app
  ports:
    - name: http
      port: 8080
    - name: metrics
      port: 9090
```

## Step 3: Create a ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app-metrics
  namespace: production
  labels:
    release: rancher-monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

Apply:

```bash
kubectl apply -f my-app-servicemonitor.yaml
```

## Step 4: Verify Metrics Are Being Scraped

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-prometheus 9090:9090
```

Send a few requests to your application, then open Prometheus UI and query your custom metric:

```promql
http_requests_total{job="my-app"}
```

Check the target status at **Status > Targets**.

## Step 5: Create Alerts for Custom Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: my-app-alerts
  namespace: production
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: my-app-alerts
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{job="my-app", status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total{job="my-app"}[5m]))
            > 0.05
          for: 5m
          labels:
            severity: critical
            service: my-app
          annotations:
            summary: "High error rate on my-app"
            description: "Error rate is {{ $value | humanizePercentage }}."

        - alert: HighLatency
          expr: |
            histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job="my-app"}[5m])) by (le))
            > 2
          for: 5m
          labels:
            severity: warning
            service: my-app
          annotations:
            summary: "High P99 latency on my-app"
            description: "P99 latency is {{ $value }}s."

        - alert: NoActiveConnections
          expr: |
            sum(active_connections{job="my-app"}) == 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "No active connections to my-app"
```

## Step 6: Create Recording Rules for Custom Metrics

Pre-compute frequently used queries:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: my-app-recording-rules
  namespace: production
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: my-app-recording
      rules:
        - record: my_app:request_rate:5m
          expr: sum(rate(http_requests_total{job="my-app"}[5m]))

        - record: my_app:error_rate:5m
          expr: |
            sum(rate(http_requests_total{job="my-app", status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total{job="my-app"}[5m]))

        - record: my_app:latency_p99:5m
          expr: |
            histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job="my-app"}[5m])) by (le))
```

## Step 7: Build a Grafana Dashboard for Custom Metrics

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-dashboard
  namespace: cattle-dashboards
  labels:
    grafana_dashboard: "1"
data:
  my-app.json: |
    {
      "title": "My Application Metrics",
      "uid": "my-app-metrics",
      "panels": [
        {
          "title": "Request Rate",
          "type": "timeseries",
          "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
          "targets": [{
            "expr": "sum(rate(http_requests_total{job=\"my-app\"}[5m])) by (status)",
            "legendFormat": "{{ status }}"
          }]
        },
        {
          "title": "Request Duration (P50, P90, P99)",
          "type": "timeseries",
          "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
          "targets": [
            {
              "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket{job=\"my-app\"}[5m])) by (le))",
              "legendFormat": "P50"
            },
            {
              "expr": "histogram_quantile(0.90, sum(rate(http_request_duration_seconds_bucket{job=\"my-app\"}[5m])) by (le))",
              "legendFormat": "P90"
            },
            {
              "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job=\"my-app\"}[5m])) by (le))",
              "legendFormat": "P99"
            }
          ],
          "fieldConfig": { "defaults": { "unit": "s" } }
        },
        {
          "title": "Error Rate",
          "type": "gauge",
          "gridPos": { "h": 8, "w": 6, "x": 0, "y": 8 },
          "targets": [{
            "expr": "sum(rate(http_requests_total{job=\"my-app\", status=~\"5..\"}[5m])) / sum(rate(http_requests_total{job=\"my-app\"}[5m])) * 100"
          }],
          "fieldConfig": { "defaults": { "unit": "percent" } }
        }
      ]
    }
```

## Step 8: Use Annotations for Auto-Discovery

An alternative to creating ServiceMonitors manually is to use pod annotations for metric discovery. Configure additional scrape configs in the `rancher-monitoring` Helm values:

```yaml
prometheus:
  prometheusSpec:
    additionalScrapeConfigs:
      - job_name: "kubernetes-pods"
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port, __meta_kubernetes_pod_ip]
            action: replace
            target_label: __address__
            regex: (.+);(.+)
            replacement: $2:$1
```

Then annotate your pods:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    prometheus.io/path: "/metrics"
```

## Summary

Scraping custom application metrics in Rancher involves instrumenting your application with a Prometheus client library, exposing a metrics endpoint, creating a ServiceMonitor or PodMonitor, and verifying the metrics appear in Prometheus. From there, build custom alerts and Grafana dashboards to monitor your application-specific metrics alongside the standard Kubernetes metrics.
