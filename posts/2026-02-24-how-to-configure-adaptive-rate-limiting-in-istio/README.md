# How to Configure Adaptive Rate Limiting in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Adaptive, Envoy, Traffic Management

Description: How to implement adaptive rate limiting in Istio that dynamically adjusts limits based on backend health, latency, and real-time traffic patterns.

---

Static rate limits have an obvious problem: traffic patterns change. What works during normal hours might be too restrictive during a traffic spike, or too generous when your backend is degraded. Adaptive rate limiting adjusts limits dynamically based on the current state of your system. Istio does not have a built-in adaptive rate limiter, but you can build one using a combination of Envoy features and external components.

## What Makes Rate Limiting "Adaptive"

Traditional rate limiting says "allow 100 requests per minute, period." Adaptive rate limiting says "allow up to 100 requests per minute when the backend is healthy, but reduce to 30 when latency spikes." The limit adjusts based on signals like:

- Backend response latency (p99, p95)
- Error rate (5xx responses)
- Queue depth or connection count
- CPU and memory utilization

## Approach 1: Circuit Breaking as Adaptive Rate Limiting

Istio's circuit breaking is inherently adaptive. It limits based on real-time connection and request metrics rather than fixed counters:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: adaptive-backend
  namespace: default
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

This configuration does several adaptive things:

- `maxConnections: 100` limits concurrent TCP connections. When the backend is slow and connections pile up, new requests get rejected.
- `http1MaxPendingRequests: 50` limits the queue depth. When the backend cannot keep up, excess requests fail fast instead of waiting.
- `outlierDetection` ejects unhealthy pods. If a pod returns 5 consecutive 5xx errors, it gets removed from the load balancing pool for 30 seconds.

The adaptive part is that these limits respond to real-time conditions. When the backend is fast, connections cycle quickly and high throughput is possible. When the backend slows down, connections accumulate and the limits kick in earlier.

## Approach 2: Custom Rate Limit Controller

For true adaptive rate limiting, build a controller that watches metrics and updates rate limit configurations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: adaptive-ratelimit-controller
  namespace: rate-limit
spec:
  replicas: 1
  selector:
    matchLabels:
      app: adaptive-controller
  template:
    metadata:
      labels:
        app: adaptive-controller
    spec:
      serviceAccountName: adaptive-controller
      containers:
      - name: controller
        image: myregistry/adaptive-ratelimit-controller:v1
        env:
        - name: PROMETHEUS_URL
          value: http://prometheus.monitoring.svc.cluster.local:9090
        - name: CONFIGMAP_NAME
          value: ratelimit-config
        - name: CONFIGMAP_NAMESPACE
          value: rate-limit
        - name: CHECK_INTERVAL
          value: "30"
```

The controller logic in Python:

```python
import requests
import time
from kubernetes import client, config

config.load_incluster_config()
v1 = client.CoreV1Api()

PROMETHEUS_URL = "http://prometheus.monitoring.svc.cluster.local:9090"
BASE_LIMIT = 100
MIN_LIMIT = 10
MAX_LIMIT = 500

def get_p99_latency(service_name):
    query = f'histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{{destination_service="{service_name}"}}[5m])) by (le))'
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    result = resp.json()["data"]["result"]
    if result:
        return float(result[0]["value"][1])
    return 0

def get_error_rate(service_name):
    query = f'sum(rate(istio_requests_total{{destination_service="{service_name}", response_code=~"5.."}}[5m])) / sum(rate(istio_requests_total{{destination_service="{service_name}"}}[5m]))'
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    result = resp.json()["data"]["result"]
    if result:
        return float(result[0]["value"][1])
    return 0

def calculate_limit(p99_latency, error_rate):
    limit = BASE_LIMIT
    if p99_latency > 1000:
        limit = int(limit * 0.3)
    elif p99_latency > 500:
        limit = int(limit * 0.5)
    elif p99_latency > 200:
        limit = int(limit * 0.8)
    elif p99_latency < 50:
        limit = int(limit * 2)

    if error_rate > 0.1:
        limit = int(limit * 0.5)
    elif error_rate > 0.05:
        limit = int(limit * 0.7)

    return max(MIN_LIMIT, min(MAX_LIMIT, limit))

def update_configmap(limit):
    config_data = f"""domain: api-gateway
descriptors:
- key: generic_key
  value: default
  rate_limit:
    unit: minute
    requests_per_unit: {limit}
"""
    body = client.V1ConfigMap(
        data={"config.yaml": config_data}
    )
    v1.patch_namespaced_config_map("ratelimit-config", "rate-limit", body)

while True:
    p99 = get_p99_latency("backend-service.default.svc.cluster.local")
    errors = get_error_rate("backend-service.default.svc.cluster.local")
    new_limit = calculate_limit(p99, errors)
    update_configmap(new_limit)
    print(f"Updated limit to {new_limit} (p99={p99}ms, error_rate={errors:.2%})")
    time.sleep(30)
```

## Approach 3: Envoy Adaptive Concurrency Filter

Envoy has an experimental adaptive concurrency filter that uses a gradient algorithm to dynamically adjust the allowed concurrency:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: adaptive-concurrency
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.adaptive_concurrency
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.adaptive_concurrency.v3.AdaptiveConcurrency
          gradient_controller_config:
            sample_aggregate_percentile:
              value: 90
            concurrency_limit_params:
              max_concurrency_limit: 1000
              concurrency_update_interval: 0.5s
            min_rtt_calc_params:
              interval: 30s
              request_count: 50
          enabled:
            default_value: true
```

This filter works by:

1. Measuring the minimum round-trip time (minRTT) during normal operation
2. Comparing current latency to the minRTT
3. If latency increases significantly above minRTT, reducing the concurrency limit
4. If latency is close to minRTT, increasing the concurrency limit

The `sample_aggregate_percentile` at 90 means it uses the p90 latency. The `concurrency_update_interval` of 0.5s means it adjusts the limit every half second.

## Combining Adaptive Approaches

The most robust setup combines multiple adaptive mechanisms:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: robust-backend
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        http2MaxRequests: 200
        maxRequestsPerConnection: 20
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

Layer the adaptive concurrency filter on top of circuit breaking. The circuit breaker handles hard limits and outlier detection, while the adaptive concurrency filter fine-tunes the allowed throughput based on latency.

## Monitoring Adaptive Behavior

Track how limits are changing over time. For the adaptive concurrency filter, check the stats:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats | grep adaptive_concurrency
```

Look for:

```
http.adaptive_concurrency.gradient_controller.min_rtt_msecs: 5
http.adaptive_concurrency.gradient_controller.limit: 150
http.adaptive_concurrency.gradient_controller.burst_queue_size: 15
http.adaptive_concurrency.rq_blocked: 42
```

The `limit` value shows the current dynamic concurrency limit. Plot this over time in Grafana to see how it responds to traffic changes.

## Testing Adaptive Behavior

Simulate backend degradation and watch the limits adjust:

```bash
# In one terminal, generate steady traffic
kubectl exec deploy/sleep -- sh -c 'while true; do curl -s -o /dev/null -w "%{http_code}\n" http://backend-service:8080/api; done'

# In another terminal, add artificial latency to the backend
kubectl exec deploy/backend-service -- sh -c 'tc qdisc add dev eth0 root netem delay 200ms'
```

Watch the adaptive concurrency stats drop as latency increases:

```bash
watch -n 1 "kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats | grep adaptive_concurrency"
```

## Summary

Adaptive rate limiting in Istio can be achieved through several approaches: circuit breaking with outlier detection for connection-level adaptation, the adaptive concurrency filter for latency-based dynamic limits, and custom controllers that watch Prometheus metrics and update rate limit configurations. The best production setup combines these approaches in layers, providing both hard safety limits through circuit breaking and dynamic throughput tuning through adaptive concurrency. Start with circuit breaking (which most people should have anyway) and add the adaptive concurrency filter for services where latency sensitivity is critical.
