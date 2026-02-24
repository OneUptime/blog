# How to Configure Health-Based Load Balancing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Health Checks, Kubernetes, Outlier Detection

Description: Configure health-based load balancing in Istio to automatically route traffic away from unhealthy pods using outlier detection.

---

A load balancer that keeps sending traffic to a failing pod is worse than no load balancer at all. Health-based load balancing solves this by continuously monitoring endpoint health and removing unhealthy ones from the rotation. In Istio, this is primarily done through outlier detection, a mechanism where Envoy tracks error rates and latencies for each endpoint and ejects those that cross your thresholds.

## Outlier Detection Basics

Outlier detection is Istio's approach to passive health checking. Instead of actively probing endpoints, Envoy watches the responses coming back and decides whether an endpoint is healthy based on actual traffic patterns. If a pod starts returning errors, Envoy temporarily removes it from the load balancing pool.

Here is a basic outlier detection configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: default
spec:
  host: payment-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    loadBalancer:
      simple: ROUND_ROBIN
```

Here is what each field does:

- `consecutive5xxErrors`: How many consecutive 5xx errors before Envoy ejects the host. Setting this to 5 means an endpoint needs to fail 5 times in a row.
- `interval`: How often Envoy checks for outliers. Every 10 seconds in this case.
- `baseEjectionTime`: How long a host stays ejected. The actual ejection time increases with each subsequent ejection (baseEjectionTime * number of ejections).
- `maxEjectionPercent`: Maximum percentage of hosts that can be ejected at once. This prevents all endpoints from being removed.

## Configuring Gateway Errors

Besides 5xx errors, you might want to detect gateway-level errors like connection failures and timeouts:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: inventory-service-dr
  namespace: default
spec:
  host: inventory-service
  trafficPolicy:
    outlierDetection:
      consecutiveGatewayErrors: 3
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 40
    loadBalancer:
      simple: LEAST_REQUEST
```

Gateway errors include 502, 503, and 504 responses, plus connection-level errors. These often indicate a pod that's completely down rather than just returning application errors.

The `consecutiveGatewayErrors` field specifically catches these infrastructure-level failures, while `consecutive5xxErrors` catches all server errors including 500s.

## Combining with Kubernetes Health Checks

Outlier detection works at the Envoy proxy level, but you should also configure Kubernetes-level health checks for a complete health-based system:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: default
spec:
  replicas: 5
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment-service
          image: myregistry/payment-service:v1
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
            failureThreshold: 5
```

Here is how the two layers work together:

1. **Kubernetes readiness probe**: Determines whether a pod should receive traffic at all. If the readiness probe fails, Kubernetes removes the pod from the Service endpoints.
2. **Istio outlier detection**: Monitors actual request success/failure and temporarily removes endpoints that are technically "ready" but returning errors.

This two-layer approach catches both full pod failures (Kubernetes handles it) and partial failures like intermittent errors or degraded performance (Istio handles it).

## Advanced Outlier Detection Settings

For production environments, you probably want more nuanced settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: critical-service-dr
  namespace: production
spec:
  host: critical-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      consecutiveGatewayErrors: 2
      interval: 5s
      baseEjectionTime: 15s
      maxEjectionPercent: 30
      minHealthPercent: 50
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        maxRequestsPerConnection: 500
    loadBalancer:
      simple: LEAST_REQUEST
```

The `minHealthPercent` field is important and often overlooked. It sets the minimum percentage of healthy endpoints required for outlier detection to be active. If healthy endpoints drop below this threshold, Envoy disables outlier detection and routes to all endpoints, including unhealthy ones. This prevents a cascading failure where all endpoints are ejected.

Setting it to 50 means if more than half your endpoints are ejected, the system considers something globally wrong (maybe a downstream dependency is broken) and starts routing to all endpoints again.

## Per-Subset Health Configuration

Different service subsets might need different health thresholds. A canary deployment might need stricter checks:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service-dr
  namespace: default
spec:
  host: api-service
  subsets:
    - name: stable
      labels:
        version: v1
      trafficPolicy:
        outlierDetection:
          consecutive5xxErrors: 5
          interval: 10s
          baseEjectionTime: 30s
          maxEjectionPercent: 50
    - name: canary
      labels:
        version: v2
      trafficPolicy:
        outlierDetection:
          consecutive5xxErrors: 2
          interval: 5s
          baseEjectionTime: 60s
          maxEjectionPercent: 100
```

The canary subset has much stricter settings: only 2 consecutive errors triggers ejection, and we allow ejecting 100% of canary pods. If the canary is broken, we want all traffic to go to stable.

## Monitoring Outlier Detection

Check whether outlier detection is actually doing its job:

```bash
# Check ejected endpoints
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/clusters | grep outlier

# Check specific service endpoints and their health
istioctl proxy-config endpoints <pod-name> --cluster "outbound|80||payment-service.default.svc.cluster.local"
```

Endpoints that have been ejected will show up with a `UNHEALTHY` status.

For Prometheus monitoring, use these queries:

```promql
# Number of ejected hosts
envoy_cluster_outlier_detection_ejections_active{cluster_name="outbound|80||payment-service.default.svc.cluster.local"}

# Total ejection events over time
rate(envoy_cluster_outlier_detection_ejections_total{cluster_name="outbound|80||payment-service.default.svc.cluster.local"}[5m])
```

## Handling the Ejection-Recovery Cycle

When an endpoint is ejected, it stays out for the base ejection time multiplied by the number of times it's been ejected. After the ejection period, the endpoint is put back in the pool. If it fails again, it gets ejected for a longer period.

This exponential backoff prevents a flapping endpoint from constantly disrupting the load balancing pool. But it also means that if a pod recovers, it might take a while before it's fully trusted again.

To speed up recovery, you can lower the base ejection time, but be careful not to set it too low or you'll get the flapping behavior you're trying to avoid.

## Summary

Health-based load balancing in Istio centers on outlier detection in the DestinationRule. Configure `consecutive5xxErrors` and `consecutiveGatewayErrors` to detect unhealthy endpoints, set `baseEjectionTime` to control how long bad endpoints stay out of the pool, and use `maxEjectionPercent` with `minHealthPercent` to prevent total ejection scenarios. Pair this with Kubernetes readiness and liveness probes for comprehensive health management across both the infrastructure and application layers.
