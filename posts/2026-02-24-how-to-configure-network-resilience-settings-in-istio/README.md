# How to Configure Network Resilience Settings in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Network Resilience, Circuit Breaking, Retries, Service Mesh, Kubernetes

Description: Complete guide to configuring network resilience in Istio including retries, timeouts, circuit breaking, outlier detection, and rate limiting.

---

Network failures are a fact of life in distributed systems. Services go down, networks partition, and latency spikes happen. Istio gives you a powerful set of tools to make your application resilient to these failures without changing any application code. The sidecar proxy handles retries, timeouts, circuit breaking, and outlier detection automatically.

But these features need tuning. The defaults are conservative, and a misconfigured retry policy can make a bad situation worse by hammering an already struggling service.

## Timeouts

Timeouts are the first line of defense against slow services. Without timeouts, a slow downstream service can cause your entire call chain to hang.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
  namespace: default
spec:
  hosts:
    - payment-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: payment-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 5s
```

This sets a 5-second timeout for all requests to the payment service. If the service doesn't respond within 5 seconds, the sidecar returns a 504 Gateway Timeout to the caller.

Some things to keep in mind about timeouts:

- The timeout includes retry time. If you have 3 retries with a 2-second per-try timeout, your overall timeout should be at least 6 seconds.
- Set timeouts based on your SLO, not on the average response time. If your P99 latency is 2 seconds, a 5-second timeout gives you headroom for spikes.
- Timeouts propagate through the call chain. If Service A calls B with a 5-second timeout, and B calls C with a 3-second timeout, the total time A waits includes B's processing plus the call to C.

## Retries

Retries automatically resend failed requests to another instance of the service. They handle transient failures like network blips and temporary pod unavailability.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: inventory-service
  namespace: default
spec:
  hosts:
    - inventory-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: inventory-service.default.svc.cluster.local
            port:
              number: 8080
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx,reset,connect-failure,retriable-status-codes
        retryRemoteLocalities: true
```

Breaking down the retry settings:

- `attempts: 3` means up to 3 retry attempts (so 4 total tries including the original)
- `perTryTimeout: 2s` gives each individual attempt 2 seconds
- `retryOn` specifies which conditions trigger a retry
- `retryRemoteLocalities: true` allows retries to go to pods in other zones/regions

The `retryOn` conditions you can use:

- `5xx` - Any 5xx response code
- `gateway-error` - 502, 503, 504 responses
- `reset` - Connection resets
- `connect-failure` - Failed to connect to upstream
- `retriable-status-codes` - Custom status codes (configured separately)
- `refused-stream` - Upstream refused the stream (HTTP/2)

Be very careful with retries on non-idempotent operations. Retrying a POST that creates an order could create duplicate orders. Only retry operations that are safe to repeat.

## Circuit Breaking

Circuit breaking prevents cascading failures by stopping requests to unhealthy services before they overwhelm everything.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: catalog-service-cb
  namespace: default
spec:
  host: catalog-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

The connection pool settings act as circuit breaker thresholds:

- `maxConnections: 100` limits the total TCP connections to the service
- `http1MaxPendingRequests: 100` limits pending requests waiting for a connection
- `http2MaxRequests: 1000` limits active requests to the service (HTTP/2)
- `maxRetries: 3` limits concurrent retries

When these limits are hit, new requests get a 503 response immediately instead of being queued. This is the "fast fail" behavior that prevents cascading failures.

## Outlier Detection

Outlier detection is the other half of circuit breaking. While connection pool limits prevent overloading a service, outlier detection identifies and ejects unhealthy individual pods.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: user-service-outlier
  namespace: default
spec:
  host: user-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 15s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

How outlier detection works:

1. Every `interval` seconds, Envoy checks the error rate for each upstream pod
2. If a pod has `consecutive5xxErrors` or more errors in a row, it gets ejected from the load balancing pool
3. The pod stays ejected for `baseEjectionTime`, which increases with each consecutive ejection
4. No more than `maxEjectionPercent` of pods can be ejected at once
5. If the healthy percentage drops below `minHealthPercent`, outlier detection is disabled to prevent ejecting everything

The `minHealthPercent` is an important safety net. If you have 3 pods and 2 are ejected, only 33% are healthy. If `minHealthPercent` is 30%, ejection continues. If it's 50%, ejection stops and traffic is distributed across all pods, including unhealthy ones.

## Combining Resilience Settings

Real-world configurations combine multiple resilience features:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service-vs
  namespace: default
spec:
  hosts:
    - order-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: order-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 10s
      retries:
        attempts: 2
        perTryTimeout: 3s
        retryOn: 5xx,reset,connect-failure
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service-dr
  namespace: default
spec:
  host: order-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 500
        maxRetries: 5
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 40
```

The interaction between these settings matters. The overall timeout (10s) must be larger than the total retry time (2 attempts x 3s per try = 6s). The `maxRetries` in the DestinationRule limits concurrent retries across all requests, while `attempts` in the VirtualService limits retries per request.

## Fault Injection for Testing Resilience

Before your resilience settings face real failures, test them with fault injection:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: test-resilience
  namespace: default
spec:
  hosts:
    - order-service.default.svc.cluster.local
  http:
    - fault:
        delay:
          percentage:
            value: 50
          fixedDelay: 5s
        abort:
          percentage:
            value: 10
          httpStatus: 503
      route:
        - destination:
            host: order-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 10s
      retries:
        attempts: 2
        perTryTimeout: 3s
        retryOn: 5xx
```

This injects a 5-second delay on 50% of requests and returns 503 on 10% of requests. With these faults active, you can verify that your retries, timeouts, and circuit breakers behave as expected.

## Monitoring Resilience Behavior

Check circuit breaker metrics:

```bash
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "upstream_rq_pending_overflow\|upstream_cx_overflow\|ejections"
```

Key metrics to watch:

- `upstream_rq_pending_overflow` - Requests rejected because pending queue was full
- `upstream_cx_overflow` - Connections rejected because max connections was reached
- `upstream_rq_retry` - Number of retries
- `outlier_detection.ejections_active` - Currently ejected endpoints

These metrics tell you whether your resilience settings are too aggressive or too permissive. If you see a lot of overflows, your limits might be too low. If you never see any, they might be too high to provide meaningful protection.

Network resilience in Istio is about finding the right balance. Too aggressive and you reject legitimate traffic. Too permissive and you let failures cascade. Start with moderate settings, monitor the metrics, and adjust based on real traffic patterns.
