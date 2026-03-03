# How to Handle Cluster Failover in Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Failover, Multi-Cluster, High Availability, Kubernetes

Description: How to configure automatic cluster failover in Istio multi-cluster mesh so traffic shifts to healthy clusters when one cluster experiences issues.

---

One of the primary reasons to run a multi-cluster Istio mesh is high availability. If cluster A goes down (or degrades), you want traffic to automatically shift to cluster B. Istio provides the building blocks for this through locality-aware routing, outlier detection, and health checking. But you need to configure them correctly for failover to actually work.

This post covers how to set up, test, and tune cluster failover behavior.

## How Failover Works in Istio

Istio does not have a "cluster failover" switch you flip on. Instead, failover is a consequence of several features working together:

1. **Cross-cluster service discovery**: Istiod knows about endpoints in all clusters
2. **Locality labels**: Each endpoint has a region/zone/subzone locality
3. **Outlier detection**: Sidecar proxies track error rates per endpoint
4. **Locality failover settings**: Configuration that tells Istio which region to fail over to

When endpoints in one locality become unhealthy (detected via outlier detection), Istio redirects traffic to endpoints in the failover locality. Since clusters in different regions have different locality labels, this effectively creates cluster-level failover.

## Prerequisites

Your clusters need proper locality labels. Cloud providers set these automatically:

```bash
kubectl get nodes --context="${CTX_CLUSTER1}" -o jsonpath='{.items[0].metadata.labels.topology\.kubernetes\.io/region}'
# us-east-1

kubectl get nodes --context="${CTX_CLUSTER2}" -o jsonpath='{.items[0].metadata.labels.topology\.kubernetes\.io/region}'
# us-west-2
```

Services should be deployed in both clusters so there are endpoints to fail over to:

```bash
# Deploy helloworld in both clusters
kubectl apply -f samples/helloworld/helloworld.yaml -n sample --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml -n sample --context="${CTX_CLUSTER2}"
```

## Configuring Locality Failover

Create a DestinationRule with locality failover settings:

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
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
    loadBalancer:
      localityLbSetting:
        failover:
        - from: us-east-1
          to: us-west-2
        - from: us-west-2
          to: us-east-1
      simple: ROUND_ROBIN
```

Apply this to all clusters:

```bash
kubectl apply -f - -n sample --context="${CTX_CLUSTER1}" <<EOF
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: helloworld
spec:
  host: helloworld.sample.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
    loadBalancer:
      localityLbSetting:
        failover:
        - from: us-east-1
          to: us-west-2
        - from: us-west-2
          to: us-east-1
      simple: ROUND_ROBIN
EOF
```

Key configuration points:

- **`maxEjectionPercent: 100`**: This is critical. The default is 10%, which means only 10% of endpoints can be ejected. For full cluster failover, you need to allow all local endpoints to be ejected.
- **`consecutive5xxErrors: 3`**: After 3 consecutive 5xx errors from an endpoint, it gets ejected. Lower values mean faster failover but higher risk of false positives.
- **`interval: 5s`**: How often the outlier detection check runs.
- **`baseEjectionTime: 30s`**: How long an ejected endpoint stays out. After this, it gets a chance to rejoin.

## Testing Failover

To test failover, you need to make one cluster's endpoints unhealthy. The easiest way is to scale down the deployment:

```bash
# Scale down helloworld in cluster1
kubectl scale deployment helloworld-v1 -n sample --replicas=0 --context="${CTX_CLUSTER1}"
```

Now all traffic from cluster1 should go to cluster2:

```bash
for i in $(seq 1 10); do
  kubectl exec -n sample -c sleep deployment/sleep --context="${CTX_CLUSTER1}" -- \
    curl -sS helloworld.sample:5000/hello
done
```

You should see only responses from cluster2.

Restore service:

```bash
kubectl scale deployment helloworld-v1 -n sample --replicas=1 --context="${CTX_CLUSTER1}"
```

## Simulating Failures Without Scaling Down

For a more realistic test, use Istio fault injection to make local endpoints return errors:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: helloworld-fault
  namespace: sample
spec:
  hosts:
  - helloworld
  http:
  - fault:
      abort:
        httpStatus: 503
        percentage:
          value: 100
    match:
    - sourceLabels:
        app: sleep
      headers:
        x-test-failover:
          exact: "true"
    route:
    - destination:
        host: helloworld
```

This injects 503 errors only when the `x-test-failover` header is present, letting you test failover without affecting other traffic.

## Zone-Level Failover

Failover does not have to be at the region level. If your clusters span multiple availability zones within a region, you can set up zone-level failover:

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
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
    loadBalancer:
      localityLbSetting:
        failover:
        - from: us-east-1/us-east-1a
          to: us-east-1/us-east-1b
        - from: us-east-1/us-east-1b
          to: us-east-1/us-east-1a
        - from: us-east-1
          to: us-west-2
      simple: ROUND_ROBIN
```

This fails over first to another zone in the same region, then to a different region entirely.

## Failover Timing

How fast does failover happen? It depends on your outlier detection settings:

- With `consecutive5xxErrors: 3` and `interval: 5s`, the earliest an endpoint gets ejected is after 3 consecutive errors checked at 5-second intervals, which is about 15 seconds in the worst case.
- In practice, the errors happen during normal traffic, so ejection can happen faster.

For faster failover:

```yaml
outlierDetection:
  consecutive5xxErrors: 1
  interval: 1s
  baseEjectionTime: 30s
  maxEjectionPercent: 100
```

Be careful with aggressive settings. A single network hiccup could trigger failover.

## Handling Partial Failures

Sometimes a cluster does not go completely down but becomes degraded (high latency, partial errors). For this, use the `consecutiveGatewayErrors` setting:

```yaml
outlierDetection:
  consecutiveGatewayErrors: 3
  consecutive5xxErrors: 5
  interval: 5s
  baseEjectionTime: 30s
  maxEjectionPercent: 100
```

Gateway errors include 502, 503, and 504, plus connection timeouts. These often indicate infrastructure problems rather than application bugs.

## Monitoring Failover Events

Track failover in your observability stack:

```text
# Prometheus: check if traffic shifted between clusters
sum(rate(istio_requests_total{
  destination_service="helloworld.sample.svc.cluster.local",
  reporter="source"
}[5m])) by (destination_cluster)

# Check ejection events
sum(envoy_cluster_outlier_detection_ejections_active) by (pod, cluster_name)
```

Set up an alert for failover events:

```yaml
- alert: CrossClusterFailover
  expr: |
    sum(rate(istio_requests_total{
      source_cluster!=destination_cluster,
      reporter="source"
    }[5m])) /
    sum(rate(istio_requests_total{reporter="source"}[5m])) > 0.5
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "More than 50% of traffic is cross-cluster, possible failover in progress"
```

## Failback Behavior

When the failed cluster recovers, Istio automatically fails back. Ejected endpoints rejoin the load balancing pool after `baseEjectionTime` expires. The proxy retries sending traffic to them, and if they respond successfully, they stay in the pool.

You can control failback speed with `baseEjectionTime`. A shorter time means faster failback but also more flapping if the cluster is intermittently unhealthy.

## Summary

Cluster failover in Istio is built on locality-aware routing and outlier detection. Configure a DestinationRule with locality failover settings, set `maxEjectionPercent` to 100, and tune your outlier detection thresholds based on your tolerance for false positives versus failover speed. Test failover regularly - it is one of those things that needs to work when you need it most, and the only way to be confident is to actually test it.
