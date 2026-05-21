# How to Handle Uneven Load Distribution in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancing, Kubernetes, Performance, Troubleshooting

Description: Practical strategies for identifying and fixing uneven load distribution problems in Istio service mesh deployments.

---

You deploy your service with five replicas, set up Istio, and expect traffic to spread evenly. But when you look at the metrics, one pod is getting hammered while others are barely doing anything. Uneven load distribution is one of the most frustrating issues in service mesh deployments, and it can happen for several reasons. Here is how to identify the problem and fix it.

## Why Does Uneven Load Distribution Happen?

Before jumping into fixes, it helps to understand what causes the imbalance. There are several common culprits:

**Long-lived connections**: gRPC, WebSocket, and HTTP/2 connections stay open for a long time. The load balancer assigns the connection once, and all subsequent requests on that connection go to the same pod. If you have 100 connections spread across 5 pods but one connection carries 80% of the traffic, you get a massive imbalance.

**Consistent hashing**: If you're using consistent hash-based load balancing and your hash keys aren't evenly distributed, some pods will get more traffic than others.

**Stale endpoints**: When pods restart or scale up, there can be a delay before all proxies learn about the new endpoints. During this window, old pods carry all the traffic.

**Resource differences**: Pods scheduled on nodes with different CPU or memory profiles may process requests at different speeds, leading to queue buildup on slower pods.

## Diagnosing the Problem

Start by checking the actual distribution across pods:

```bash
# Check request counts per pod using Prometheus

# Query in Prometheus or Grafana:
# sum(rate(istio_requests_total{reporter="destination", destination_service="my-service.default.svc.cluster.local"}[5m])) by (destination_workload_namespace, destination_app, pod)
```

You can also check from the Envoy side:

```bash
# See endpoint stats
kubectl exec <source-pod> -c istio-proxy -- curl -s localhost:15000/clusters | grep "my-service"
```

Look at the `cx_active` (active connections) and `rq_total` (total requests) counters for each upstream endpoint. If the numbers are wildly different, you have an imbalance.

## Fix 1: Switch Load Balancing Algorithm

If you are using `ROUND_ROBIN`, it works well for short-lived connections but can overburden endpoints in some scenarios. For services with long-lived requests or variable request patterns, `LEAST_REQUEST` is usually a better choice:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

`LEAST_REQUEST` picks the endpoint with the fewest active requests. This naturally balances load even when connections have different throughput levels.

For gRPC services specifically, this is often the right move when you have many concurrent RPCs or streams. Envoy's implementation of `LEAST_REQUEST` samples two random endpoints by default and picks the one with fewer active requests (power of two choices), which provides near-optimal distribution with minimal overhead when endpoint weights are equal.

## Fix 2: Tune Connection Pooling

Connection pooling affects load distribution significantly. If Envoy keeps too many persistent connections per host, new pods won't get traffic quickly enough:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 1000
        maxRetries: 3
    loadBalancer:
      simple: LEAST_REQUEST
```

The `maxRequestsPerConnection` setting is key for request-based HTTP traffic. Setting it to a finite number makes Envoy drain upstream connections after they have handled that many requests, which gives later requests a chance to use fresh load-balancing decisions. Without this, an HTTP/2 upstream connection can stay open indefinitely and continue multiplexing requests to the same endpoint.

For gRPC (which uses HTTP/2), you might want to be more aggressive:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-service-dr
  namespace: default
spec:
  host: grpc-service
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 100
    loadBalancer:
      simple: LEAST_REQUEST
```

Setting `maxRequestsPerConnection: 100` means after 100 requests, the upstream connection is drained and a new one is established for later requests, potentially to a different pod. This does not split an already-active long-lived gRPC stream; it affects new RPC streams on the connection.

## Fix 3: Enable Outlier Detection

Outlier detection automatically removes unhealthy or failing endpoints from the load balancing pool. This prevents a pod that is returning errors from continuing to receive normal traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
    loadBalancer:
      simple: LEAST_REQUEST
```

With this config, if a pod returns 3 consecutive 5xx errors, it can be ejected from the pool during Envoy's periodic outlier-detection sweep, which runs every 10 seconds here. The first ejection lasts at least 30 seconds, and repeated ejections can last longer. Up to 30% of endpoints can be ejected at any time.

## Fix 4: Use Horizontal Pod Autoscaler

If certain pods are overloaded because there simply aren't enough of them, Kubernetes HPA can help:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-service-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

More replicas mean each pod handles less traffic, which smooths out distribution.

## Fix 5: Address the Stale Endpoint Problem

When new pods come up, there's a brief period where Istio's control plane hasn't propagated the new endpoint to all proxies. You can mitigate this with readiness probes and a startup delay:

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
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
```

The readiness probe ensures the pod only receives traffic when it's actually ready to serve. The initial delay gives the application time to warm up.

## Fix 6: Review Your Consistent Hashing Keys

If you're using consistent hash-based load balancing and seeing uneven distribution, the problem might be your hash keys. Poorly distributed keys create hot spots:

```yaml
# Bad: if most users share a small number of tenant IDs
apiVersion: networking.istio.io/v1
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

If you have 5 pods and 3 tenant IDs, at most 3 pods can receive traffic. Switch to a more granular key like user ID, or consider using `LEAST_REQUEST` instead if you don't need strict session affinity.

## Monitoring the Fix

After applying your changes, monitor the distribution over time:

```promql
# Standard deviation of request rate across pods
stddev(sum(rate(istio_requests_total{reporter="destination", destination_service="my-service.default.svc.cluster.local"}[5m])) by (pod))
```

A lower standard deviation means more even distribution. Track this metric before and after your changes to quantify the improvement.

## Summary

Uneven load distribution in Istio usually comes down to long-lived connections, suboptimal load balancing algorithms, or stale endpoint information. The most impactful fix is typically switching to `LEAST_REQUEST` load balancing and setting `maxRequestsPerConnection` to a finite value. Add outlier detection to automatically remove problematic endpoints, and use Prometheus metrics to verify that your changes are working.
