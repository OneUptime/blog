# How to Configure API Circuit Breaking with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Circuit Breaking, Resilience, DestinationRule, Outlier Detection

Description: How to configure circuit breaking in Istio using DestinationRule to protect your APIs from cascading failures and overloaded backends.

---

Circuit breaking is a resilience pattern that stops sending requests to a service that is failing or overloaded. Instead of letting every request pile up and eventually time out, the circuit breaker trips after a threshold of failures and returns errors immediately. This protects both the failing service (giving it a chance to recover) and the calling service (which gets a fast error instead of a slow timeout). Istio implements circuit breaking through DestinationRule configuration.

## How Circuit Breaking Works in Istio

Istio's circuit breaking has two main components:

**Connection pool limits** - caps on the number of connections and requests to prevent overwhelming a service

**Outlier detection** - automatically removes unhealthy instances from the load balancing pool based on error rates

Together, these give you both proactive protection (connection limits) and reactive protection (ejecting failing pods).

## Basic Circuit Breaking Configuration

Here is a straightforward circuit breaker for an API service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service-circuit-breaker
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Here is what each field does:

- `maxConnections: 100` - maximum 100 TCP connections to the service
- `http1MaxPendingRequests: 50` - maximum 50 requests waiting in queue
- `http2MaxRequests: 100` - maximum 100 active HTTP/2 requests
- `maxRequestsPerConnection: 10` - close the connection after 10 requests (helps with load distribution)
- `maxRetries: 3` - maximum 3 concurrent retries across the entire cluster
- `consecutive5xxErrors: 5` - eject a pod after 5 consecutive 5xx errors
- `interval: 10s` - check for errors every 10 seconds
- `baseEjectionTime: 30s` - eject the pod for at least 30 seconds
- `maxEjectionPercent: 50` - never eject more than 50% of pods (keeps some capacity available)

## Circuit Breaking Per API Version

Apply different circuit breaking settings to different API versions:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  subsets:
    - name: v1
      labels:
        version: v1
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 50
          http:
            http1MaxPendingRequests: 25
            http2MaxRequests: 50
        outlierDetection:
          consecutive5xxErrors: 3
          interval: 10s
          baseEjectionTime: 60s
    - name: v2
      labels:
        version: v2
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 200
          http:
            http1MaxPendingRequests: 100
            http2MaxRequests: 200
        outlierDetection:
          consecutive5xxErrors: 5
          interval: 10s
          baseEjectionTime: 30s
```

The legacy v1 has tighter limits (it is probably running on older infrastructure), while v2 gets more headroom.

## Understanding Connection Pool Settings

### TCP Connection Limits

```yaml
connectionPool:
  tcp:
    maxConnections: 100
    connectTimeout: 5s
    tcpKeepalive:
      time: 7200s
      interval: 75s
      probes: 9
```

`maxConnections` is the absolute ceiling. When this limit is reached, new connection attempts get a 503 error. The `connectTimeout` prevents hanging when the backend is completely unresponsive.

### HTTP Request Limits

```yaml
connectionPool:
  http:
    http1MaxPendingRequests: 50
    http2MaxRequests: 100
    maxRequestsPerConnection: 10
    maxRetries: 3
    idleTimeout: 60s
```

`http1MaxPendingRequests` is the queue size for HTTP/1.1 requests waiting for a connection. When the queue is full, new requests get 503.

`http2MaxRequests` limits concurrent HTTP/2 requests. HTTP/2 multiplexes requests on a single connection, so this is separate from the connection limit.

`maxRetries` limits the total number of concurrent retry operations across all connections to this service. This prevents retry storms.

## Understanding Outlier Detection

Outlier detection is the reactive part of circuit breaking. It watches for unhealthy pods and temporarily removes them from the load balancing pool:

```yaml
outlierDetection:
  consecutive5xxErrors: 5
  interval: 10s
  baseEjectionTime: 30s
  maxEjectionPercent: 50
  minHealthPercent: 30
  splitExternalLocalOriginErrors: true
  consecutiveLocalOriginFailures: 5
  consecutiveGatewayErrors: 5
```

- `consecutive5xxErrors: 5` - how many 5xx errors in a row before ejecting
- `interval: 10s` - how often to check
- `baseEjectionTime: 30s` - base ejection duration (multiplied by the number of times the pod has been ejected)
- `maxEjectionPercent: 50` - never eject more than half of all pods
- `minHealthPercent: 30` - if fewer than 30% of pods are healthy, stop ejecting and let outlier detection pass through (panic mode)
- `consecutiveGatewayErrors: 5` - eject on gateway errors (502, 503, 504) specifically

## Circuit Breaking at the Gateway

Apply circuit breaking at the ingress gateway to protect against external traffic surges:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: frontend-protection
spec:
  host: frontend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        http1MaxPendingRequests: 200
        http2MaxRequests: 500
        maxRetries: 5
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 30
```

## Combining with Retries

Circuit breaking and retries work together. Configure retries in the VirtualService and limits in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - route:
        - destination:
            host: api-service
            port:
              number: 8080
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: 5xx,reset,connect-failure,retriable-4xx
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      http:
        maxRetries: 5
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

The VirtualService says "retry up to 3 times per request." The DestinationRule says "but never have more than 5 concurrent retries happening across all requests." This prevents retry storms.

## Testing Circuit Breaking

Use Fortio (a load testing tool that comes with Istio samples) to test circuit breaking:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/httpbin.yaml

# Normal load - should all succeed
kubectl exec deploy/fortio -- fortio load -c 2 -qps 0 -n 20 http://httpbin:8000/get

# Overload - should trigger circuit breaking
kubectl exec deploy/fortio -- fortio load -c 50 -qps 0 -n 1000 http://httpbin:8000/get
```

Watch for 503 responses in the output. Those are the circuit breaker tripping.

Check the circuit breaker statistics:

```bash
kubectl exec deploy/fortio -c istio-proxy -- pilot-agent request GET stats | grep httpbin | grep pending
```

Look for these metrics:

```
cluster.outbound|8000||httpbin.default.svc.cluster.local.upstream_rq_pending_overflow: 42
cluster.outbound|8000||httpbin.default.svc.cluster.local.upstream_rq_pending_total: 258
```

`upstream_rq_pending_overflow` shows how many requests were rejected by the circuit breaker.

## Monitoring Circuit Breaker Activity

Set up Prometheus alerts for circuit breaker events:

```yaml
groups:
  - name: circuit-breaker-alerts
    rules:
      - alert: CircuitBreakerTripping
        expr: |
          increase(envoy_cluster_upstream_rq_pending_overflow{cluster_name=~"outbound.*"}[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Circuit breaker is rejecting requests for {{ $labels.cluster_name }}"
      - alert: HostEjected
        expr: |
          envoy_cluster_outlier_detection_ejections_active{cluster_name=~"outbound.*"} > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Outlier detection ejected a host from {{ $labels.cluster_name }}"
```

## Practical Guidelines

**Start conservative, then tune**: Begin with generous limits and tighten them based on observed traffic patterns. It is better to have the circuit breaker trip too late than too early.

**Match limits to capacity**: If your service has 3 pods that can each handle 50 concurrent requests, set `http2MaxRequests` to around 150. Leave some headroom but do not set it to 10000.

**Use outlier detection carefully**: If you only have 2 pods and set `maxEjectionPercent: 50`, one failing pod means all traffic goes to the remaining pod. Make sure it can handle the load.

**Test under realistic conditions**: Circuit breaker settings that work in staging might not work in production. Load patterns, pod counts, and network latency all matter.

**Monitor continuously**: Circuit breaker events should be visible in your dashboards and alerting system. A tripping circuit breaker is a signal that something needs attention.

Circuit breaking is one of those features that you set up hoping it will never activate, but when it does, it saves you from a cascading failure that would otherwise take down your entire system. Istio makes it a configuration change rather than a code change, which means you can tune it in production without redeploying.
