# How to Configure Circuit Breaking per Service Subset in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Circuit Breaking, Subsets, Kubernetes

Description: How to apply different circuit breaking configurations to different versions or subsets of a service using Istio DestinationRule subsets.

---

Not all versions of a service need the same circuit breaking settings. A canary deployment handling 5% of traffic needs tighter limits than the stable version handling 95%. A v2 of your API that is more resource-efficient might tolerate higher concurrency than v1. Istio lets you configure circuit breaking per subset, giving you fine-grained control.

## What Are Subsets?

Subsets in Istio are named groups of service instances, usually defined by Kubernetes labels like `version: v1` or `version: v2`. You define them in a DestinationRule and reference them in VirtualService routing.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
  namespace: default
spec:
  host: my-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

## Applying Different Circuit Breaking Per Subset

Each subset can have its own `trafficPolicy` that overrides the top-level settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
  namespace: default
spec:
  host: product-service
  trafficPolicy:
    # Default settings for all subsets
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
    - name: stable
      labels:
        version: v1
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 200
          http:
            http1MaxPendingRequests: 100
            http2MaxRequests: 400
        outlierDetection:
          consecutive5xxErrors: 3
          interval: 10s
          baseEjectionTime: 30s
          maxEjectionPercent: 40
    - name: canary
      labels:
        version: v2
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 20
          http:
            http1MaxPendingRequests: 10
            http2MaxRequests: 40
        outlierDetection:
          consecutive5xxErrors: 2
          interval: 5s
          baseEjectionTime: 60s
          maxEjectionPercent: 50
```

The stable version gets higher limits because it handles the bulk of traffic. The canary version gets tighter limits and more aggressive outlier detection because you want to catch problems quickly.

## Routing Traffic to Subsets

Use a VirtualService to direct traffic to the subsets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: default
spec:
  hosts:
    - product-service
  http:
    - route:
        - destination:
            host: product-service
            subset: stable
          weight: 95
        - destination:
            host: product-service
            subset: canary
          weight: 5
```

95% of traffic goes to the stable subset (v1) with its higher limits. 5% goes to the canary subset (v2) with its tighter limits.

## Real-World Use Cases

### Canary Deployments

The most common use case. The canary gets strict circuit breaking so any issues are caught fast:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-service
  namespace: production
spec:
  host: checkout-service
  subsets:
    - name: stable
      labels:
        version: v3
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 200
          http:
            http1MaxPendingRequests: 100
            http2MaxRequests: 400
        outlierDetection:
          consecutive5xxErrors: 5
          interval: 10s
          baseEjectionTime: 30s
          maxEjectionPercent: 40
    - name: canary
      labels:
        version: v4
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 30
          http:
            http1MaxPendingRequests: 15
            http2MaxRequests: 60
        outlierDetection:
          consecutive5xxErrors: 1
          interval: 5s
          baseEjectionTime: 120s
          maxEjectionPercent: 100
```

The canary has `consecutive5xxErrors: 1` and `maxEjectionPercent: 100`. A single error ejects the canary pod, and all canary pods can be ejected. If the canary is broken, it gets removed from the pool entirely and all traffic goes to stable.

### Blue-Green Deployments

During a blue-green switch, both versions need circuit breaking but with different characteristics:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service
  namespace: production
spec:
  host: api-service
  subsets:
    - name: blue
      labels:
        deployment: blue
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 200
          http:
            http1MaxPendingRequests: 100
        outlierDetection:
          consecutive5xxErrors: 3
          interval: 10s
          baseEjectionTime: 30s
          maxEjectionPercent: 50
    - name: green
      labels:
        deployment: green
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 200
          http:
            http1MaxPendingRequests: 100
        outlierDetection:
          consecutive5xxErrors: 3
          interval: 10s
          baseEjectionTime: 30s
          maxEjectionPercent: 50
```

Both get the same settings because either one could be the active deployment.

### Different Service Tiers

Some services have different performance tiers:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: search-service
  namespace: production
spec:
  host: search-service
  subsets:
    - name: premium
      labels:
        tier: premium
      trafficPolicy:
        connectionPool:
          tcp:
            maxConnections: 500
          http:
            http1MaxPendingRequests: 200
            http2MaxRequests: 1000
        outlierDetection:
          consecutive5xxErrors: 2
          interval: 5s
          baseEjectionTime: 60s
          maxEjectionPercent: 30
    - name: standard
      labels:
        tier: standard
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

Premium tier gets higher limits and more sensitive outlier detection. Standard tier gets lower limits and more tolerance for errors.

## How Subset-Level Settings Override Top-Level

When you define a `trafficPolicy` at both the top level and the subset level, the subset-level policy completely replaces the top-level policy for that subset. It does not merge them.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: example
spec:
  host: example
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      baseEjectionTime: 30s
  subsets:
    - name: v1
      labels:
        version: v1
      trafficPolicy:
        # This REPLACES the top-level policy entirely
        connectionPool:
          tcp:
            maxConnections: 200
        # outlierDetection is NOT inherited - you need to specify it again
```

In this example, subset v1 has `maxConnections: 200` but no outlier detection at all, because the subset policy replaces the top-level policy entirely. If you want outlier detection on v1, you need to specify it explicitly in the subset.

## Monitoring Per-Subset Circuit Breaking

Each subset generates its own Envoy cluster with its own metrics:

```bash
# Check stats for a specific subset
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "outbound|8080|stable|product-service"

kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "outbound|8080|canary|product-service"
```

The cluster name format is `outbound|PORT|SUBSET|HOST`. This lets you monitor each subset independently.

```bash
# Compare overflow rates between subsets
echo "=== Stable ==="
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "outbound|8080|stable" | grep overflow

echo "=== Canary ==="
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "outbound|8080|canary" | grep overflow
```

## Verifying Subset Configuration

Make sure your subset circuit breaking is applied correctly:

```bash
# Check the DestinationRule
kubectl get destinationrule product-service -o yaml

# Check Envoy's view of the configuration
kubectl exec deploy/product-service -c istio-proxy -- \
  curl -s localhost:15000/config_dump?resource=dynamic_active_clusters | \
  python3 -m json.tool | grep -A 30 "circuit_breakers"
```

You should see separate cluster configurations for each subset, each with their own circuit breaker settings.

Per-subset circuit breaking gives you the flexibility to match your resilience settings to each version's characteristics and traffic volume. Use it during canary deployments, for service tier differentiation, or anytime different instances of the same service need different protection levels.
