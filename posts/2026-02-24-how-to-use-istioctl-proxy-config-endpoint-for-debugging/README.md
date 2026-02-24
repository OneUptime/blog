# How to Use istioctl proxy-config endpoint for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, istioctl, Envoy, Endpoints, Kubernetes

Description: How to use istioctl proxy-config endpoint to inspect upstream endpoint discovery and debug load balancing issues in Istio.

---

Endpoints are the actual pod IP addresses and ports that Envoy routes traffic to. Even if your clusters, listeners, and routes are all configured correctly, traffic will fail if the endpoint list is wrong or empty. The `istioctl proxy-config endpoint` command shows you exactly which backend instances each proxy knows about and their health status.

This is the command to reach for when you see errors like "no healthy upstream" or when traffic is not being distributed across all replicas of a service.

## Basic Usage

```bash
istioctl proxy-config endpoint <pod-name>.<namespace>
```

Example:

```bash
istioctl proxy-config endpoint productpage-v1-6b746f74dc-9rlmh.bookinfo
```

Output:

```
ENDPOINT                         STATUS      OUTLIER CHECK     CLUSTER
10.244.0.15:9080                 HEALTHY     OK                outbound|9080||details.bookinfo.svc.cluster.local
10.244.0.16:9080                 HEALTHY     OK                outbound|9080||ratings.bookinfo.svc.cluster.local
10.244.0.17:9080                 HEALTHY     OK                outbound|9080||reviews.bookinfo.svc.cluster.local
10.244.0.17:9080                 HEALTHY     OK                outbound|9080|v1|reviews.bookinfo.svc.cluster.local
10.244.0.18:9080                 HEALTHY     OK                outbound|9080||reviews.bookinfo.svc.cluster.local
10.244.0.18:9080                 HEALTHY     OK                outbound|9080|v2|reviews.bookinfo.svc.cluster.local
10.244.0.19:9080                 HEALTHY     OK                outbound|9080||reviews.bookinfo.svc.cluster.local
10.244.0.19:9080                 HEALTHY     OK                outbound|9080|v3|reviews.bookinfo.svc.cluster.local
10.244.0.20:9080                 HEALTHY     OK                outbound|9080||productpage.bookinfo.svc.cluster.local
127.0.0.1:15000                  HEALTHY     OK                prometheus_stats
127.0.0.1:15020                  HEALTHY     OK                agent
```

## Understanding the Output

**ENDPOINT**: The IP address and port of a backend pod.

**STATUS**: The health status of the endpoint as seen by Envoy.
- `HEALTHY`: The endpoint is available and accepting traffic.
- `UNHEALTHY`: The endpoint has failed health checks.
- `DRAINING`: The endpoint is being removed (pod is shutting down).
- `TIMEOUT`: Health check timed out.
- `DEGRADED`: The endpoint is functional but degraded.

**OUTLIER CHECK**: Whether the outlier detection system (circuit breaker) has flagged this endpoint.
- `OK`: The endpoint is in the active rotation.
- `FAILED`: The endpoint has been ejected by outlier detection due to consecutive errors.

**CLUSTER**: Which Envoy cluster this endpoint belongs to. This matches the cluster names from `proxy-config cluster`.

## Debugging Empty Endpoints

If a cluster has no endpoints, traffic to that service will fail. Check if a service has endpoints:

```bash
istioctl proxy-config endpoint productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --cluster "outbound|9080||reviews.bookinfo.svc.cluster.local"
```

If this returns nothing, the proxy does not know about any reviews pods. Verify the Kubernetes endpoints exist:

```bash
kubectl get endpoints reviews -n bookinfo
```

If the Kubernetes endpoints exist but Envoy does not have them, there might be a sync issue between istiod and the proxy:

```bash
# Check proxy-status for EDS sync
istioctl proxy-status productpage-v1-6b746f74dc-9rlmh.bookinfo
```

If EDS shows STALE, the endpoint discovery is not syncing properly.

## Debugging Endpoint Health

When some replicas are not receiving traffic, check if they are marked unhealthy:

```bash
istioctl proxy-config endpoint productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --cluster "outbound|9080||reviews.bookinfo.svc.cluster.local" \
  --status unhealthy
```

If endpoints are unhealthy, check why:

1. **Pod is not ready**: The Kubernetes readiness probe is failing

```bash
kubectl get pods -n bookinfo -l app=reviews -o wide
kubectl describe pod <unhealthy-pod> -n bookinfo
```

2. **Outlier detection ejected the endpoint**: Too many consecutive errors

```bash
istioctl proxy-config endpoint productpage-v1-6b746f74dc-9rlmh.bookinfo | \
  grep reviews | grep FAILED
```

## Debugging Outlier Detection Ejections

When an endpoint shows `FAILED` in the OUTLIER CHECK column, it has been ejected by the circuit breaker:

```
ENDPOINT           STATUS      OUTLIER CHECK     CLUSTER
10.244.0.17:9080   HEALTHY     FAILED            outbound|9080||reviews.bookinfo.svc.cluster.local
10.244.0.18:9080   HEALTHY     OK                outbound|9080||reviews.bookinfo.svc.cluster.local
10.244.0.19:9080   HEALTHY     OK                outbound|9080||reviews.bookinfo.svc.cluster.local
```

The endpoint 10.244.0.17 is still marked HEALTHY by Kubernetes but has been ejected by Envoy's outlier detection because it returned too many errors. Check the outlier detection configuration:

```bash
istioctl proxy-config cluster productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --fqdn "reviews.bookinfo.svc.cluster.local" -o json | grep -A10 "outlierDetection"
```

To see the outlier detection stats:

```bash
kubectl exec -n bookinfo productpage-v1-6b746f74dc-9rlmh -c istio-proxy -- \
  pilot-agent request GET stats | grep outlier
```

## Debugging Subset Endpoints

When using DestinationRule subsets, each subset has its own set of endpoints. Verify the right pods are in each subset:

```bash
# All reviews endpoints
istioctl proxy-config endpoint productpage-v1-6b746f74dc-9rlmh.bookinfo | grep reviews

# v1 subset only
istioctl proxy-config endpoint productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --cluster "outbound|9080|v1|reviews.bookinfo.svc.cluster.local"

# v2 subset only
istioctl proxy-config endpoint productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --cluster "outbound|9080|v2|reviews.bookinfo.svc.cluster.local"
```

If a subset has no endpoints, it means no pods match the subset's label selector in the DestinationRule:

```bash
# Check what labels the subset expects
kubectl get destinationrule reviews -n bookinfo -o yaml

# Check what labels the pods actually have
kubectl get pods -n bookinfo -l app=reviews --show-labels
```

## Debugging Load Balancing

If traffic is not being distributed evenly across endpoints, the endpoint list tells you what Envoy is working with:

```bash
istioctl proxy-config endpoint productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --cluster "outbound|9080||reviews.bookinfo.svc.cluster.local"
```

All endpoints should show HEALTHY and OK. If some are missing or unhealthy, Envoy will not route traffic to them.

For locality-aware load balancing, endpoints may be weighted differently based on zone or region. Check the full endpoint config:

```bash
istioctl proxy-config endpoint productpage-v1-6b746f74dc-9rlmh.bookinfo \
  --cluster "outbound|9080||reviews.bookinfo.svc.cluster.local" -o json
```

Look for `locality` information in the endpoint metadata:

```json
{
  "endpoint": {
    "address": {
      "socketAddress": {
        "address": "10.244.0.17",
        "portValue": 9080
      }
    }
  },
  "healthStatus": "HEALTHY",
  "metadata": {
    "filterMetadata": {
      "istio": {
        "workload": "reviews-v1"
      }
    }
  },
  "locality": {
    "region": "us-east-1",
    "zone": "us-east-1a"
  }
}
```

## Tracking Endpoint Changes

During deployments or scaling events, endpoints change. You can watch endpoints over time by running the command repeatedly:

```bash
while true; do
  echo "=== $(date) ==="
  istioctl proxy-config endpoint productpage-v1-6b746f74dc-9rlmh.bookinfo \
    --cluster "outbound|9080||reviews.bookinfo.svc.cluster.local"
  sleep 5
done
```

This helps you see when new endpoints appear (scale up) or disappear (scale down, rolling update) and how quickly the proxy picks up the changes.

## Filtering Endpoints

```bash
# Filter by cluster name
istioctl proxy-config endpoint <pod>.<ns> --cluster "outbound|9080||reviews"

# Filter by status
istioctl proxy-config endpoint <pod>.<ns> --status healthy

# Filter by port
istioctl proxy-config endpoint <pod>.<ns> --port 9080

# Full JSON output
istioctl proxy-config endpoint <pod>.<ns> -o json
```

The endpoint configuration is the final piece of the routing puzzle. After verifying clusters, listeners, and routes, checking endpoints tells you whether the proxy can actually reach the backend pods. If the endpoints are wrong, empty, or unhealthy, that is your root cause.
