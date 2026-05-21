# How to Implement Bulkhead Pattern with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Bulkhead Pattern, Resilience, DestinationRule, Connection Pooling

Description: How to implement the bulkhead pattern in Istio to isolate failures and prevent a single failing dependency from taking down your entire service.

---

The bulkhead pattern comes from shipbuilding. Ships have watertight compartments (bulkheads) so that if one section floods, the rest of the ship stays afloat. In microservices, the idea is the same: isolate your dependencies so that a failure in one does not consume all resources and take down everything else. Istio implements bulkheads through connection pool isolation and resource limits.

## The Problem Without Bulkheads

Imagine your service calls three downstream services: a payment service, a notification service, and an inventory service. Without bulkhead limits, the application can still spend all of its own worker capacity waiting on one slow dependency, and Envoy's default upstream circuit breaker limits may be too large to protect the rest of the workload.

If the payment service becomes slow, your service can build up too many in-flight payment calls. Now your notification and inventory calls also start failing because the application has no free capacity left to process them. One slow dependency has taken down your entire service.

## Implementing Bulkheads with Connection Pool Limits

In Istio, you create bulkheads by setting separate connection pool limits for each downstream service through DestinationRules:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service-bulkhead
  namespace: default
spec:
  host: payment-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 100
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: notification-service-bulkhead
  namespace: default
spec:
  host: notification-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 30
      http:
        http1MaxPendingRequests: 15
        http2MaxRequests: 50
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: inventory-service-bulkhead
  namespace: default
spec:
  host: inventory-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 40
      http:
        http1MaxPendingRequests: 20
        http2MaxRequests: 80
```

Envoy already maintains upstream pools per cluster; these rules put independent limits around each downstream service's pool. If the payment service becomes slow and uses up its connection, pending request, or active request limits, the notification and inventory services are unaffected because their upstream clusters have separate limits.

## How It Works Under the Hood

Envoy maintains separate connection pools for each upstream cluster. In Istio, a cluster commonly represents traffic to a Kubernetes service, service port, and optionally a subset of that service. The connection pool limits from DestinationRules are translated into Envoy circuit breaker thresholds for those clusters, creating natural isolation.

When a request comes in that needs to go to the payment service:
1. Envoy checks the payment service's connection pool
2. If a connection is available, the request uses it
3. If the request cannot be dispatched immediately but the pending queue has room, the request waits
4. If the relevant connection, pending request, or active request limit is exceeded, the request immediately gets a 503

That 503 is the bulkhead doing its job. It is saying "this compartment is full, fail fast rather than let this problem spread."

## Sizing Your Bulkheads

The key question is how to size each connection pool. Here is a practical approach:

1. Determine the baseline concurrency for each dependency
2. Add headroom for traffic spikes
3. Consider the impact of a failure in each dependency

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: critical-service-bulkhead
spec:
  host: critical-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 200
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: best-effort-service-bulkhead
spec:
  host: best-effort-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 20
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 40
```

Critical dependencies get larger pools because you want them to have capacity for bursts. Non-critical dependencies get smaller pools because you want them to fail fast if there is a problem, rather than consuming resources that could be used for more important traffic.

## Bulkheads for Service Subsets

You can create finer-grained bulkheads using service subsets. For example, if your API has a read path and a write path that go to different backend versions:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-bulkhead
spec:
  host: backend-service
  subsets:
  - name: read-path
    labels:
      role: reader
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 100
        http:
          http1MaxPendingRequests: 50
          http2MaxRequests: 200
  - name: write-path
    labels:
      role: writer
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 30
        http:
          http1MaxPendingRequests: 15
          http2MaxRequests: 60
```

This isolates read and write traffic when the VirtualService routes them to different subsets. A surge in write traffic will not consume the connection pool limits that read traffic needs.

Pair this with a VirtualService that routes traffic to the appropriate subset:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-routing
spec:
  hosts:
  - backend-service
  http:
  - match:
    - method:
        exact: GET
    route:
    - destination:
        host: backend-service
        subset: read-path
  - route:
    - destination:
        host: backend-service
        subset: write-path
```

## Combining Bulkheads with Outlier Detection

Bulkheads work best when combined with outlier detection. The bulkhead prevents resource exhaustion, while outlier detection removes unhealthy endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: service-b-resilient
spec:
  host: service-b
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 100
        maxRetries: 5
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

The connection pool limits act as the bulkhead walls. Outlier detection pumps water out of the flooded compartment by ejecting unhealthy endpoints so Envoy load balances across the remaining healthy ones.

## Monitoring Bulkhead Utilization

You need to know how close each bulkhead is to its limits. If a bulkhead is always at 10% utilization, it is probably too large. If it is frequently hitting 100%, it is either too small or there is a problem. Istio records a minimal set of Envoy stats by default, so make sure the upstream connection and request stats you alert on are included in your proxy stats matcher.

```promql
# Active connections per upstream cluster

envoy_cluster_upstream_cx_active

# Pending requests per upstream cluster
envoy_cluster_upstream_rq_pending_active

# Overflow events (bulkhead trips)
rate(envoy_cluster_upstream_rq_pending_overflow[5m])
```

Build a dashboard that shows utilization as a percentage of the limit:

```promql
# Connection utilization as percentage (you need to know the limit)
envoy_cluster_upstream_cx_active{cluster_name=~"outbound.*payment.*"} / 50 * 100
```

Set up alerts when bulkheads are consistently near capacity:

```yaml
groups:
- name: bulkhead-alerts
  rules:
  - alert: BulkheadNearCapacity
    expr: |
      rate(envoy_cluster_upstream_rq_pending_overflow[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Bulkhead overflowing on {{ $labels.cluster_name }}"

  - alert: BulkheadTripped
    expr: |
      rate(envoy_cluster_upstream_rq_pending_overflow[1m]) > 1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Heavy bulkhead overflow on {{ $labels.cluster_name }}, requests being rejected"
```

## Testing Bulkheads

Test your bulkhead configuration by simulating a failure in one dependency and verifying the others are not affected:

1. Deploy your service with bulkhead DestinationRules applied
2. Generate normal traffic to all dependencies
3. Make one dependency slow (e.g., inject a 10-second delay):

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service-fault
spec:
  hosts:
  - payment-service
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 10s
    route:
    - destination:
        host: payment-service
```

4. Monitor that requests to other dependencies still succeed normally:

```bash
kubectl exec deploy/test-client -- curl -s -o /dev/null -w "%{http_code} %{time_total}\n" http://notification-service:8080/api/notify
kubectl exec deploy/test-client -- curl -s -o /dev/null -w "%{http_code} %{time_total}\n" http://inventory-service:8080/api/check
```

These should return 200 with normal latency, even while the payment service is failing.

5. Clean up the fault injection:

```bash
kubectl delete virtualservice payment-service-fault
```

## Practical Guidelines

- Set smaller pools for non-critical dependencies. If a dependency is "nice to have," give it a small bulkhead so it fails fast.
- Set larger pools for critical-path dependencies. These need room to handle bursts.
- Monitor overflow rates. They tell you whether your bulkhead sizes are appropriate.
- Combine with timeouts. A bulkhead prevents resource exhaustion, but a timeout prevents individual requests from waiting too long.
- Review sizes quarterly. Traffic patterns change, and your bulkhead sizes should change with them.

The bulkhead pattern is straightforward to implement in Istio because the connection pool isolation is built into how Envoy handles upstream clusters. DestinationRules with connection pool limits turn that per-cluster isolation into an enforceable bulkhead. The key is sizing them appropriately and monitoring their utilization so you can adjust as your traffic patterns evolve.
