# How to Use HPA with Pods Metrics for Scaling on Custom Pod Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Metrics

Description: Configure Horizontal Pod Autoscaler with pods metrics type to scale based on custom per-pod metrics like request rate, connection count, or application-specific performance indicators.

---

The Pods metric type in HPA allows scaling based on custom metrics that are averaged across all pods in your deployment. Unlike Object metrics which reference a single Kubernetes object, Pods metrics aggregate values from every pod. This makes them perfect for scaling based on per-pod application metrics like requests per second, active connections, queue items processed, or any other metric your application exposes.

Pods metrics work well when your scaling decision should reflect the average workload across your pod fleet. If each pod handles 100 requests per second on average and you want to maintain that level, Pods metrics automatically calculate how many pods you need based on total traffic. When traffic doubles, HPA doubles your pods to maintain the target average.

## Understanding Pods Metrics

Pods metrics use the custom metrics API to retrieve metric values from each pod, calculate the average, and compare it to your target. The metric must be associated with pods through labels, allowing the metrics API to attribute values to specific pods.

Your application exports metrics in Prometheus format, Prometheus scrapes them, and a metrics adapter like the Prometheus Adapter exposes them through the Kubernetes custom metrics API. HPA queries this API to get average metric values across all pods.

## Exposing Application Metrics

Start by instrumenting your application to export custom metrics.

```python
# Python Flask example with prometheus_client
from flask import Flask
from prometheus_client import Counter, Gauge, Histogram, generate_latest, REGISTRY
import time

app = Flask(__name__)

# Define custom metrics
request_counter = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
active_connections = Gauge('active_connections', 'Number of active connections')
request_duration = Histogram('http_request_duration_seconds', 'Request duration', ['endpoint'])
queue_size = Gauge('local_queue_size', 'Number of items in local processing queue')

@app.before_request
def before_request():
    active_connections.inc()
    request.start_time = time.time()

@app.after_request
def after_request(response):
    active_connections.dec()
    duration = time.time() - request.start_time
    request_duration.labels(endpoint=request.path).observe(duration)
    request_counter.labels(method=request.method, endpoint=request.path, status=response.status_code).inc()
    return response

@app.route('/metrics')
def metrics():
    return generate_latest(REGISTRY)

@app.route('/api/data')
def get_data():
    # Your application logic
    return {'data': 'response'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Deploy with appropriate labels and annotations for Prometheus scraping.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: api
        image: web-api:v1.0
        ports:
        - containerPort: 8080
          name: http
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

## Configuring Prometheus Adapter

Configure the Prometheus Adapter to expose your custom metrics as Pods metrics.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
    # Expose request rate per pod
    - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total$"
        as: "${1}_per_second"
      metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'

    # Expose active connections per pod
    - seriesQuery: 'active_connections{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "active_connections"
      metricsQuery: 'avg_over_time(<<.Series>>{<<.LabelMatchers>>}[2m])'

    # Expose local queue size per pod
    - seriesQuery: 'local_queue_size{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "local_queue_size"
      metricsQuery: 'avg_over_time(<<.Series>>{<<.LabelMatchers>>}[2m])'
```

Apply and restart the adapter.

```bash
kubectl apply -f prometheus-adapter-config.yaml
kubectl rollout restart deployment prometheus-adapter -n monitoring

# Verify metrics are available
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second" | jq .
```

## Creating HPA with Pods Metrics

Configure HPA to scale based on request rate per pod.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: request-rate-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-api
  minReplicas: 5
  maxReplicas: 100

  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "50"  # Target 50 requests per second per pod

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 120
```

Apply and monitor.

```bash
kubectl apply -f hpa.yaml
kubectl get hpa request-rate-hpa -n production -w
```

When average requests per pod exceed 50, HPA scales up to bring the average back to target.

## Scaling on Connection Count

Scale based on active connections to prevent overload.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: connection-based-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: websocket-server
  minReplicas: 10
  maxReplicas: 200

  metrics:
  - type: Pods
    pods:
      metric:
        name: active_connections
      target:
        type: AverageValue
        averageValue: "500"  # Target 500 connections per pod

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Pods
        value: 20
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 180
```

This prevents any single pod from being overwhelmed by too many connections.

## Combining Multiple Pods Metrics

Use multiple custom metrics for sophisticated scaling.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-pod-metric-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: processing-service
  minReplicas: 10
  maxReplicas: 150

  metrics:
  # Scale on request rate
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"

  # Scale on queue size
  - type: Pods
    pods:
      metric:
        name: local_queue_size
      target:
        type: AverageValue
        averageValue: "50"

  # Scale on CPU
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 90
      policies:
      - type: Percent
        value: 75
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 15
        periodSeconds: 180
```

HPA calculates desired replicas for each metric and uses the maximum.

## Scaling on Processing Latency

Use latency metrics to maintain performance.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: latency-aware-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-backend
  minReplicas: 10
  maxReplicas: 100

  metrics:
  - type: Pods
    pods:
      metric:
        name: http_request_duration_p95_seconds
      target:
        type: AverageValue
        averageValue: "0.2"  # Target 200ms p95 latency

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 300
```

This scales up when latency degrades, maintaining user experience.

## Monitoring Pods Metrics Scaling

Track metric values and scaling behavior.

```bash
# View current pod metrics
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second" | jq '.items[] | {pod: .describedObject.name, value: .value}'

# Check HPA status
kubectl describe hpa request-rate-hpa -n production

# View scaling events
kubectl get events -n production --field-selector involvedObject.name=request-rate-hpa

# Monitor metrics over time
watch -n 5 'kubectl get hpa request-rate-hpa -n production -o json | jq ".status.currentMetrics"'
```

## Best Practices

Choose metrics that directly represent your application's capacity. If your app is limited by concurrent requests it can handle, scale on request rate or active connections.

Set target values based on load testing. Don't guess what "good" throughput per pod looks like - measure it under realistic conditions.

Use 2-minute time windows in Prometheus queries to match typical HPA evaluation periods and smooth out momentary spikes.

Combine custom metrics with resource metrics. Even if you scale on request rate, monitor CPU and memory to catch unexpected resource pressure.

Label your metrics consistently. The Prometheus Adapter needs namespace and pod labels to map metrics to Kubernetes pods correctly.

Test metric availability before deploying HPA. Ensure Prometheus is scraping your pods and the adapter is exposing metrics through the custom metrics API.

## Troubleshooting

**Metrics show unknown**: Verify Prometheus is scraping your pods and metrics are being exported.

```bash
kubectl port-forward -n production deployment/web-api 8080:8080
curl http://localhost:8080/metrics | grep http_requests_total
```

**HPA doesn't scale**: Check if current metric value actually exceeds target.

```bash
kubectl get hpa request-rate-hpa -o json | jq '.status.currentMetrics'
```

**Scaling is too aggressive**: Increase stabilization windows or reduce policy values.

**Metrics seem wrong**: Verify PromQL queries in adapter configuration return expected values.

```bash
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
# Visit http://localhost:9090 and test queries
```

## Conclusion

Pods metrics provide application-aware autoscaling based on custom per-pod metrics that better represent your workload's capacity than generic CPU or memory metrics. By instrumenting your application to export meaningful metrics, configuring the Prometheus Adapter to expose them through Kubernetes, and setting appropriate HPA targets, you create autoscaling systems that scale based on actual application behavior rather than resource utilization proxies. This results in more responsive scaling that maintains performance while efficiently using cluster resources.
