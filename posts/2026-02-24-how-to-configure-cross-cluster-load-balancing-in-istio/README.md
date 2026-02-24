# How to Configure Cross-Cluster Load Balancing in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Multi-Cluster, Kubernetes, Locality

Description: Guide to configuring and tuning load balancing behavior across clusters in an Istio multi-cluster mesh, including locality-aware routing and failover.

---

Once you have cross-cluster service discovery set up in Istio, traffic automatically distributes across endpoints in all clusters. But the default behavior might not be what you want. Maybe you want to prefer local endpoints to minimize latency. Maybe you want specific failover behavior. Or maybe you need weighted distribution across regions.

Istio gives you fine-grained control over cross-cluster load balancing through locality-aware routing, destination rules, and outlier detection. Here is how to configure all of it.

## Default Cross-Cluster Load Balancing Behavior

By default, when Istio merges endpoints from multiple clusters, it treats them all equally. A round-robin distribution happens across all healthy endpoints regardless of which cluster they live in.

If you have 3 replicas in cluster1 (us-east) and 3 replicas in cluster2 (us-west), traffic from a client in cluster1 splits roughly 50/50 between the two clusters. This might not be ideal because every request that goes cross-cluster adds latency.

## Locality-Aware Load Balancing

Istio supports locality-aware routing based on the `region/zone/subzone` labels on your Kubernetes nodes. Nodes in most cloud providers are automatically labeled with:

- `topology.kubernetes.io/region` (e.g., `us-east-1`)
- `topology.kubernetes.io/zone` (e.g., `us-east-1a`)

Verify your node labels:

```bash
kubectl get nodes --show-labels --context="${CTX_CLUSTER1}" | grep topology
```

To enable locality-aware routing, you need a DestinationRule with outlier detection. The outlier detection is required because Istio needs a way to determine if local endpoints are healthy before it falls back to remote ones:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: helloworld
  namespace: sample
spec:
  host: helloworld.sample.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

With this DestinationRule in place, Istio will:

1. Prefer endpoints in the same locality (region/zone) as the caller
2. If local endpoints are unhealthy (ejected by outlier detection), spill over to the next closest locality
3. As a last resort, send traffic to any available endpoint

## Configuring Locality Failover

You can explicitly configure the failover order using the `localityLbSetting` in a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: helloworld
  namespace: sample
spec:
  host: helloworld.sample.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        failover:
        - from: us-east-1
          to: us-west-2
        - from: us-west-2
          to: us-east-1
      simple: ROUND_ROBIN
```

This tells Istio that if endpoints in `us-east-1` are all unhealthy, fail over to `us-west-2`, and vice versa.

## Weighted Distribution Across Regions

Sometimes you do not want strict locality preference. Instead, you want to distribute a specific percentage of traffic across regions. This is useful for canary deployments across clusters or for balancing load when one cluster has more capacity:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: helloworld
  namespace: sample
spec:
  host: helloworld.sample.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        distribute:
        - from: "us-east-1/*"
          to:
            "us-east-1/*": 80
            "us-west-2/*": 20
        - from: "us-west-2/*"
          to:
            "us-west-2/*": 80
            "us-east-1/*": 20
      simple: ROUND_ROBIN
```

This sends 80% of traffic to local endpoints and 20% to the remote cluster, regardless of health status. It is a great way to keep the remote cluster warm and ready for failover.

## Cross-Cluster Load Balancing Algorithms

Istio supports several load balancing algorithms that you can configure in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: helloworld
  namespace: sample
spec:
  host: helloworld.sample.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

Available options:
- `ROUND_ROBIN` - rotates through all endpoints (default)
- `LEAST_REQUEST` - sends to the endpoint with the fewest active requests
- `RANDOM` - randomly picks an endpoint
- `PASSTHROUGH` - connects directly to the original destination (no load balancing)

For cross-cluster scenarios, `LEAST_REQUEST` often works well because it naturally accounts for the higher latency of cross-cluster endpoints. Endpoints in the remote cluster will typically have higher response times, so fewer requests get queued there.

## Outlier Detection for Cross-Cluster Health

Outlier detection is critical for cross-cluster load balancing. Without it, Istio cannot know when to stop sending traffic to unhealthy endpoints in a remote cluster:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews
  namespace: bookinfo
spec:
  host: reviews.bookinfo.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      splitExternalLocalOriginErrors: true
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 100
```

Key settings:
- `consecutive5xxErrors`: How many errors before ejecting an endpoint
- `interval`: How often to check for errors
- `baseEjectionTime`: How long to eject an unhealthy endpoint
- `maxEjectionPercent`: Maximum percentage of endpoints that can be ejected (prevents ejecting everything)

## Verifying Load Balancing Distribution

To check how traffic is actually being distributed, look at the Envoy stats:

```bash
# Check endpoint health status
istioctl proxy-config endpoints deployment/sleep -n sample --context="${CTX_CLUSTER1}" | grep helloworld

# Check cluster stats
kubectl exec -n sample -c istio-proxy \
  "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context=${CTX_CLUSTER1})" \
  --context="${CTX_CLUSTER1}" -- \
  pilot-agent request GET stats | grep helloworld | grep upstream_rq
```

For more detailed observability, use Kiali or Prometheus to track request distribution across clusters. You can query the `istio_requests_total` metric and group by `destination_cluster`:

```bash
# Prometheus query
sum(rate(istio_requests_total{destination_service="helloworld.sample.svc.cluster.local"}[5m])) by (destination_cluster)
```

## Summary

Cross-cluster load balancing in Istio is highly configurable. The default is equal distribution, but you can enable locality-aware routing for latency optimization, set up explicit failover chains, or use weighted distribution for traffic splitting. The key requirement is outlier detection - without it, Istio has no health signal to drive load balancing decisions across clusters. Start with locality-aware routing and outlier detection, and tune from there based on your latency and availability requirements.
