# How to Configure Istio Locality-Based Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Load Balancing, Service Mesh, Kubernetes, Performance Optimization

Description: Optimize cross-zone and cross-region traffic costs by implementing locality-aware load balancing in Istio service mesh deployments.

---

Locality-based load balancing in Istio prioritizes sending traffic to endpoints in the same geographic location as the client. This reduces network latency, lowers data transfer costs, and improves application performance. The feature becomes essential when running multi-zone or multi-region Kubernetes clusters.

## Understanding Locality in Kubernetes

Kubernetes assigns locality labels to nodes automatically when running on cloud providers. These labels follow a hierarchical structure: region, zone, and subzone. For example, a node might have:

```yaml
topology.kubernetes.io/region: us-east-1
topology.kubernetes.io/zone: us-east-1a
```

Istio reads these labels and propagates them to Envoy proxies. When routing traffic, Envoy considers endpoint locality and prefers nearby services. This happens transparently once you enable the feature.

Check your nodes' locality labels:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,REGION:.metadata.labels."topology\.kubernetes\.io/region",ZONE:.metadata.labels."topology\.kubernetes\.io/zone"
```

If labels are missing, your cluster might not be configured correctly or you are running on-premises without cloud provider integration.

## Enabling Basic Locality Load Balancing

Istio enables locality load balancing through DestinationRule resources. Start with a simple configuration that keeps traffic within the same zone:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews-locality
  namespace: bookinfo
spec:
  host: reviews.bookinfo.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

With this configuration, requests to the reviews service prefer endpoints in the same zone. If all local endpoints become unhealthy, Istio automatically fails over to endpoints in other zones. The outlierDetection section is critical - it ensures Istio detects and removes unhealthy endpoints quickly.

## Configuring Distribution Percentages

Sometimes you want precise control over traffic distribution across localities. Use the distribute field to specify exact percentages:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: production
spec:
  host: payment.production.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
        - from: us-east-1/us-east-1a/*
          to:
            "us-east-1/us-east-1a/*": 80
            "us-east-1/us-east-1b/*": 20
        - from: us-east-1/us-east-1b/*
          to:
            "us-east-1/us-east-1b/*": 80
            "us-east-1/us-east-1a/*": 20
    outlierDetection:
      consecutiveErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

This configuration keeps 80% of traffic local while sending 20% to a neighboring zone. This approach helps with gradual failover and provides better resilience than pure local-only routing. If one zone experiences issues, some traffic already flows to healthy zones.

The from and to fields use a three-part hierarchy: region/zone/subzone. The asterisk acts as a wildcard, matching any value at that level.

## Implementing Failover Strategies

Define explicit failover behavior when local endpoints are unavailable:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: database-service
  namespace: data
spec:
  host: postgres.data.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
        - from: us-west-2
          to: us-east-1
        - from: eu-west-1
          to: eu-central-1
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http2MaxRequests: 1000
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutiveErrors: 5
      interval: 5s
      baseEjectionTime: 1m
      maxEjectionPercent: 100
```

The failover list defines region-level backup routing. If all endpoints in us-west-2 fail, traffic automatically routes to us-east-1. This provides disaster recovery at the service mesh level without application changes.

Note the outlierDetection settings - they are more aggressive than previous examples. For critical services like databases, you want fast detection of problems and complete ejection of unhealthy endpoints.

## Handling Cross-Region Traffic

Cross-region traffic incurs significant latency and cost penalties. Use locality load balancing to minimize it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-gateway
  namespace: gateway
spec:
  host: api.gateway.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
        - from: us-east-1/*/*
          to:
            "us-east-1/*/*": 100
        - from: us-west-2/*/*
          to:
            "us-west-2/*/*": 100
        - from: eu-west-1/*/*
          to:
            "eu-west-1/*/*": 100
        failoverPriority:
        - "us-east-1/us-east-1a"
        - "us-east-1/us-east-1b"
        - "us-west-2/us-west-2a"
    outlierDetection:
      consecutiveErrors: 10
      interval: 1m
      baseEjectionTime: 5m
```

This strict configuration keeps all traffic within the same region. The double wildcards match any zone and subzone within the region. Only catastrophic regional failures trigger cross-region failover.

The failoverPriority list defines which zones to try in order during failures. Istio attempts each zone before moving to the next region.

## Testing Locality Configuration

Verify locality load balancing works by examining Envoy statistics:

```bash
# Get a pod name
POD=$(kubectl get pod -n bookinfo -l app=productpage -o jsonpath='{.items[0].metadata.name}')

# Check Envoy locality stats
kubectl exec -n bookinfo $POD -c istio-proxy -- \
  curl -s localhost:15000/clusters | grep reviews

# Look for locality information
kubectl exec -n bookinfo $POD -c istio-proxy -- \
  curl -s localhost:15000/clusters | grep -A 5 "reviews.bookinfo.svc.cluster.local"
```

The output shows endpoint localities and request distribution. Look for the locality field in each endpoint definition. Envoy includes counters showing how many requests went to each locality.

Generate test traffic and monitor which endpoints receive requests:

```bash
# Send requests in a loop
for i in {1..100}; do
  kubectl exec -n bookinfo $POD -c productpage -- \
    curl -s http://reviews:9080/reviews/1 > /dev/null
done

# Check locality distribution
kubectl exec -n bookinfo $POD -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "reviews.*zone"
```

You should see most requests hitting local zone endpoints unless you configured specific distribution percentages.

## Combining with Traffic Splitting

Locality load balancing works alongside other traffic management features. Combine it with traffic splitting for canary deployments:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews-canary
  namespace: bookinfo
spec:
  hosts:
  - reviews
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: reviews
        subset: v2
  - route:
    - destination:
        host: reviews
        subset: v1
      weight: 90
    - destination:
        host: reviews
        subset: v2
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews-locality-subsets
  namespace: bookinfo
spec:
  host: reviews.bookinfo.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Traffic first splits between versions according to weights, then each version's traffic prefers local endpoints. This provides both controlled rollouts and geographic optimization.

## Monitoring Locality Performance

Track locality load balancing effectiveness with Prometheus queries:

```promql
# Requests by source and destination locality
sum(rate(istio_requests_total[5m])) by (
  source_workload_namespace,
  source_workload,
  destination_service_name,
  source_canonical_revision,
  destination_canonical_revision
)

# Cross-zone traffic percentage
sum(rate(istio_requests_total{
  source_cluster!="",
  destination_cluster!=""
}[5m])) by (source_cluster, destination_cluster)
```

Create dashboards showing traffic flow between localities. Alert on unexpected cross-region traffic, which often indicates misconfigurations or capacity problems.

## Debugging Locality Issues

When locality load balancing does not work as expected, check several common problems. First, verify pods have locality labels:

```bash
kubectl get pods -n bookinfo -o custom-columns=\
NAME:.metadata.name,\
REGION:.metadata.labels."topology\.kubernetes\.io/region",\
ZONE:.metadata.labels."topology\.kubernetes\.io/zone"
```

If pods lack these labels, Istio cannot make locality-aware decisions. Check that nodes have the labels and pods inherit them.

Next, examine the Envoy configuration directly:

```bash
istioctl proxy-config endpoints $POD -n bookinfo --cluster "outbound|9080||reviews.bookinfo.svc.cluster.local" -o json
```

Look for the locality field in each endpoint. It should match the node's locality labels. If localities are missing or incorrect, the issue is in the Kubernetes to Envoy label propagation.

## Optimizing for Cost

Cloud providers charge for cross-zone and cross-region data transfer. Locality load balancing directly reduces these costs:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: cost-optimized
  namespace: production
spec:
  host: "*.production.svc.cluster.local"
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        # Keep everything local unless there's a failure
        distribute:
        - from: "*/*/*/*"
          to:
            "*/*/*/*": 100
    outlierDetection:
      consecutiveErrors: 1
      interval: 1s
      baseEjectionTime: 3m
      maxEjectionPercent: 100
```

This wildcard DestinationRule applies to all services in the production namespace. It aggressively keeps traffic local, ejecting unhealthy endpoints quickly to minimize unnecessary cross-zone traffic.

Monitor your cloud provider's billing data to verify cost reductions. Most providers break down network charges by traffic type, making locality optimization benefits visible.

Locality-based load balancing is a critical feature for production Istio deployments spanning multiple zones or regions. It reduces latency, cuts costs, and improves resilience without requiring application code changes.
