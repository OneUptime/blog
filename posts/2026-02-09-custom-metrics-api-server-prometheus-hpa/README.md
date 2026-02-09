# How to Set Up Custom Metrics API Server with Prometheus for HPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Prometheus, Autoscaling

Description: Learn how to deploy and configure a custom metrics API server using Prometheus Adapter to enable HPA autoscaling based on application-specific metrics.

---

Kubernetes HPA supports three metric types: Resource (CPU/memory), Pods (custom per-pod metrics), and Object (metrics from other Kubernetes objects). To use custom metrics, you need a Custom Metrics API server that implements the `custom.metrics.k8s.io` API. The Prometheus Adapter serves this role, translating Prometheus queries into Kubernetes custom metrics.

## Understanding the Custom Metrics Pipeline

The flow works like this:

1. Your application exposes metrics (usually at `/metrics` endpoint)
2. Prometheus scrapes and stores these metrics
3. Prometheus Adapter queries Prometheus and exposes results via Custom Metrics API
4. HPA queries the Custom Metrics API to make scaling decisions

## Installing Prometheus

First, ensure Prometheus is running and scraping your application metrics. Using the kube-prometheus-stack:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false
```

This configuration allows Prometheus to discover ServiceMonitors and PodMonitors across all namespaces.

## Exposing Application Metrics

Your application needs to expose metrics in Prometheus format. Here's a Python Flask example:

```python
from flask import Flask, Response
from prometheus_client import Counter, Histogram, generate_latest, REGISTRY
import time

app = Flask(__name__)

# Define custom metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

@app.route('/api/data')
def get_data():
    with http_request_duration.labels(method='GET', endpoint='/api/data').time():
        # Your application logic
        time.sleep(0.05)
        http_requests_total.labels(method='GET', endpoint='/api/data', status='200').inc()
        return {'data': 'example'}

@app.route('/metrics')
def metrics():
    return Response(generate_latest(REGISTRY), mimetype='text/plain')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Deploy this with a Service and ServiceMonitor:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp-service
  namespace: production
  labels:
    app: webapp
spec:
  selector:
    app: webapp
  ports:
  - name: http
    port: 8080
  - name: metrics
    port: 8080
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: webapp-monitor
  namespace: production
  labels:
    app: webapp
spec:
  selector:
    matchLabels:
      app: webapp
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
```

## Installing Prometheus Adapter

Deploy the Prometheus Adapter to expose Prometheus metrics via the Custom Metrics API:

```bash
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-kube-prometheus-prometheus.monitoring.svc \
  --set prometheus.port=9090
```

Verify the adapter is registered:

```bash
kubectl get apiservices | grep custom.metrics
```

You should see:

```
v1beta1.custom.metrics.k8s.io    monitoring/prometheus-adapter    True    2m
```

## Configuring Custom Metrics Rules

The adapter uses configuration rules to translate Prometheus metrics into Kubernetes custom metrics. Edit the adapter configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
    # Rule for HTTP requests per second
    - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
      seriesFilters: []
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total$"
        as: "${1}_per_second"
      metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'

    # Rule for request latency p95
    - seriesQuery: 'http_request_duration_seconds_bucket{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "http_request_duration_p95"
      metricsQuery: 'histogram_quantile(0.95, rate(<<.Series>>{<<.LabelMatchers>>}[5m]))'

    # Rule for custom business metric
    - seriesQuery: 'queue_depth{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "queue_depth"
      metricsQuery: 'avg_over_time(<<.Series>>{<<.LabelMatchers>>}[2m])'
```

Update the adapter with this configuration:

```bash
helm upgrade prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-kube-prometheus-prometheus.monitoring.svc \
  --set prometheus.port=9090 \
  --values adapter-config.yaml
```

## Verifying Custom Metrics

Check available custom metrics:

```bash
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq .
```

Query a specific metric for a namespace:

```bash
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second" | jq .
```

Expected output:

```json
{
  "kind": "MetricValueList",
  "apiVersion": "custom.metrics.k8s.io/v1beta1",
  "metadata": {},
  "items": [
    {
      "describedObject": {
        "kind": "Pod",
        "namespace": "production",
        "name": "webapp-5d7f8c9b-xyz12",
        "apiVersion": "/v1"
      },
      "metricName": "http_requests_per_second",
      "timestamp": "2026-02-09T10:30:00Z",
      "value": "125"
    }
  ]
}
```

## Creating HPA with Custom Metrics

Now configure HPA to use the custom metric:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-custom-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp-deployment
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"  # Scale when average exceeds 1000 req/s per pod
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 50
        periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

This scales when pods average more than 1000 requests per second.

## Advanced Metrics Configurations

**Scaling on latency percentiles**:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: latency-based-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-deployment
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_request_duration_p95
      target:
        type: AverageValue
        averageValue: "500m"  # Scale when p95 latency > 500ms
```

**Scaling on queue depth**:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: queue-depth-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker-deployment
  minReplicas: 2
  maxReplicas: 40
  metrics:
  - type: Pods
    pods:
      metric:
        name: queue_depth
      target:
        type: AverageValue
        averageValue: "100"  # Scale when queue depth > 100 per pod
```

## Using Object Metrics for Ingress Scaling

Scale based on Ingress request rate instead of per-pod metrics:

```yaml
# Adapter rule for Ingress metrics
rules:
- seriesQuery: 'nginx_ingress_controller_requests{ingress!=""}'
  resources:
    overrides:
      namespace: {resource: "namespace"}
      ingress: {resource: "ingress"}
  name:
    as: "requests_per_second"
  metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'
```

HPA configuration:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ingress-based-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp-deployment
  minReplicas: 3
  maxReplicas: 25
  metrics:
  - type: Object
    object:
      metric:
        name: requests_per_second
      describedObject:
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        name: webapp-ingress
      target:
        type: Value
        value: "10000"  # Scale when Ingress handles > 10k req/s total
```

## Troubleshooting

**Custom metrics not appearing**:

Check adapter logs:

```bash
kubectl logs -n monitoring deployment/prometheus-adapter
```

Look for errors parsing rules or querying Prometheus.

**Metrics showing as `<unknown>` in HPA**:

Verify the metric name matches exactly:

```bash
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second" | jq '.items[].metricName'
```

**HPA not scaling**:

Check HPA status:

```bash
kubectl describe hpa webapp-custom-hpa
```

Look for warning events like "unable to get metric" or "failed to get pods metric".

## Best Practices

**Use rate functions for counters**: Counter metrics always increase. Use `rate()` or `irate()` in metricsQuery to get per-second rates.

**Choose appropriate time windows**: Longer windows (5m) smooth out spikes but react slower. Shorter windows (1m) react faster but may cause thrashing.

**Set reasonable targets**: Base targets on load testing results. Know your application's capacity per pod before configuring autoscaling.

**Monitor adapter performance**: The adapter queries Prometheus frequently. Ensure Prometheus can handle the load:

```promql
# Query rate from adapter
rate(prometheus_http_requests_total{handler="/api/v1/query"}[5m])
```

**Use label selectors carefully**: Overly broad selectors in seriesQuery can expose too many metrics, increasing API overhead.

Setting up a Custom Metrics API server with Prometheus unlocks sophisticated autoscaling strategies based on application behavior rather than just infrastructure metrics. This enables truly responsive scaling that matches actual user demand.
