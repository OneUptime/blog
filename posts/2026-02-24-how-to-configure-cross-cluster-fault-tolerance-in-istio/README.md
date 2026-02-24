# How to Configure Cross-Cluster Fault Tolerance in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Fault Tolerance, Kubernetes, Resilience

Description: Step-by-step instructions for setting up cross-cluster fault tolerance in Istio so your services stay available during cluster outages.

---

Running services across multiple Kubernetes clusters is great for reliability, but only if you actually configure fault tolerance properly. Just having two clusters does not mean your application survives when one goes down. You need to tell Istio how to handle failures, when to failover, and how to route traffic when things break.

This guide walks through the practical configuration needed to make cross-cluster fault tolerance work with Istio.

## Prerequisites

Before you start, you need:

- Two or more Kubernetes clusters with Istio installed
- Multi-cluster Istio configured (either multi-primary or primary-remote)
- East-west gateways deployed between clusters
- Shared root CA for mTLS between clusters

Verify your multi-cluster setup is working:

```bash
istioctl remote-clusters --context=cluster-a
```

You should see both clusters listed and connected.

## Setting Up Outlier Detection

Outlier detection is the foundation of fault tolerance in Istio. It monitors endpoints and ejects unhealthy ones from the load balancing pool. In a multi-cluster setup, this means if all endpoints in one cluster start failing, Istio automatically routes traffic to the healthy cluster.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: default
spec:
  host: payment.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 1000
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
      minHealthPercent: 0
```

The key settings here:

- `consecutive5xxErrors: 3` means an endpoint gets ejected after 3 consecutive 5xx errors.
- `interval: 10s` is how often Istio checks for outliers.
- `baseEjectionTime: 30s` is how long a bad endpoint stays ejected before being reconsidered.
- `maxEjectionPercent: 100` allows all endpoints in a cluster to be ejected. This is critical for cross-cluster failover because you want all endpoints in a failing cluster to be removed.
- `minHealthPercent: 0` disables the panic threshold. Without this, Istio would stop ejecting endpoints when too many are unhealthy.

## Configuring Locality-Based Failover

Istio supports locality-aware load balancing, which means it prefers sending traffic to endpoints in the same region, zone, or sub-zone. When local endpoints fail, it automatically falls back to endpoints in other localities.

First, make sure your nodes have the correct topology labels:

```bash
kubectl get nodes --show-labels --context=cluster-a | grep topology
```

You should see labels like `topology.kubernetes.io/region=us-east-1` and `topology.kubernetes.io/zone=us-east-1a`.

Then configure locality failover in a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-locality-dr
  namespace: default
spec:
  host: payment.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
    connectionPool:
      http:
        http2MaxRequests: 1000
        http1MaxPendingRequests: 100
```

For more control over failover ordering, use the `localityLbSetting`:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-failover-dr
  namespace: default
spec:
  host: payment.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
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

This tells Istio: if endpoints in `us-east-1` are unhealthy, failover to `us-west-2`, and vice versa.

## Retry Policies for Cross-Cluster Resilience

Retries help handle transient failures that happen during failover. When traffic shifts from one cluster to another, there might be brief connection errors. Configuring retries helps smooth over those bumps.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-vs
  namespace: default
spec:
  hosts:
  - payment.default.svc.cluster.local
  http:
  - route:
    - destination:
        host: payment.default.svc.cluster.local
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes
      retryRemoteLocalities: true
```

The `retryRemoteLocalities: true` setting is particularly important. It tells Istio to retry the request on an endpoint in a different locality (meaning a different cluster) if the local retry fails.

## Circuit Breaking Across Clusters

Circuit breaking prevents cascading failures by stopping traffic to an overloaded service. In a multi-cluster setup, you want circuit breakers configured so that when one cluster's service is overwhelmed, traffic shifts to the other cluster.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-circuit-breaker
  namespace: default
spec:
  host: payment.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 500
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 15s
      baseEjectionTime: 60s
      maxEjectionPercent: 100
```

When the connection pool is exhausted or too many requests are pending, Istio starts returning 503 errors, which then triggers outlier detection and failover to the remote cluster.

## Health Checking with Active Probes

Passive health checking (outlier detection) reacts to failures after they happen. For faster failover, you can combine it with active health checking.

Istio does not have built-in active health checking for cross-cluster endpoints, but you can use Kubernetes readiness probes on your services and combine them with Istio's outlier detection:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment
  template:
    metadata:
      labels:
        app: payment
    spec:
      containers:
      - name: payment
        image: myregistry/payment:v1
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 3
```

When pods fail their readiness probe, Kubernetes removes them from the service endpoints, and Istio's endpoint discovery picks up the change.

## Testing Fault Tolerance

You should regularly test that failover actually works. Here is a simple approach:

1. Deploy a test service in both clusters.
2. Scale down the service in one cluster and observe traffic shifting.

```bash
# Check current endpoints across clusters
istioctl proxy-config endpoints deploy/sleep --cluster "outbound|8080||payment.default.svc.cluster.local"

# Scale down in cluster A
kubectl scale deploy/payment --replicas=0 --context=cluster-a

# Watch traffic shift to cluster B
kubectl exec deploy/sleep --context=cluster-a -- \
  sh -c 'for i in $(seq 1 20); do curl -s payment:8080/cluster-id; echo; done'

# Scale back up
kubectl scale deploy/payment --replicas=3 --context=cluster-a
```

3. Inject faults to simulate failures without actually killing pods:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-fault-test
  namespace: default
spec:
  hosts:
  - payment.default.svc.cluster.local
  http:
  - fault:
      abort:
        httpStatus: 503
        percentage:
          value: 100
    route:
    - destination:
        host: payment.default.svc.cluster.local
```

Apply this in one cluster and verify traffic fails over to the other.

## Monitoring Failover Events

You need visibility into when failover happens. Use Istio's metrics to track this:

```bash
# Check which endpoints are being used
istioctl proxy-config endpoints deploy/sleep | grep payment

# Look at outlier detection stats
istioctl proxy-config clusters deploy/sleep -o json | \
  jq '.[] | select(.name | contains("payment")) | .outlierDetection'
```

Set up Prometheus queries to alert on cross-cluster failover:

```promql
sum(rate(istio_requests_total{destination_service="payment.default.svc.cluster.local", response_code="503"}[5m])) by (source_cluster, destination_cluster)
```

## Common Pitfalls

- Forgetting to set `maxEjectionPercent: 100`. The default is lower, which means Istio will not eject all endpoints in a failing cluster.
- Not configuring outlier detection at all. Without it, Istio keeps sending traffic to dead endpoints.
- Setting `baseEjectionTime` too high. If an ejected endpoint recovers, you want it back in the pool relatively quickly.
- Not testing failover regularly. Configuration drift happens, and the first time you discover failover is broken should not be during an actual outage.

Cross-cluster fault tolerance with Istio requires deliberate configuration of outlier detection, locality failover, retries, and circuit breaking. None of these are enabled by default in a way that handles multi-cluster scenarios well, so you need to set them up explicitly and test them regularly.
