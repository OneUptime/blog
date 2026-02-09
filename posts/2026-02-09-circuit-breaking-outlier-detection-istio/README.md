# How to Implement Circuit Breaking with Custom Outlier Detection in Istio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Service Mesh, Circuit Breaking, Reliability, Kubernetes

Description: Learn how to implement advanced circuit breaking patterns with custom outlier detection in Istio to automatically isolate failing instances and improve service reliability in production environments.

---

Circuit breaking is a critical reliability pattern in microservices architectures. While basic circuit breaking stops cascading failures, combining it with outlier detection takes resilience to the next level by automatically identifying and ejecting unhealthy service instances from your load balancing pool.

In this guide, you'll learn how to configure Istio's advanced circuit breaking features with custom outlier detection parameters that adapt to your specific traffic patterns and failure scenarios.

## Understanding Circuit Breaking and Outlier Detection

Circuit breaking prevents a client from repeatedly trying to execute operations that are likely to fail. Outlier detection, also called ejection, identifies instances that are behaving differently from the rest and temporarily removes them from the load balancing pool.

When you combine these patterns, your mesh becomes self-healing. Istio monitors each instance's health metrics and automatically routes traffic away from problematic endpoints before they impact your users.

## Basic Circuit Breaker Configuration

Start with a basic DestinationRule that defines connection limits and circuit breaking thresholds:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-cb
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100  # Maximum TCP connections
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 2
        maxRetries: 3
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 50
```

This configuration sets conservative defaults. The circuit breaker opens after 5 consecutive errors, and unhealthy instances are ejected for at least 30 seconds.

## Advanced Outlier Detection with Custom Thresholds

Real-world services need more nuanced detection. Configure split thresholds for different error types:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-gateway-advanced-cb
  namespace: production
spec:
  host: api-gateway.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 3s
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
        maxRequestsPerConnection: 5
        maxRetries: 2
        idleTimeout: 60s
    outlierDetection:
      # Split detection for different error types
      consecutive5xxErrors: 3  # Gateway errors trigger faster
      consecutiveGatewayErrors: 2  # Even faster for 502/503/504
      consecutiveLocalOriginFailures: 5

      # Time-based detection window
      interval: 10s  # Check every 10 seconds
      baseEjectionTime: 60s  # Start with 60s ejection
      maxEjectionTime: 300s  # Cap at 5 minutes

      # Protection thresholds
      maxEjectionPercent: 30  # Never eject more than 30%
      minHealthPercent: 70  # Require 70% healthy instances

      # Success rate enforcement
      enforcingConsecutive5xx: 100  # Always eject on 5xx
      enforcingConsecutiveGatewayFailure: 100
      enforcingSuccessRate: 80  # 80% probability based on stats
      successRateMinimumHosts: 5  # Need at least 5 hosts
      successRateRequestVolume: 100  # Minimum 100 requests
      successRateStdevFactor: 1900  # Sensitivity factor
```

This advanced configuration separates gateway errors from application errors, applies probability-based ejection, and prevents over-ejection that could destabilize your service.

## Namespace-Specific Circuit Breaking Policies

Apply different policies based on service criticality:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: critical-services-cb
  namespace: production
spec:
  host: "*.production.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        http2MaxRequests: 500
        maxRetries: 1  # Critical services fail fast
    outlierDetection:
      consecutiveGatewayErrors: 1  # Zero tolerance
      interval: 5s  # Aggressive checking
      baseEjectionTime: 120s
      maxEjectionPercent: 20  # Conservative ejection
```

For non-critical services, use more lenient settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: batch-services-cb
  namespace: batch-processing
spec:
  host: "*.batch-processing.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        maxRetries: 5  # Retry batch operations
    outlierDetection:
      consecutive5xxErrors: 10  # More lenient
      interval: 60s  # Check less frequently
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

## Monitoring Circuit Breaker Behavior

Deploy a ServiceMonitor to track circuit breaker metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: circuit-breaker-dashboard
  namespace: istio-system
data:
  dashboard.json: |
    {
      "queries": [
        "envoy_cluster_upstream_rq_pending_overflow",
        "envoy_cluster_upstream_rq_pending_failure_eject",
        "envoy_cluster_upstream_rq_timeout",
        "envoy_cluster_outlier_detection_ejections_active"
      ]
    }
```

Query Prometheus for ejection events:

```promql
# Active ejections by service
sum by (cluster_name) (envoy_cluster_outlier_detection_ejections_active)

# Ejection rate over time
rate(envoy_cluster_outlier_detection_ejections_total[5m])

# Circuit breaker overflow events
rate(envoy_cluster_upstream_rq_pending_overflow[5m])
```

## Testing Circuit Breaking Behavior

Deploy a test client to verify your configuration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: circuit-breaker-test
  namespace: production
spec:
  containers:
  - name: fortio
    image: fortio/fortio:latest
    command: ["/bin/sh", "-c", "sleep 3600"]
---
# Test with controlled load
kubectl exec -it circuit-breaker-test -n production -- \
  fortio load -c 50 -qps 100 -t 60s \
  http://payment-service.production:8080/health
```

Inject failures to trigger outlier detection:

```bash
# Deploy fault injection
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-fault-injection
  namespace: production
spec:
  hosts:
  - payment-service
  http:
  - match:
    - headers:
        x-test-fault:
          exact: "true"
    fault:
      abort:
        percentage:
          value: 50
        httpStatus: 503
    route:
    - destination:
        host: payment-service
  - route:
    - destination:
        host: payment-service
EOF
```

## Handling Gradual Ejection Recovery

Configure exponential backoff for ejected instances:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: gradual-recovery-cb
  namespace: production
spec:
  host: database-proxy.production.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionTime: 600s  # Maximum 10 minutes
      # Each subsequent ejection doubles duration
      # 30s -> 60s -> 120s -> 240s -> 480s -> 600s
```

The ejection time increases exponentially for instances that repeatedly fail, preventing flapping behavior while giving transient issues time to recover.

## Production Best Practices

Configure alerts for circuit breaker events:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: circuit-breaker-alerts
  namespace: istio-system
spec:
  groups:
  - name: circuit_breaker
    interval: 30s
    rules:
    - alert: HighCircuitBreakerOpenRate
      expr: |
        rate(envoy_cluster_upstream_rq_pending_overflow[5m]) > 0.1
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Circuit breaker opening frequently"
        description: "Service {{ $labels.cluster_name }} has high circuit breaker open rate"

    - alert: TooManyEjectedInstances
      expr: |
        (envoy_cluster_outlier_detection_ejections_active /
         envoy_cluster_membership_healthy) > 0.5
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "More than 50% instances ejected"
        description: "Service {{ $labels.cluster_name }} has majority of instances ejected"
```

Always set maxEjectionPercent to prevent cascading failures. If too many instances are unhealthy, you want to keep routing traffic rather than completely fail.

Start with conservative thresholds and tune based on actual traffic patterns. Monitor your P99 latency and error rates before and after enabling circuit breaking to validate the configuration improves reliability without introducing new issues.

Circuit breaking with outlier detection transforms your service mesh into a self-healing system that automatically adapts to failures without manual intervention.
