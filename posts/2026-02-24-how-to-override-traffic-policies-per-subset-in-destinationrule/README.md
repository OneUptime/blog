# How to Override Traffic Policies per Subset in DestinationRule

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DestinationRule, Traffic Policy, Subset, Kubernetes

Description: Learn how to override traffic policies for specific subsets in Istio DestinationRule to apply different settings per service version.

---

One of the most powerful features of Istio's DestinationRule is the ability to define different traffic policies for different subsets of a service. The top-level `trafficPolicy` acts as a default, and each subset can override specific policy fields. This lets you apply strict circuit breaking to a canary version while keeping relaxed settings for your stable version, or use different load balancing algorithms for different deployment groups.

## How Policy Inheritance Works

When you define a traffic policy at the top level and also within a subset, the subset inherits the top-level policy. Settings specified at the subset level override the corresponding top-level settings for that subset.

The merge happens at the main `TrafficPolicy` field level. For example, a subset-level `loadBalancer` replaces the top-level `loadBalancer`, but it does not remove the top-level `connectionPool`. If you override a nested block such as `connectionPool` or `outlierDetection`, include the settings from that block that you still want to keep.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
    connectionPool:
      tcp:
        maxConnections: 200
  subsets:
  - name: v1
    labels:
      version: v1
    # Inherits the top-level trafficPolicy
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      loadBalancer:
        simple: LEAST_REQUEST
      # connectionPool is still inherited from the top-level trafficPolicy
```

In this example, v1 inherits both the ROUND_ROBIN load balancer and the maxConnections of 200. The v2 subset overrides only the load balancer with LEAST_REQUEST, while still inheriting the top-level connectionPool settings.

This is a common gotcha. You only need to repeat settings when you override the same top-level policy block and want to keep some values from that block.

## Correct Way to Override Partially

If you want to change only one top-level aspect of the traffic policy for a subset while keeping everything else, specify only that aspect. If you override a nested block, repeat the values from that block that you want to keep:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        http1MaxPendingRequests: 50
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      loadBalancer:
        simple: LEAST_REQUEST
      outlierDetection:
        consecutive5xxErrors: 3
        interval: 5s
        baseEjectionTime: 60s
```

Now v2 has a different load balancer and stricter outlier detection, but keeps the same connection pool settings by inheriting the top-level `connectionPool`.

## Real-World Use Cases

### Canary Deployment Protection

During a canary rollout, you want the new version to have tighter limits so it fails fast if something is wrong:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service-canary
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        http1MaxPendingRequests: 200
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
  - name: stable
    labels:
      version: v1
  - name: canary
    labels:
      version: v2
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 50
        http:
          http1MaxPendingRequests: 10
          http2MaxRequests: 50
      outlierDetection:
        consecutive5xxErrors: 2
        interval: 5s
        baseEjectionTime: 120s
        maxEjectionPercent: 100
```

The canary subset gets 10x tighter connection limits and triggers circuit breaking after just 2 errors instead of 5. If the canary starts misbehaving, it gets isolated quickly.

### Different TLS Settings Per Version

Maybe your v1 service does not have a sidecar (legacy), but v2 does:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mixed-tls
spec:
  host: my-service
  subsets:
  - name: legacy
    labels:
      version: v1
    trafficPolicy:
      tls:
        mode: DISABLE
  - name: modern
    labels:
      version: v2
    trafficPolicy:
      tls:
        mode: ISTIO_MUTUAL
```

Traffic to legacy pods goes over plain text, while traffic to modern pods uses Istio mTLS.

### Different Load Balancing Per Subset

Your stateful v1 might need session affinity while your stateless v2 uses round robin:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mixed-lb
spec:
  host: my-service
  subsets:
  - name: stateful
    labels:
      version: v1
    trafficPolicy:
      loadBalancer:
        consistentHash:
          httpCookie:
            name: SERVERID
            ttl: 3600s
  - name: stateless
    labels:
      version: v2
    trafficPolicy:
      loadBalancer:
        simple: ROUND_ROBIN
```

## Using with VirtualService

The subsets you define here are used by VirtualService routes to direct traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-service-routing
spec:
  hosts:
  - api-service
  http:
  - route:
    - destination:
        host: api-service
        subset: stable
      weight: 95
    - destination:
        host: api-service
        subset: canary
      weight: 5
```

Each subset gets its own traffic policy applied. 95% of traffic goes to stable with relaxed limits, 5% goes to canary with strict limits.

## Verifying Per-Subset Policies

Check that Envoy created separate clusters for each subset:

```bash
istioctl proxy-config cluster <pod-name> --fqdn api-service.default.svc.cluster.local
```

You should see separate cluster entries like:
```text
outbound|80|stable|api-service.default.svc.cluster.local
outbound|80|canary|api-service.default.svc.cluster.local
```

Inspect each one to confirm the traffic policies are applied:

```bash
istioctl proxy-config cluster <pod-name> \
  --fqdn api-service.default.svc.cluster.local \
  --subset stable -o json
```

```bash
istioctl proxy-config cluster <pod-name> \
  --fqdn api-service.default.svc.cluster.local \
  --subset canary -o json
```

Compare the `lbPolicy`, `circuitBreakers`, and `outlierDetection` sections between the two.

## Port-Level Overrides Within Subsets

You can also apply different policies per port within a subset:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: multi-port-subsets
spec:
  host: my-service
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      portLevelSettings:
      - port:
          number: 8080
        connectionPool:
          http:
            http1MaxPendingRequests: 100
      - port:
          number: 8443
        connectionPool:
          http:
            http1MaxPendingRequests: 50
        tls:
          mode: ISTIO_MUTUAL
```

This is useful when your service exposes multiple ports with different characteristics.

## Common Mistakes

**Expecting deep inheritance inside a policy block**: Subsets inherit top-level traffic policies, but a subset-level `connectionPool`, `outlierDetection`, `loadBalancer`, or `tls` block replaces the corresponding top-level block. If you override one of those blocks, include the values from that block that you still need.

**Forgetting the VirtualService**: Defining subsets in a DestinationRule without a VirtualService that routes to them means the subsets are not used. Traffic goes to the top-level policy.

**Mismatched labels**: If your subset labels do not match any pods, the subset is empty. Requests routed to an empty subset return 503.

## Cleanup

```bash
kubectl delete destinationrule api-service-canary
kubectl delete virtualservice api-service-routing
```

Per-subset traffic policies are essential for progressive delivery and multi-version management. The key thing to remember is that subset policies inherit the top-level policy, and subset-level blocks replace the corresponding top-level blocks. Define the complete block for each subset-level setting that needs custom values.
