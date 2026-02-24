# How to Set Up Overflow Load Balancing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Overflow, Traffic Management, Kubernetes

Description: Set up overflow load balancing in Istio to handle traffic spikes by routing excess traffic to secondary service pools.

---

Traffic spikes happen. A flash sale starts, a viral tweet links to your app, or a batch job kicks off and suddenly your primary service pool is overwhelmed. Overflow load balancing is the pattern where you route excess traffic to a secondary pool when the primary pool can't keep up. Istio doesn't have a single "overflow" toggle, but you can build this behavior using a combination of connection limits, outlier detection, retries, and weighted routing.

## The Overflow Pattern

The basic idea is this: you have a primary pool of endpoints that handles normal traffic. When those endpoints become saturated (too many connections, too many errors, or too slow), traffic overflows to a secondary pool. The secondary pool might be a different deployment, a different version, a different region, or even a degraded-mode service that returns cached responses.

## Setting Up Connection Limits for Overflow

The foundation of overflow behavior is connection pooling. When you set hard limits on connections and pending requests, Envoy starts returning 503 errors once those limits are hit. You can then use retries and alternative routes to redirect that overflow traffic.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service-dr
  namespace: default
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 15s
      maxEjectionPercent: 50
    loadBalancer:
      simple: LEAST_REQUEST
```

With `maxConnections: 50`, each pod can handle at most 50 concurrent TCP connections. `http1MaxPendingRequests: 100` limits the queue of requests waiting for a connection. Once these limits are hit, Envoy returns 503s, which triggers the overflow logic.

## Overflow with Weighted Routing

One approach to overflow is using weighted routing with a VirtualService that retries on a different subset:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service-dr
  namespace: default
spec:
  host: api-service
  subsets:
    - name: primary
      labels:
        tier: primary
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 50
          http:
            http1MaxPendingRequests: 100
        outlierDetection:
          consecutive5xxErrors: 3
          interval: 5s
          baseEjectionTime: 15s
    - name: overflow
      labels:
        tier: overflow
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 200
          http:
            http1MaxPendingRequests: 500
```

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service-vs
  namespace: default
spec:
  hosts:
    - api-service
  http:
    - route:
        - destination:
            host: api-service
            subset: primary
          weight: 100
      retries:
        attempts: 2
        retryOn: 5xx,reset,connect-failure,retriable-4xx
      timeout: 5s
```

When the primary pool gets overloaded and returns 503s, the retry logic kicks in. But the problem with this approach is that retries go back to the same service, which might still be overloaded.

## Overflow Using Fault Injection and Fallback

A better pattern uses a fallback route. You can configure this with multiple route entries:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service-vs
  namespace: default
spec:
  hosts:
    - api-service
  http:
    - match:
        - headers:
            x-overflow:
              exact: "true"
      route:
        - destination:
            host: api-service
            subset: overflow
    - route:
        - destination:
            host: api-service
            subset: primary
          weight: 100
      retries:
        attempts: 1
        retryOn: 5xx,connect-failure
```

Your application or a middleware can set the `x-overflow` header when it detects that the primary service is struggling.

## Locality-Based Overflow

Istio's locality failover is actually a form of overflow routing. When local endpoints are unhealthy, traffic overflows to endpoints in other zones or regions:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service-dr
  namespace: default
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 70
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-east-1
            to: us-west-2
          - from: us-west-2
            to: us-east-1
      simple: LEAST_REQUEST
```

When endpoints in us-east-1 become unhealthy (through outlier detection or connection limit failures), traffic overflows to us-west-2. This is a clean, automatic overflow mechanism that doesn't require any application-level changes.

## Overflow to a Degraded Service

Sometimes the best overflow strategy is to serve degraded responses instead of full responses. You can route overflow traffic to a lightweight service that returns cached or simplified data:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-catalog-vs
  namespace: default
spec:
  hosts:
    - product-catalog
  http:
    - route:
        - destination:
            host: product-catalog
            subset: full
          weight: 100
      retries:
        attempts: 1
        retryOn: 5xx,connect-failure
      timeout: 2s
    - route:
        - destination:
            host: product-catalog-cache
          weight: 100
```

The idea here is that `product-catalog-cache` is a simple service that serves cached product data. It can handle much higher throughput because it doesn't do database queries or complex computation.

Note: VirtualService evaluates routes top-down and uses the first matching route. The retry configuration on the first route helps handle transient failures, but if the primary consistently fails, you need application-level logic to route to the cache.

## Monitoring Overflow

Track when overflow happens so you can scale up before it becomes a regular occurrence:

```promql
# Connection pool overflows (503 responses from circuit breaking)
sum(rate(istio_requests_total{destination_service="api-service.default.svc.cluster.local", response_code="503", response_flags="UO"}[5m]))
```

The response flag `UO` indicates "upstream overflow," which means the request was rejected due to connection pool limits.

Set up an alert for this:

```yaml
groups:
  - name: overflow-alerts
    rules:
      - alert: UpstreamOverflow
        expr: |
          sum(rate(istio_requests_total{response_flags="UO"}[5m])) by (destination_service) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Overflow detected for {{ $labels.destination_service }}"
```

## Scaling Instead of Overflowing

Overflow is a reactive measure. Proactive scaling is usually better. Use the HPA to scale your primary pool before it hits capacity:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 5
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
```

Setting the target CPU to 60% (not 80% or 90%) gives the HPA time to scale up before pods become saturated. Combined with overflow routing as a safety net, you get a system that handles both gradual increases and sudden spikes.

## Summary

Overflow load balancing in Istio is built from several components: connection pool limits that define when the primary pool is "full," outlier detection that identifies failing endpoints, locality failover for geographic overflow, and retry/routing configuration to redirect excess traffic. The most automatic approach is locality-based failover with outlier detection. For more control, use subset-based routing with connection limits and retries. Either way, monitor overflow events and use HPA to scale proactively so overflow remains an exceptional event rather than the norm.
