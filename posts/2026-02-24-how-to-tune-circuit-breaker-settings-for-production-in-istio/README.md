# How to Tune Circuit Breaker Settings for Production in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Circuit Breaking, Production, Kubernetes, Performance

Description: A practical guide to tuning circuit breaker settings in Istio for production workloads based on real traffic patterns, service characteristics, and capacity planning.

---

Tuning circuit breakers for production is different from configuring them in a lab. In a lab, you set tight limits and watch requests get rejected. In production, the goal is to protect services from cascading failures without accidentally rejecting valid traffic during normal operation. This requires understanding your traffic patterns, your service capacity, and how the different settings interact.

## Start by Understanding Your Baseline

Before tuning anything, you need to know what normal looks like. Envoy statistics are per proxy instance, and Istio only records a minimal set by default, so make sure your mesh or workload `proxyStatsMatcher` includes the upstream cluster stats you want to query. Then collect these metrics for at least a week:

```bash
# Current active connections per service

kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "cx_active"

# Current active requests
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "rq_active"

# Request rate
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "rq_total"
```

Or use Prometheus queries to get historical data:

```text
# Peak concurrent connections over 7 days
max_over_time(envoy_cluster_upstream_cx_active{cluster_name=~".*my-service.*"}[7d])

# Peak concurrent requests over 7 days
max_over_time(envoy_cluster_upstream_rq_active{cluster_name=~".*my-service.*"}[7d])

# P99 request rate per second
quantile_over_time(0.99, rate(envoy_cluster_upstream_rq_total{cluster_name=~".*my-service.*"}[5m])[7d:5m])
```

## The 2x Rule for Connection Pool Settings

A good starting point is to set connection pool limits at roughly 2x your observed peak values. This gives you headroom for normal traffic spikes while still protecting against extreme overload.

If your service peaks at 50 concurrent connections and 100 concurrent requests:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: production
spec:
  host: my-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100    # 2x peak of 50
      http:
        http1MaxPendingRequests: 50  # Buffer for brief spikes
        http2MaxRequests: 200        # 2x peak of 100
        maxRequestsPerConnection: 100
```

Then monitor overflow metrics for a few days. If you see zero overflows, the limits are providing protection without affecting traffic. If you see occasional overflows during known traffic spikes, that is acceptable. If you see frequent overflows during normal traffic, bump the limits up.

## Tuning Outlier Detection

Outlier detection settings need to balance speed of detection against false positives.

### For Critical Services (Payments, Auth)

Detect failures fast, eject quickly, but be conservative about how many instances you eject:

```yaml
outlierDetection:
  consecutive5xxErrors: 2
  consecutiveGatewayErrors: 1
  interval: 5s
  baseEjectionTime: 60s
  maxEjectionPercent: 25
  minHealthPercent: 50
```

Low error thresholds (1-2) catch problems quickly. Low `maxEjectionPercent` (25%) limits how much capacity can be ejected. High `minHealthPercent` (50%) disables ejection if too many instances are unhealthy, preventing a death spiral.

### For Standard Services (APIs, Backends)

Balanced settings that handle both transient and persistent failures:

```yaml
outlierDetection:
  consecutive5xxErrors: 3
  interval: 10s
  baseEjectionTime: 30s
  maxEjectionPercent: 40
  minHealthPercent: 30
```

### For Non-Critical Services (Logging, Analytics)

Tolerant settings that only eject truly broken instances:

```yaml
outlierDetection:
  consecutive5xxErrors: 10
  interval: 30s
  baseEjectionTime: 15s
  maxEjectionPercent: 60
```

## Accounting for Retries

Retries amplify traffic, and that amplified traffic counts against circuit breaker limits. If you allow 3 retries and your service gets 100 RPS, the circuit breaker might see up to 400 RPS in a failure scenario: the original request plus up to 3 retries.

Factor this into your connection pool settings:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: production
spec:
  hosts:
    - my-service.production.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.production.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: "gateway-error,connect-failure"
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: production
spec:
  host: my-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 400    # 100 base * (1 original + 3 retries)
      http:
        http1MaxPendingRequests: 200
        http2MaxRequests: 800
```

## Per-Service vs Global Settings

DestinationRules apply to traffic for a specific service-registry host. A wildcard such as `*.production.svc.cluster.local` is not a mesh-wide default for every Kubernetes service, so apply your standard defaults per service and use different values for services that need them:

```yaml
# Standard service - conservative limits
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: standard-api
  namespace: production
spec:
  host: standard-api.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 200
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

```yaml
# High-traffic service - higher limits
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: high-traffic-api
  namespace: production
spec:
  host: high-traffic-api.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        http1MaxPendingRequests: 500
        http2MaxRequests: 2000
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 45s
      maxEjectionPercent: 30
```

## Tuning for Deployments

Rolling deployments temporarily reduce capacity. Your circuit breaking settings need to handle this gracefully.

During a deployment of a 4-pod service with `maxSurge: 1` and `maxUnavailable: 1`:
- Minimum available capacity: 3 pods
- If `maxEjectionPercent: 50` ejects multiple pods from a 3-pod pool, you may be left with only 1-2 pods serving traffic
- If `maxEjectionPercent: 25` ejects 1 pod from a 3-pod pool, 2 pods continue serving traffic

For services with few pods, lower `maxEjectionPercent` to limit how much capacity can be ejected during deployments:

```yaml
# For a 4-pod service
outlierDetection:
  maxEjectionPercent: 25  # At most 1 pod ejected
  baseEjectionTime: 15s   # Short ejection during deployments
```

## Iterative Tuning Process

Tuning circuit breakers is an iterative process:

1. **Baseline** - Measure peak connections, requests, and error rates
2. **Configure** - Set limits at 2x peak with moderate outlier detection
3. **Monitor** - Watch overflow and ejection metrics for 1-2 weeks
4. **Adjust** - Tighten limits if no overflows, loosen if normal traffic gets rejected
5. **Test** - Run load tests in staging to verify protection works
6. **Repeat** - Re-tune when traffic patterns or service capacity changes

```mermaid
flowchart TD
    A[Measure Baseline] --> B[Set Initial Limits at 2x Peak]
    B --> C[Deploy to Production]
    C --> D[Monitor for 1-2 Weeks]
    D --> E{Overflows during\nnormal traffic?}
    E -->|Yes| F[Increase limits]
    E -->|No| G{Overflows during\noverload?}
    G -->|No| H[Decrease limits]
    G -->|Yes| I[Settings are good]
    F --> D
    H --> D
    I --> J[Load test to verify]
    J --> D
```

## Production Configuration Template

Here is a production-ready template you can adapt:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: SERVICENAME
  namespace: production
spec:
  host: SERVICENAME.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200      # Adjust based on peak * 2
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 100  # Adjust based on peak pending * 2
        http2MaxRequests: 400         # Adjust based on peak concurrent * 2
        maxRequestsPerConnection: 100 # Recycle connections periodically
    outlierDetection:
      consecutive5xxErrors: 3     # Eject after 3 consecutive errors
      consecutiveGatewayErrors: 2 # More sensitive to gateway errors
      interval: 10s               # Check every 10 seconds
      baseEjectionTime: 30s       # First ejection: 30s
      maxEjectionPercent: 40      # Never eject more than 40%
      minHealthPercent: 30        # Disable ejection if < 30% healthy
```

Replace `SERVICENAME` with your actual service name and adjust the numeric values based on your baseline measurements.

The most important thing about circuit breaker tuning is that it is never finished. Traffic patterns change, services get updated, infrastructure evolves. Build monitoring into your workflow and revisit these settings regularly.
