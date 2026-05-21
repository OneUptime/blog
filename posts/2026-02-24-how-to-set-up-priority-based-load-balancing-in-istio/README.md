# How to Set Up Priority-Based Load Balancing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Kubernetes, Traffic Management, Priority Routing

Description: A practical guide to setting up priority-based load balancing in Istio using locality-aware routing and failover configurations.

---

Not all endpoints are created equal. Sometimes you want Istio to prefer certain backends over others, falling back to lower-priority ones only when the preferred backends are unavailable or unhealthy. Istio supports this through locality-aware load balancing and failover rules, which let you set up a priority hierarchy for your service endpoints.

## How Priority-Based Load Balancing Works in Istio

Istio doesn't have a single numeric "priority" field you can slap on a DestinationRule. Instead, priority-based routing is achieved through a combination of locality load balancing settings, outlier detection, and traffic policy configuration. The idea is that Envoy (Istio's data plane proxy) prefers endpoints in the same locality and only fails over to other localities when higher-priority endpoints become unhealthy.

Istio and Envoy localities follow a three-level hierarchy: region, zone, and sub-zone. In Kubernetes, the standard node topology labels cover region and zone; Istio can also use `topology.istio.io/subzone` when you need a sub-zone level. You assign priorities by controlling how traffic distributes across these localities.

## Prerequisites

Make sure your Kubernetes nodes have the standard topology labels:

```bash
kubectl get nodes --show-labels | grep topology
```

You should see labels like:

```text
topology.kubernetes.io/region=us-east-1
topology.kubernetes.io/zone=us-east-1a
```

If these labels aren't present, add them to your nodes:

```bash
kubectl label node worker-1 topology.kubernetes.io/region=us-east-1
kubectl label node worker-1 topology.kubernetes.io/zone=us-east-1a
```

## Configuring Locality-Based Priority

Here is how you set up a DestinationRule that prioritizes local endpoints and defines failover behavior:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service-dr
  namespace: default
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-east-1
            to: us-west-2
          - from: us-west-2
            to: us-east-1
      simple: ROUND_ROBIN
```

The `localityLbSetting` with `enabled: true` tells Envoy to prefer endpoints in the same locality. Zone and sub-zone failover are supported by default; the `failover` block defines which region traffic should use when endpoints in the local region become unhealthy. This creates an implicit priority chain such as same zone > same region in another zone > configured failover region.

Outlier detection is required here. Without it, Envoy can't determine when endpoints are unhealthy, so it won't trigger failover.

## Explicit Traffic Distribution

For more control over priority, use the `distribute` field instead of `failover`. This lets you specify exact percentages for how traffic from one locality should be distributed:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service-dr
  namespace: default
spec:
  host: order-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
          - from: "us-east-1/us-east-1a/*"
            to:
              "us-east-1/us-east-1a/*": 80
              "us-east-1/us-east-1b/*": 15
              "us-west-2/us-west-2a/*": 5
          - from: "us-east-1/us-east-1b/*"
            to:
              "us-east-1/us-east-1b/*": 80
              "us-east-1/us-east-1a/*": 15
              "us-west-2/us-west-2a/*": 5
      simple: ROUND_ROBIN
```

This explicitly says: traffic originating from us-east-1a should go 80% to local endpoints, 15% to us-east-1b, and 5% to us-west-2a. This gives you a weighted locality preference. It is not strict failover: some traffic still goes to the lower-weighted localities while all of those endpoints are healthy.

## Priority with Subsets

You can combine locality-based priority with subset routing. This is useful when you have multiple versions and want priority behavior within each version:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: catalog-service-dr
  namespace: default
spec:
  host: catalog-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 15s
      baseEjectionTime: 60s
  subsets:
    - name: primary
      labels:
        version: v2
      trafficPolicy:
        loadBalancer:
          localityLbSetting:
            enabled: true
            failover:
              - from: us-east-1
                to: us-west-2
          simple: LEAST_REQUEST
    - name: fallback
      labels:
        version: v1
      trafficPolicy:
        loadBalancer:
          simple: ROUND_ROBIN
```

Then in your VirtualService, you route traffic to `primary`. The `fallback` subset is available for a separate route or for a later weight change if you need to shift traffic back to v1:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: catalog-service-vs
  namespace: default
spec:
  hosts:
    - catalog-service
  http:
    - route:
        - destination:
            host: catalog-service
            subset: primary
          weight: 100
      retries:
        attempts: 3
        retryOn: 5xx
```

## Using Priority with Health Checks

For priority-based load balancing to work correctly, you need proper health checking. Outlier detection handles this on the Envoy side, but your services also need Kubernetes readiness probes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: example/order-service:1.0.0
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
```

Without readiness probes, Kubernetes might send traffic to pods that aren't ready, which defeats the purpose of priority-based routing.

## Verifying Priority Routing

Check that locality information is properly propagated to Envoy:

```bash
# See the cluster endpoints and their priorities

istioctl proxy-config endpoints <pod-name> --cluster "outbound|80||order-service.default.svc.cluster.local"
```

In the output, check the endpoint status and outlier check results. For priority details, inspect the endpoint configuration as JSON and look at the `priority` values on the locality endpoint groups; same-locality endpoints should have priority 0 (highest), while lower-priority endpoint groups get higher numbers.

You can also check the load balancing configuration:

```bash
istioctl proxy-config endpoints <pod-name> --cluster "outbound|80||order-service.default.svc.cluster.local" -o json
```

## Troubleshooting Priority Issues

If traffic isn't following your priority rules, check these common issues:

1. **Outlier detection not configured**: Locality-based failover requires outlier detection. Without it, Envoy will not eject unhealthy endpoints and the configured failover policy will not take effect.

2. **Missing topology labels**: Verify your nodes have the right labels. Envoy needs this information to determine locality.

3. **Not enough healthy endpoints**: If all high-priority endpoints are ejected, traffic falls through to the next priority level. Check your outlier detection thresholds.

```bash
# Check Envoy stats for outlier detection
istioctl proxy-config log <pod-name> --level upstream:debug

# View endpoint health
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/clusters | grep health
```

4. **Distribute vs failover conflict**: You can use only one of `distribute`, `failover`, or `failoverPriority` in a locality setting. If you specify more than one, the configuration will be rejected.

## Summary

Priority-based load balancing in Istio works through locality-aware routing. You define priorities implicitly through locality hierarchies, use `distribute` for weighted locality preferences, or use `failover` to constrain regional failover behavior in your DestinationRule. The key ingredient is outlier detection, which must be enabled for Envoy to know when to fail over from high-priority to lower-priority endpoints. Combine this with proper Kubernetes health probes and topology labels, and you get a system that always tries to use the best available endpoints first.
