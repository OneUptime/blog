# How to Implement HPA with Rate-Based Metrics for Request Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Metrics

Description: Implement Horizontal Pod Autoscaler with rate-based metrics like requests per second, transactions per minute, or events per hour to scale based on actual workload throughput.

---

Rate-based metrics measure how much work your application processes over time. Unlike static metrics like CPU utilization or memory usage, rate metrics directly represent throughput: requests per second, messages processed per minute, or transactions per hour. Scaling on rate metrics ensures you maintain consistent processing capacity regardless of how resource-intensive each request happens to be.

A request that returns cached data uses minimal CPU, while a request that performs complex calculations might max out a core. If you scale only on CPU, you'll have different capacity at different times. Scaling on request rate ensures consistent throughput regardless of the work involved in each request, providing more predictable performance for users.

## Understanding Rate Metrics

Rate metrics calculate change over time using functions like Prometheus's rate() which computes per-second average increase of a counter over a time window. Your application exports cumulative counters, and the monitoring system calculates rates from them.

For HPA to use rate metrics, you need a metrics adapter that exposes these calculated rates through the Kubernetes custom metrics API. The Prometheus Adapter is commonly used for this purpose, transforming PromQL rate queries into HPA-compatible metrics.

## Exporting Request Counters

Instrument your application to count requests.

```go
// Go example with prometheus client
package main

import (
    "net/http"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    httpRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )

    httpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
)

func handleRequest(w http.ResponseWriter, r *http.Request) {
    timer := prometheus.NewTimer(httpRequestDuration.WithLabelValues(r.Method, r.URL.Path))
    defer timer.ObserveDuration()

    // Process request
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))

    httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, "200").Inc()
}

func main() {
    http.HandleFunc("/api/data", handleRequest)
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", nil)
}
```

Deploy with Prometheus scraping enabled.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rate-based-app
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: rate-app
  template:
    metadata:
      labels:
        app: rate-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: app
        image: rate-app:v1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

## Configuring Rate Metrics in Prometheus Adapter

Configure the adapter to calculate rates from your counters.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
    # Convert request counter to requests per second
    - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total$"
        as: "${1}_per_second"
      metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'

    # Per-endpoint request rate
    - seriesQuery: 'http_requests_total{namespace!="",pod!="",endpoint!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total$"
        as: "${1}_per_second_by_endpoint"
      metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>, endpoint)'
```

Apply and verify.

```bash
kubectl apply -f prometheus-adapter-config.yaml
kubectl rollout restart deployment prometheus-adapter -n monitoring

# Check metrics are available
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second" | jq .
```

## Creating HPA with Rate Metrics

Configure HPA to scale on request rate.

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
    name: rate-based-app
  minReplicas: 5
  maxReplicas: 100

  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"  # Target 100 requests/sec per pod

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 10
        periodSeconds: 60
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 120
```

This maintains approximately 100 requests per second per pod by scaling up when traffic increases.

## Scaling on Transaction Rate

For transaction-based systems, scale on transactions per minute.

```yaml
# Prometheus adapter rule for transaction rate
rules:
- seriesQuery: 'transactions_completed_total{namespace!="",pod!=""}'
  resources:
    overrides:
      namespace: {resource: "namespace"}
      pod: {resource: "pod"}
  name:
    as: "transactions_per_minute"
  metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[5m])) by (<<.GroupBy>>) * 60'
---
# HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: transaction-rate-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: transaction-processor
  minReplicas: 10
  maxReplicas: 200
  metrics:
  - type: Pods
    pods:
      metric:
        name: transactions_per_minute
      target:
        type: AverageValue
        averageValue: "500"  # Target 500 transactions/min per pod
```

## Combining Rate and Latency Metrics

Scale on both throughput and performance.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rate-and-latency-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: api-service
  minReplicas: 10
  maxReplicas: 100

  metrics:
  # Scale on request rate
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "80"

  # Also scale on p95 latency
  - type: Pods
    pods:
      metric:
        name: http_request_duration_p95_seconds
      target:
        type: AverageValue
        averageValue: "0.15"  # 150ms

  # And monitor CPU as backstop
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 10
        periodSeconds: 180
```

This ensures consistent throughput while maintaining latency SLAs.

## Rate-Based Scaling for Message Processing

Scale workers based on message processing rate.

```yaml
# Prometheus adapter configuration
rules:
- seriesQuery: 'messages_processed_total{namespace!="",pod!=""}'
  resources:
    overrides:
      namespace: {resource: "namespace"}
      pod: {resource: "pod"}
  name:
    as: "messages_per_second"
  metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[3m])) by (<<.GroupBy>>)'
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: message-processor-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: message-worker
  minReplicas: 5
  maxReplicas: 150
  metrics:
  - type: Pods
    pods:
      metric:
        name: messages_per_second
      target:
        type: AverageValue
        averageValue: "10"  # Target 10 messages/sec per pod
```

## Monitoring Rate-Based Scaling

Track throughput and scaling relationship.

```bash
# View current request rate per pod
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/production/pods/*/http_requests_per_second" | jq '.items[] | {pod: .describedObject.name, rps: .value}'

# Check HPA scaling decisions
kubectl describe hpa request-rate-hpa -n production

# Monitor total throughput
kubectl get hpa request-rate-hpa -o json | jq '{
  replicas: .status.currentReplicas,
  targetRps: .spec.metrics[0].pods.target.averageValue,
  currentRps: .status.currentMetrics[0].pods.current.averageValue
}'

# Calculate total cluster throughput
watch -n 5 'kubectl get hpa request-rate-hpa -o json | jq "(.status.currentReplicas | tonumber) * (.status.currentMetrics[0].pods.current.averageValue | tonumber)"'
```

## Setting Appropriate Rate Targets

Determine target rates through load testing.

```bash
# Load test to find per-pod capacity
kubectl run load-test --image=williamyeh/hey --rm -it -- \
  hey -c 50 -z 5m http://rate-based-app.production.svc.cluster.local

# Monitor pods during test
kubectl top pods -n production -l app=rate-app

# Note at what request rate CPU or latency degrades
# Set HPA target to 70-80% of maximum observed rate
```

## Best Practices

Use rate windows (2-5 minutes) that match your traffic variability and HPA evaluation period. Longer windows smooth spikes, shorter windows enable faster response.

Set rate targets based on load testing that identifies your per-pod capacity. Don't guess - measure the request rate each pod can sustain while maintaining acceptable latency.

Combine rate metrics with latency metrics to ensure scaling maintains performance. High throughput doesn't help if latency degrades.

Monitor both per-pod rates and total cluster throughput. Ensure total capacity meets your peak traffic requirements.

Use percentile latency metrics (p95, p99) alongside rate metrics to catch performance degradation before it impacts users broadly.

## Troubleshooting

**Rate metrics show zero or very low values**: Verify Prometheus is scraping your application metrics and counters are increasing.

```bash
kubectl port-forward -n production deployment/rate-based-app 8080:8080
curl http://localhost:8080/metrics | grep http_requests_total
```

**HPA scales but rate per pod stays high**: Target might be too aggressive for your application's actual capacity. Adjust target based on observed maximum sustainable rate.

**Scaling lags behind traffic**: Reduce stabilization windows or use more aggressive scale-up policies.

## Conclusion

Rate-based metrics provide application-aware autoscaling that directly reflects your workload's throughput capacity. By scaling on actual requests per second or transactions per minute rather than resource utilization, you maintain consistent performance regardless of the computational cost of individual requests. Combined with latency metrics and appropriate scaling behaviors, rate-based HPA creates responsive autoscaling that keeps user-facing performance stable across varying traffic patterns.
