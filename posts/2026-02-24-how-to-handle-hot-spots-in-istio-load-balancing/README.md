# How to Handle Hot Spots in Istio Load Balancing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Hot Spots, Performance, Kubernetes

Description: Identify and resolve hot spot problems in Istio load balancing where some pods receive disproportionately more traffic than others.

---

A hot spot happens when one or a few pods in your service get way more traffic than the rest. The "hot" pods become resource-constrained, their response times degrade, and the overall service quality drops even though you have plenty of capacity sitting idle on other pods. This is a common problem in Istio deployments, and it can be tricky to diagnose because everything looks fine from the Kubernetes perspective.

## Identifying Hot Spots

The first step is confirming you actually have a hot spot. Look at per-pod request rates:

```bash
# Check Envoy stats for a specific upstream service
kubectl exec <client-pod> -c istio-proxy -- curl -s localhost:15000/clusters | grep "my-service" | grep "rq_total"
```

In Prometheus, you can see the distribution more clearly:

```promql
# Request rate per pod
sum(rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local"}[5m])) by (destination_workload, pod)
```

If one pod shows 3x the request rate of others, you have a hot spot.

Also check response latencies per pod:

```promql
# P99 latency per pod
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="my-service.default.svc.cluster.local"}[5m])) by (le, pod))
```

The hot pod will typically show higher latencies because it's processing more requests with the same resources.

## Common Causes and Their Fixes

### Cause 1: Consistent Hashing with Uneven Keys

If you're using consistent hash-based load balancing and your hash keys are unevenly distributed, you'll get hot spots by design.

```yaml
# This can cause hot spots if tenant IDs are unevenly distributed
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-tenant-id
```

If one tenant generates 60% of your traffic, the pod assigned to that tenant's hash becomes a hot spot.

**Fix**: Switch to a more granular hash key (like request ID or user ID) or use `LEAST_REQUEST` if you don't strictly need hash-based affinity:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

### Cause 2: Long-Lived gRPC or HTTP/2 Connections

gRPC uses HTTP/2 with long-lived connections. When a connection is established, it's assigned to a specific pod. If one client sends a lot of requests on a single connection, that pod becomes a hot spot.

**Fix**: Limit the number of requests per connection to force periodic reconnection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-service-dr
spec:
  host: grpc-service
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 100
    loadBalancer:
      simple: LEAST_REQUEST
```

After 100 requests, the connection is closed and a new one is established, potentially to a different pod. Combined with `LEAST_REQUEST`, this ensures traffic rebalances regularly.

### Cause 3: Pod Startup Timing

When a deployment rolls out, new pods come online gradually. The first pods to become ready absorb all the traffic while others are still starting. If the load is heavy enough, these early pods get overwhelmed and may never recover because they're constantly processing a backlog.

**Fix**: Use a slow start mode (if available) or configure readiness probes with appropriate timing:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      containers:
        - name: my-service
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 20
            periodSeconds: 5
```

Also consider using a PodDisruptionBudget to ensure rolling updates don't create capacity bottlenecks:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-service-pdb
spec:
  minAvailable: 75%
  selector:
    matchLabels:
      app: my-service
```

### Cause 4: Locality-Aware Routing Imbalance

If locality-aware load balancing is enabled and you have an uneven number of pods per zone, the zone with fewer pods will have hotter instances:

```text
Zone A: 5 pods, receives 50% of traffic -> 10% per pod
Zone B: 2 pods, receives 50% of traffic -> 25% per pod
```

**Fix**: Either ensure equal pod distribution per zone or adjust your locality distribution settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
spec:
  host: my-service
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
              "us-east-1/us-east-1a/*": 70
              "us-east-1/us-east-1b/*": 30
      simple: LEAST_REQUEST
```

You can also use topology spread constraints in your Deployment to ensure even pod distribution:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: my-service
```

### Cause 5: Headless Services Without Proper Configuration

If your service is headless (clusterIP: None) and you're relying on DNS-based load balancing instead of Envoy, the DNS resolver might cache a single endpoint and send all traffic there.

**Fix**: Make sure your service has a ClusterIP so that Istio's proxy handles load balancing:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: my-service
```

## Monitoring for Hot Spots Proactively

Set up alerting to catch hot spots before they cause problems:

```yaml
# Prometheus alert rule
groups:
  - name: istio-load-balancing
    rules:
      - alert: LoadBalancingHotSpot
        expr: |
          max(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
          /
          avg(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
          > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Hot spot detected in {{ $labels.destination_service }}"
          description: "The busiest pod is receiving more than 2x the average traffic"
```

This alert fires when any pod is receiving more than twice the average request rate for its service.

## Summary

Hot spots in Istio load balancing typically come from uneven hash keys, long-lived connections, startup timing issues, or imbalanced locality distribution. The most effective general fix is switching to `LEAST_REQUEST` load balancing and setting `maxRequestsPerConnection` to force periodic connection rotation. For locality-based issues, use topology spread constraints and adjust your distribution settings. Monitor per-pod request rates and set up alerts to catch hot spots early, before they degrade your service quality.
