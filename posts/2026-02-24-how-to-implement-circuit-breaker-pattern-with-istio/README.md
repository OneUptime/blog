# How to Implement Circuit Breaker Pattern with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Circuit Breaker, Resilience, DestinationRule, Envoy, Microservices

Description: A practical guide to implementing the circuit breaker pattern in Istio using DestinationRules with outlier detection and connection pool limits.

---

The circuit breaker pattern is one of the most important resilience patterns for microservices. When a downstream service starts failing, you want to stop sending it traffic so it can recover, rather than piling on more requests and making things worse. Istio implements circuit breaking through two mechanisms in DestinationRules: connection pool limits and outlier detection.

## Why Circuit Breakers Matter

Without circuit breakers, a failing service causes a cascade effect. Service A calls Service B, which is failing. Service A's threads pile up waiting for responses from Service B. Service A's own callers start timing out. Soon the whole call chain is failing. A circuit breaker stops this cascade by failing fast when the downstream service is unhealthy.

## Connection Pool-Based Circuit Breaking

The first type of circuit breaking in Istio limits the number of connections and requests to a service. When the limits are reached, additional requests are immediately rejected with a 503 instead of being queued:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: service-b-circuit-breaker
  namespace: default
spec:
  host: service-b.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
```

Here is what each setting does:

- **maxConnections: 50** - No more than 50 TCP connections to service-b. The 51st connection attempt triggers the circuit breaker.
- **http1MaxPendingRequests: 25** - For HTTP/1.1, if all 50 connections are busy, up to 25 requests can wait in the queue. The 26th pending request gets a 503.
- **http2MaxRequests: 100** - For HTTP/2, no more than 100 concurrent requests (multiplexed across connections).
- **maxRequestsPerConnection: 10** - After 10 requests on a connection, close it and open a new one.

When the circuit breaker trips, Envoy returns a 503 with the response flag `UO` (upstream overflow). You can see these in access logs:

```bash
kubectl logs deploy/my-app -c istio-proxy | grep "UO"
```

## Outlier Detection-Based Circuit Breaking

Outlier detection is the more sophisticated form of circuit breaking. Instead of limiting resource usage, it monitors the health of individual endpoints and removes unhealthy ones from the load balancing pool:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: service-b-outlier
  namespace: default
spec:
  host: service-b.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

**consecutive5xxErrors: 5** - If an endpoint returns 5 consecutive 5xx responses, it is ejected from the pool.

**interval: 10s** - Envoy checks for outliers every 10 seconds.

**baseEjectionTime: 30s** - The minimum time an ejected endpoint stays out of the pool. On subsequent ejections, this time increases (30s, 60s, 90s, etc.).

**maxEjectionPercent: 50** - At most 50% of endpoints can be ejected at the same time. This prevents the entire service from being ejected if there is a widespread issue.

## Combining Both Approaches

In practice, you want both types of circuit breaking working together:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: service-b-full-cb
  namespace: default
spec:
  host: service-b.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 200
        maxRequestsPerConnection: 100
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 15s
      maxEjectionPercent: 30
```

The connection pool limits act as the "fast" circuit breaker. They trip immediately when resource limits are exceeded. Outlier detection is the "smart" circuit breaker. It identifies and removes unhealthy endpoints based on their error behavior over time.

## Testing the Circuit Breaker

You can test circuit breaking with a simple load test. First, deploy the Istio sample httpbin and fortio (load testing tool):

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/httpbin.yaml
```

Apply a restrictive circuit breaker:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: httpbin-cb
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1
      http:
        http1MaxPendingRequests: 1
        maxRequestsPerConnection: 1
    outlierDetection:
      consecutive5xxErrors: 1
      interval: 1s
      baseEjectionTime: 3m
      maxEjectionPercent: 100
```

Then send traffic from a test pod:

```bash
kubectl exec deploy/fortio -- fortio load -c 3 -qps 0 -n 30 -loglevel Warning http://httpbin:8000/get
```

With `maxConnections: 1` and `http1MaxPendingRequests: 1`, sending 3 concurrent requests should trigger the circuit breaker. You will see some requests succeed (200) and some fail (503).

Check the stats to confirm:

```bash
kubectl exec deploy/fortio -c istio-proxy -- curl -s localhost:15000/stats | grep httpbin | grep pending
```

Look for `upstream_rq_pending_overflow` to see how many requests were rejected by the circuit breaker.

## Monitoring Circuit Breaker Activity

Set up monitoring to know when circuit breakers are tripping:

```promql
# Connection pool overflow (circuit breaker trips)
rate(envoy_cluster_upstream_rq_pending_overflow{cluster_name=~"outbound.*service-b.*"}[5m])

# Ejected endpoints from outlier detection
envoy_cluster_outlier_detection_ejections_active{cluster_name=~"outbound.*service-b.*"}

# Total ejection events
rate(envoy_cluster_outlier_detection_ejections_total{cluster_name=~"outbound.*service-b.*"}[5m])
```

Create alerts for circuit breaker activity:

```yaml
groups:
- name: circuit-breaker
  rules:
  - alert: CircuitBreakerTripping
    expr: rate(envoy_cluster_upstream_rq_pending_overflow[5m]) > 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Circuit breaker tripping for {{ $labels.cluster_name }}"

  - alert: EndpointsEjected
    expr: envoy_cluster_outlier_detection_ejections_active > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Endpoints ejected from {{ $labels.cluster_name }}"
```

## Circuit Breakers Per Subset

You can configure different circuit breaker settings for different service versions:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: service-b-versioned-cb
spec:
  host: service-b
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 50
      outlierDetection:
        consecutive5xxErrors: 3
        interval: 5s
        baseEjectionTime: 60s
  - name: v2
    labels:
      version: v2
```

In this example, v1 has stricter circuit breaker settings (lower connection limit, fewer errors before ejection, longer ejection time) while v2 inherits the default settings.

## Tuning Circuit Breaker Thresholds

Getting the thresholds right is an iterative process. Here are some guidelines:

**Connection pool limits**: Start by understanding your service's actual concurrency. If your service can handle 200 concurrent requests, set `maxConnections` slightly above that (maybe 250) and `http1MaxPendingRequests` to handle burst traffic.

**Outlier detection**: Be conservative with `consecutive5xxErrors`. Setting it to 1 means a single error ejects an endpoint, which can be too aggressive for services that occasionally return transient errors. 3-5 is a more practical starting point.

**Ejection time**: Start with 30 seconds. This gives the endpoint time to recover without being out of the pool for too long.

**Max ejection percent**: 50% is a reasonable default. Setting it to 100% risks ejecting all endpoints and leaving you with no backends at all.

```bash
# Watch circuit breaker stats in real time
watch -n 1 "kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep -E 'pending_overflow|ejection'"
```

Circuit breakers are a must-have for production microservices. They prevent cascading failures, protect downstream services from being overwhelmed, and give failing services time to recover. Start with reasonable defaults, monitor the circuit breaker activity, and tune the thresholds based on your actual traffic patterns.
