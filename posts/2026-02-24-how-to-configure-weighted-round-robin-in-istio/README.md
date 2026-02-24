# How to Configure Weighted Round Robin in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Kubernetes, Traffic Management, Service Mesh

Description: Learn how to configure weighted round robin load balancing in Istio to distribute traffic proportionally across service endpoints.

---

When you have multiple versions of a service running, or your pods have different resource capacities, a simple round-robin approach might not cut it. You want to send more traffic to beefier instances and less to smaller ones. That's where weighted round robin comes in, and Istio makes this pretty straightforward through its traffic management APIs.

## Understanding Weighted Round Robin

Round robin is the default load balancing algorithm in most systems. It just cycles through available endpoints one by one. Weighted round robin adds a twist: each endpoint gets a weight, and the load balancer sends traffic proportionally based on those weights.

For example, if endpoint A has weight 3 and endpoint B has weight 1, then out of every 4 requests, 3 go to A and 1 goes to B.

In Istio, you achieve weighted routing primarily through `VirtualService` and `DestinationRule` resources. The `VirtualService` handles weight-based routing between subsets, while the `DestinationRule` defines those subsets and their load balancing policies.

## Setting Up Subsets with DestinationRule

First, you need to define your service subsets. Suppose you have a `payment-service` with two versions deployed:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: default
spec:
  host: payment-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

This DestinationRule creates two subsets based on pod labels. The `ROUND_ROBIN` policy applies within each subset, meaning traffic sent to a subset gets distributed evenly across pods in that subset.

## Configuring Weighted Traffic Split

Now you set up the VirtualService to split traffic between these subsets with specific weights:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service-vs
  namespace: default
spec:
  hosts:
    - payment-service
  http:
    - route:
        - destination:
            host: payment-service
            subset: v1
          weight: 80
        - destination:
            host: payment-service
            subset: v2
          weight: 20
```

This sends 80% of traffic to v1 and 20% to v2. The weights must add up to 100. Istio's sidecar proxy (Envoy) handles the actual distribution.

## Combining Weights with Per-Subset Load Balancing

You can get more granular by applying different load balancing policies to each subset. Maybe v1 has heterogeneous pods and you want least connections there, while v2 is uniform so round robin is fine:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: default
spec:
  host: payment-service
  subsets:
    - name: v1
      labels:
        version: v1
      trafficPolicy:
        loadBalancer:
          simple: LEAST_REQUEST
    - name: v2
      labels:
        version: v2
      trafficPolicy:
        loadBalancer:
          simple: ROUND_ROBIN
```

With this setup, the VirtualService still controls the 80/20 split between subsets, but each subset uses its own algorithm internally.

## Practical Example: Canary Deployment

A common use case for weighted round robin is canary deployments. You roll out a new version to a small percentage of traffic, monitor it, and gradually increase:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-gateway-vs
  namespace: production
spec:
  hosts:
    - api-gateway
  http:
    - route:
        - destination:
            host: api-gateway
            subset: stable
          weight: 95
        - destination:
            host: api-gateway
            subset: canary
          weight: 5
```

Start with 5% on canary. If metrics look good, bump it up:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-gateway-vs
  namespace: production
spec:
  hosts:
    - api-gateway
  http:
    - route:
        - destination:
            host: api-gateway
            subset: stable
          weight: 70
        - destination:
            host: api-gateway
            subset: canary
          weight: 30
EOF
```

## Verifying Your Configuration

After applying the resources, verify everything is configured correctly:

```bash
# Check the VirtualService
kubectl get virtualservice payment-service-vs -o yaml

# Check the DestinationRule
kubectl get destinationrule payment-service-dr -o yaml

# Validate with istioctl
istioctl analyze -n default
```

You can also check the Envoy proxy configuration to confirm the weights are applied:

```bash
istioctl proxy-config routes <pod-name> -o json
```

Look for the `weightedClusters` section in the output. You should see your subsets listed with their respective weights.

## Testing the Distribution

To verify traffic is being distributed according to your weights, you can generate some test traffic and check the results:

```bash
# Send 100 requests and count responses from each version
for i in $(seq 1 100); do
  curl -s http://payment-service/health | grep -o '"version":"[^"]*"'
done | sort | uniq -c
```

If your weights are 80/20, you should see roughly 80 responses from v1 and 20 from v2. It won't be exact because weighted round robin is probabilistic at small sample sizes.

## Handling Edge Cases

There are a few things to watch out for when using weighted routing.

**Weights must sum to 100.** If they don't, Istio normalizes them, but your configuration might not behave as expected. Always be explicit.

**Zero-weight subsets still exist.** If you set a weight to 0, that subset receives no traffic from this route, but the pods are still running and consuming resources. This is useful during migrations but remember to clean up.

**Connection pooling interacts with weights.** If you have long-lived connections (like gRPC streams), the weight distribution might not be as precise because connections aren't re-balanced on every request. For gRPC, consider using `LEAST_REQUEST` within subsets to improve distribution.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-service-dr
  namespace: default
spec:
  host: grpc-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

## Monitoring Weighted Distribution

Use Istio's built-in telemetry to monitor how traffic is actually being distributed. If you have Prometheus and Grafana set up, query for request counts per destination:

```promql
sum(rate(istio_requests_total{destination_service="payment-service.default.svc.cluster.local"}[5m])) by (destination_version)
```

This gives you the actual request rate broken down by version, so you can confirm your weights are working as intended.

## Summary

Weighted round robin in Istio boils down to two resources: a `DestinationRule` that defines your subsets and their per-subset load balancing policies, and a `VirtualService` that controls the traffic split between those subsets. The approach works well for canary deployments, gradual migrations, and routing more traffic to higher-capacity pods. Just remember to validate your configuration with `istioctl analyze` and monitor the actual distribution to make sure everything behaves as expected.
