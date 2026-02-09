# How to Configure HPA with Custom Metrics from Prometheus Adapter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Prometheus

Description: Set up Horizontal Pod Autoscaler with custom application metrics from Prometheus using the Prometheus Adapter to enable autoscaling based on business metrics beyond CPU and memory.

---

CPU and memory metrics work well for many workloads, but sometimes you need to scale based on application-specific metrics like request queue depth, processing latency, or active connections. The Prometheus Adapter exposes Prometheus metrics as Kubernetes custom metrics, allowing HPA to scale based on any metric your application exports.

This enables autoscaling decisions that directly reflect your application's behavior and user experience. Instead of scaling when CPU reaches 80%, you can scale when request latency exceeds 100ms or when queue depth grows beyond 50 items per pod.

## Understanding Prometheus Adapter

The Prometheus Adapter queries Prometheus for metric values and exposes them through the Kubernetes custom metrics API. HPA can then consume these metrics just like built-in resource metrics, but the values come from your application instrumentation rather than Kubernetes metrics server.

The adapter uses configuration rules to map Prometheus queries to Kubernetes custom metrics. You define which metrics to expose, how to query them, and how to associate them with Kubernetes resources like pods or namespaces.

## Installing Prometheus Adapter

First, ensure you have Prometheus running in your cluster and collecting metrics from your applications. Then install the Prometheus Adapter using Helm.

```bash
# Add the Prometheus community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus Adapter
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.url=http://prometheus-server.monitoring.svc \
  --set prometheus.port=80

# Verify installation
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus-adapter

# Check that custom metrics API is available
kubectl get apiservices | grep custom.metrics
```

The adapter should register itself with the Kubernetes API server, making custom metrics available cluster-wide.

## Configuring Custom Metrics Rules

Define rules in the Prometheus Adapter configuration to expose your application metrics.

```yaml
# prometheus-adapter-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-adapter
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

    # Expose request queue depth per pod
    - seriesQuery: 'request_queue_depth{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "request_queue_depth"
      metricsQuery: 'avg_over_time(<<.Series>>{<<.LabelMatchers>>}[2m])'

    # Expose request latency p95 per pod
    - seriesQuery: 'http_request_duration_seconds{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "http_request_latency_p95"
      metricsQuery: 'histogram_quantile(0.95, rate(<<.Series>>_bucket{<<.LabelMatchers>>}[2m]))'

    # Expose active connections per pod
    - seriesQuery: 'active_connections{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        as: "active_connections"
      metricsQuery: 'avg_over_time(<<.Series>>{<<.LabelMatchers>>}[2m])'
```

Apply this configuration.

```bash
kubectl apply -f prometheus-adapter-config.yaml

# Restart adapter to pick up new config
kubectl rollout restart deployment prometheus-adapter -n monitoring

# Wait for adapter to be ready
kubectl rollout status deployment prometheus-adapter -n monitoring
```

## Verifying Custom Metrics

Check that your custom metrics are available through the Kubernetes API.

```bash
# List all available custom metrics
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq .

# Check specific metric for a namespace
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/request_queue_depth" | jq .

# View metric values
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second" | jq '.items[] | {pod: .describedObject.name, value: .value}'
```

If you don't see your metrics, check the Prometheus Adapter logs for errors.

```bash
kubectl logs -n monitoring deployment/prometheus-adapter
```

## Creating HPA with Custom Metrics

Now configure HPA to use your custom metrics for scaling decisions.

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
    name: api-server
  minReplicas: 3
  maxReplicas: 50

  metrics:
  # Scale based on request rate
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"

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

This HPA scales the deployment to maintain an average of 100 requests per second per pod. When the average exceeds 100, HPA scales up. When it falls below 100, HPA scales down.

## Scaling Based on Queue Depth

For queue-based workloads, scale based on the number of pending items.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: queue-depth-hpa
  namespace: workers
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-worker
  minReplicas: 2
  maxReplicas: 100

  metrics:
  # Scale based on queue depth per pod
  - type: Pods
    pods:
      metric:
        name: request_queue_depth
      target:
        type: AverageValue
        averageValue: "20"

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 10
        periodSeconds: 60
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 20
        periodSeconds: 180
```

This configuration scales workers to maintain approximately 20 queued items per pod, ensuring queue processing keeps pace with incoming work.

## Using Latency Metrics for Scaling

Scale based on request latency to maintain user experience.

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
    name: web-app
  minReplicas: 5
  maxReplicas: 50

  metrics:
  # Scale when p95 latency exceeds threshold
  - type: Pods
    pods:
      metric:
        name: http_request_latency_p95
      target:
        type: AverageValue
        averageValue: "100m"  # 100 milliseconds

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
        periodSeconds: 120
```

When p95 latency exceeds 100ms, HPA scales up to reduce load per pod and improve response times.

## Combining Multiple Custom Metrics

Use multiple metrics together for more sophisticated scaling logic.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-metric-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app-server
  minReplicas: 10
  maxReplicas: 100

  metrics:
  # Scale based on request rate
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "50"

  # Also scale based on active connections
  - type: Pods
    pods:
      metric:
        name: active_connections
      target:
        type: AverageValue
        averageValue: "100"

  # And consider CPU
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

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
        periodSeconds: 120
```

HPA calculates desired replicas for each metric and uses the highest value, ensuring the deployment scales to satisfy all constraints.

## Exposing Application Metrics

Your application needs to export metrics in Prometheus format.

```python
# Python example with prometheus_client
from prometheus_client import Counter, Gauge, Histogram, start_http_server
import time

# Define metrics
http_requests = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
queue_depth = Gauge('request_queue_depth', 'Current request queue depth')
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')
active_conns = Gauge('active_connections', 'Number of active connections')

# Start metrics server
start_http_server(8000)

# Update metrics in your application code
def handle_request(method, endpoint):
    http_requests.labels(method=method, endpoint=endpoint).inc()
    active_conns.inc()

    start = time.time()
    # Process request
    duration = time.time() - start
    request_duration.observe(duration)

    active_conns.dec()

def update_queue_metrics(depth):
    queue_depth.set(depth)
```

Ensure Prometheus scrapes these metrics from your pods.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-server
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
spec:
  containers:
  - name: app
    image: app:latest
    ports:
    - containerPort: 8000
      name: metrics
```

## Debugging Custom Metrics Scaling

When HPA doesn't scale as expected, debug the metrics pipeline.

```bash
# Check if adapter sees the metric in Prometheus
kubectl logs -n monitoring deployment/prometheus-adapter | grep request_queue

# Verify metric values through custom metrics API
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/request_queue_depth" | jq .

# Check HPA status
kubectl describe hpa queue-depth-hpa

# View current metric values that HPA sees
kubectl get hpa queue-depth-hpa -o json | jq '.status.currentMetrics'
```

Common issues include incorrect PromQL queries in adapter config, metrics not being scraped by Prometheus, or label mismatches between Prometheus and Kubernetes resources.

## Optimizing Metric Queries

Write efficient PromQL queries to reduce load on Prometheus.

```yaml
rules:
# Efficient: Uses rate() over appropriate window
- seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
  metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'

# Less efficient: Calculates rate per second with increase()
# - metricsQuery: 'increase(<<.Series>>{<<.LabelMatchers>>}[1m])/60'

# Good: Aggregates before calculating percentile
- seriesQuery: 'http_request_duration_seconds{namespace!="",pod!=""}'
  metricsQuery: 'histogram_quantile(0.95, rate(<<.Series>>_bucket{<<.LabelMatchers>>}[2m]))'
```

Use rate windows that match your HPA evaluation period, typically 1-5 minutes.

## Best Practices

Choose metrics that directly reflect your application's capacity constraints. If your app is limited by database connections, scale based on active connections. If it's compute-bound, use request processing time.

Set target values based on observed behavior under load testing. Don't guess - measure actual metric values at different load levels to determine appropriate thresholds.

Use the same time window in your PromQL queries as your HPA stabilization window. This ensures metrics are averaged over an appropriate period.

Monitor both your custom metrics and HPA behavior in production. Set up alerts for when HPA reaches min or max replicas, which indicates scaling constraints.

Document your custom metrics and scaling thresholds. Future team members need to understand why specific metrics were chosen and what the target values mean.

## Conclusion

The Prometheus Adapter enables powerful autoscaling strategies based on application-specific metrics that better reflect your workload characteristics than generic CPU and memory metrics. By exposing Prometheus metrics through the Kubernetes custom metrics API, you can scale based on business-relevant signals like request rate, queue depth, or latency.

Proper configuration of the Prometheus Adapter, combined with well-chosen metrics and appropriate HPA policies, creates autoscaling systems that maintain performance while efficiently using cluster resources. The key is selecting metrics that accurately represent your application's capacity and setting target values based on real-world testing and observation.
