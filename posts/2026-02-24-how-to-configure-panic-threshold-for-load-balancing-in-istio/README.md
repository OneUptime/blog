# How to Configure Panic Threshold for Load Balancing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Panic Threshold, Outlier Detection, Kubernetes

Description: How to configure and tune the panic threshold in Istio for load balancing to prevent total service outages when too many endpoints are ejected by outlier detection.

---

Istio uses Envoy's outlier detection to remove unhealthy endpoints from the load balancing pool. When an endpoint starts returning errors, it gets ejected so traffic goes to healthy endpoints instead. This works great until too many endpoints get ejected and you are left with almost no capacity. That is where the panic threshold comes in.

The panic threshold is a safety valve. When the percentage of healthy endpoints drops below the panic threshold, Envoy stops respecting outlier detection and starts sending traffic to all endpoints again, including the unhealthy ones. The idea is that sending some traffic to bad endpoints is better than having no capacity at all.

## How Panic Mode Works

Under normal conditions, Envoy maintains a set of healthy endpoints and only routes traffic to those. The outlier detection algorithm ejects endpoints that return consecutive errors.

Here is the flow:
1. Endpoints A, B, C, D, E are all healthy. Traffic is balanced across all 5.
2. Endpoint A starts returning 503s. After `consecutive5xxErrors` threshold is hit, A is ejected.
3. Endpoint B also starts failing. B is ejected.
4. Now only C, D, E are healthy. That is 60% of the pool.
5. If the panic threshold is set to 50% (the default), traffic continues to flow only to C, D, E.
6. If C also fails, now only D, E are healthy. That is 40%, which is below the 50% panic threshold.
7. Envoy enters panic mode and starts sending traffic to ALL endpoints, including A, B, C.

## Default Configuration

The default panic threshold in Istio is 0%, which means panic mode is disabled. Envoy will keep ejecting endpoints even if all of them are unhealthy. This is actually the safer default for most cases because sending traffic to known-bad endpoints usually makes things worse.

You can verify the current configuration:

```bash
istioctl proxy-config clusters <pod-name> -n default -o json | grep -A5 "commonLbConfig"
```

## Configuring Panic Threshold

You set the panic threshold in a DestinationRule as part of the outlier detection configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

The `maxEjectionPercent` controls how many endpoints can be ejected at most. Setting it to 50 means at least 50% of your endpoints will always be in the healthy pool. This is not exactly the same as the panic threshold, but it achieves a similar effect by limiting how many endpoints can be removed.

For the actual Envoy panic threshold, you need an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: panic-threshold
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-client-service
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: my-service.default.svc.cluster.local
      patch:
        operation: MERGE
        value:
          common_lb_config:
            healthy_panic_threshold:
              value: 50
```

This sets the panic threshold to 50% for the cluster corresponding to `my-service`. When less than 50% of endpoints are healthy, Envoy will route to all endpoints regardless of their health status.

## When to Use Panic Threshold

The panic threshold makes sense when:

1. **Your service can partially function even when unhealthy.** If returning an error 50% of the time is better than returning errors 100% of the time, enable panic mode. For example, a search service might return stale results from an unhealthy pod, which is better than no results at all.

2. **You have a small number of replicas.** With only 2 or 3 pods, one pod failing means losing 33-50% of capacity. Panic mode helps keep the service available.

3. **Transient errors are the norm.** If your service occasionally throws errors but usually recovers quickly, keeping it in the pool during the recovery period is reasonable.

## When Not to Use Panic Threshold

Do not enable panic mode when:

1. **Unhealthy endpoints make things worse.** If an unhealthy pod causes cascading failures in callers (like returning corrupted data), it is better to have no capacity than bad capacity.

2. **You have many replicas.** With 20+ pods, losing a few to outlier detection still leaves plenty of capacity. Panic mode is unnecessary.

3. **The errors are persistent, not transient.** If a pod is broken due to a bad deployment, sending traffic to it will not help.

## Combining maxEjectionPercent and Panic Threshold

The recommended approach is to use `maxEjectionPercent` as the primary control and only add the panic threshold via EnvoyFilter if you need the specific Envoy panic behavior:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 60
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
```

With `maxEjectionPercent: 60`, at least 40% of endpoints are always available. This is simpler to reason about than the panic threshold.

## Tuning for Different Service Tiers

Different services need different panic thresholds. Here is how I think about it:

**Critical services (authentication, payments):**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: auth-service-dr
spec:
  host: auth-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 15s
      maxEjectionPercent: 30
```

Keep the ejection threshold low (only 30% can be ejected) so you always have 70% capacity. Critical services should also have more aggressive detection (fewer errors needed to eject, shorter interval).

**Non-critical services (recommendations, analytics):**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: recommendations-dr
spec:
  host: recommendations.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 80
```

Non-critical services can be more aggressive with ejection. If recommendations are down, the user experience degrades but the core product still works.

## Monitoring Panic Mode

Track when panic mode activates:

```promql
# Check if any cluster is in panic mode
envoy_cluster_membership_healthy{cluster_name=~"outbound.*my-service.*"}
/
envoy_cluster_membership_total{cluster_name=~"outbound.*my-service.*"}
```

When this ratio drops below your panic threshold, you know panic mode is active.

Also monitor ejection counts:

```promql
# Total ejections
sum(rate(envoy_cluster_outlier_detection_ejections_total{cluster_name=~"outbound.*my-service.*"}[5m]))

# Currently ejected
envoy_cluster_outlier_detection_ejections_active{cluster_name=~"outbound.*my-service.*"}
```

Set an alert for when ejections are happening:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: outlier-detection-alerts
spec:
  groups:
    - name: istio.outlier
      rules:
        - alert: HighEjectionRate
          expr: |
            envoy_cluster_outlier_detection_ejections_active > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Endpoints are being ejected from {{ $labels.cluster_name }}"
```

## Testing Panic Threshold Behavior

You can test panic mode by injecting faults:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: test-panic
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 80
      route:
        - destination:
            host: my-service.default.svc.cluster.local
```

This makes 80% of requests return 503, which should trigger outlier detection and eventually panic mode. Watch the metrics to see when it kicks in.

## Summary

The panic threshold in Istio is a safety mechanism that prevents outlier detection from ejecting so many endpoints that you have no capacity left. Use `maxEjectionPercent` in your DestinationRule as the primary control, and only add the Envoy panic threshold via EnvoyFilter if you need it. For critical services, keep ejection limits low so you always have capacity. For non-critical services, you can be more aggressive. Always monitor ejection rates and set up alerts so you know when your service pool is degrading.
