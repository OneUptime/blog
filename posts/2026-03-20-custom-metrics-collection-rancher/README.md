# How to Set Up Custom Metrics Collection in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Custom Metric, Prometheus, ServiceMonitor, Kubernetes, Observability

Description: Configure custom application metrics collection in Rancher using Prometheus ServiceMonitors, custom exporters, and Grafana dashboard visualization.

## Introduction

Kubernetes provides built-in metrics for CPU and memory, but business-level metrics (order counts, queue depths, error rates) must be instrumented in your applications. Prometheus ServiceMonitors make it easy to scrape custom metrics from any application running on Rancher.

## Step 1: Expose Metrics from Your Application

Add a Prometheus metrics endpoint to your application. Here's an example using the Python `prometheus_client` library:

```python
# app.py - Flask application with custom metrics

from flask import Flask, request
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

app = Flask(__name__)

# Define custom metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

ACTIVE_USERS = Gauge(
    'active_users',
    'Number of currently active users'
)

# Start a dedicated metrics HTTP server on port 9090 (scraped by Prometheus)
start_http_server(9090)

@app.before_request
def start_timer():
    request.start_time = time.time()

@app.after_request
def record_metrics(response):
    duration = time.time() - request.start_time
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.path,
        status=response.status_code
    ).inc()
    REQUEST_LATENCY.labels(endpoint=request.path).observe(duration)
    return response
```

## Step 2: Expose the Metrics Port in Your Service

```yaml
# application-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
  labels:
    app: myapp
spec:
  selector:
    app: myapp
  ports:
    - name: http
      port: 8080
      targetPort: 8080
    - name: metrics        # Named port required by ServiceMonitor
      port: 9090
      targetPort: 9090
```

## Step 3: Create a ServiceMonitor

A ServiceMonitor tells the Prometheus Operator which services to scrape:

```yaml
# myapp-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp-metrics
  namespace: production
  labels:
    release: monitoring    # Must match Prometheus Operator's serviceMonitorSelector
spec:
  selector:
    matchLabels:
      app: myapp           # Selects the Service with this label
  endpoints:
    - port: metrics        # Named port from the Service
      interval: 30s        # Scrape every 30 seconds
      path: /metrics
      scheme: http
```

```bash
kubectl apply -f myapp-servicemonitor.yaml
```

## Step 4: Verify Metrics are Scraped

```bash
# Port-forward Prometheus UI
kubectl port-forward svc/prometheus-kube-prometheus-prometheus \
  -n observability 9090:9090

# Open http://localhost:9090/targets
# Look for your ServiceMonitor in the targets list
```

## Step 5: Create a Grafana Dashboard

Query your custom metrics in Grafana:

```promql
# Request rate per endpoint
sum by (endpoint) (
  rate(http_requests_total{namespace="production"}[5m])
)

# 95th percentile latency
histogram_quantile(0.95,
  sum by (le, endpoint) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)

# Error rate
sum by (endpoint) (
  rate(http_requests_total{status=~"5.."}[5m])
)
/
sum by (endpoint) (
  rate(http_requests_total[5m])
)
```

## Conclusion

Custom metrics collection in Rancher follows a clean pattern: instrument your application to expose a `/metrics` endpoint, define a Kubernetes Service with a named metrics port, and create a ServiceMonitor to register the scrape target with Prometheus. This approach requires no Prometheus configuration file changes and integrates seamlessly with the Prometheus Operator.
