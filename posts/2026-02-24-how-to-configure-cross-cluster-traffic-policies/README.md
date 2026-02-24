# How to Configure Cross-Cluster Traffic Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Management, Multi-Cluster, Kubernetes, Service Mesh

Description: How to define and enforce traffic policies across multiple Istio clusters using VirtualService, DestinationRule, and AuthorizationPolicy.

---

When you run services across multiple Istio clusters, you need traffic policies that work across cluster boundaries. This means controlling how traffic flows between clusters, who can talk to whom, what happens during failures, and how load is distributed. Istio gives you the tools to do this, but the configuration is not always obvious when clusters are involved.

This guide covers the key traffic policies you need for multi-cluster Istio and how to configure them.

## Traffic Routing Across Clusters

In a multi-cluster mesh, services from all clusters appear in the service registry. When you create a VirtualService, it applies to all instances of a service regardless of which cluster they are in.

Here is a VirtualService that splits traffic between two versions of a service, with each version potentially running in different clusters:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-routing
  namespace: default
spec:
  hosts:
  - payment.default.svc.cluster.local
  http:
  - match:
    - headers:
        x-version:
          exact: "v2"
    route:
    - destination:
        host: payment.default.svc.cluster.local
        subset: v2
  - route:
    - destination:
        host: payment.default.svc.cluster.local
        subset: v1
      weight: 90
    - destination:
        host: payment.default.svc.cluster.local
        subset: v2
      weight: 10
```

The corresponding DestinationRule defines the subsets:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-subsets
  namespace: default
spec:
  host: payment.default.svc.cluster.local
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Istio will route to pods matching these labels regardless of which cluster they run in. If v1 pods exist only in cluster A and v2 pods only in cluster B, the traffic split effectively becomes a cross-cluster split.

## Locality-Based Traffic Policies

You often want traffic to prefer local endpoints and only go cross-cluster when necessary. Locality-based routing handles this.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-locality
  namespace: default
spec:
  host: payment.default.svc.cluster.local
  trafficPolicy:
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
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

This configuration sends 80% of traffic to local endpoints and 20% to the remote cluster under normal conditions. When local endpoints start failing, outlier detection ejects them and more traffic flows to the remote cluster.

For strict locality preference with automatic failover:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-failover
  namespace: default
spec:
  host: payment.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        failover:
        - from: us-east-1
          to: us-west-2
        - from: us-west-2
          to: us-east-1
      simple: ROUND_ROBIN
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

## Cross-Cluster Authorization Policies

AuthorizationPolicy resources control who can access services. In a multi-cluster setup, you might want to restrict which clusters can access certain services.

**Allow only traffic from specific clusters:**

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-cross-cluster-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/default/sa/frontend"
        - "cluster.local/ns/default/sa/checkout"
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

Because all clusters share the same trust domain in a multi-cluster mesh, the principal names are consistent across clusters. This means the above policy allows the `frontend` and `checkout` service accounts from any cluster.

To restrict access to a specific cluster, you can use request headers or custom metadata:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-cluster-restriction
  namespace: default
spec:
  selector:
    matchLabels:
      app: payment
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["default"]
    when:
    - key: source.cluster
      values: ["cluster-a", "cluster-b"]
```

## Connection Pool Policies

For cross-cluster traffic, you often want different connection pool settings than for local traffic. Cross-cluster connections go through the east-west gateway and potentially over a WAN, so they need different timeout and connection limits.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-connection-policy
  namespace: default
spec:
  host: payment.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 5s
        tcpKeepalive:
          time: 300s
          interval: 30s
          probes: 3
      http:
        http1MaxPendingRequests: 200
        http2MaxRequests: 500
        maxRequestsPerConnection: 50
        idleTimeout: 60s
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 15s
      baseEjectionTime: 30s
```

The `tcpKeepalive` settings are especially important for cross-cluster connections because they keep long-lived connections alive through NAT gateways and load balancers that might otherwise drop idle connections.

## Timeout Policies

Cross-cluster requests naturally have higher latency. Your timeout policies should account for this:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-timeouts
  namespace: default
spec:
  hosts:
  - payment.default.svc.cluster.local
  http:
  - route:
    - destination:
        host: payment.default.svc.cluster.local
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: connect-failure,refused-stream,unavailable
      retryRemoteLocalities: true
```

The `retryRemoteLocalities: true` flag tells Istio to retry on endpoints in different localities (clusters) if the initial attempt fails. Combined with proper timeouts, this gives your requests the best chance of succeeding even during partial outages.

## Mirroring Traffic Across Clusters

Traffic mirroring is useful for testing new deployments in a remote cluster without affecting production traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-mirror
  namespace: default
spec:
  hosts:
  - payment.default.svc.cluster.local
  http:
  - route:
    - destination:
        host: payment.default.svc.cluster.local
        subset: v1
    mirror:
      host: payment.default.svc.cluster.local
      subset: v2
    mirrorPercentage:
      value: 10.0
```

This sends 10% of production traffic as a mirror to v2 endpoints. If v2 runs only in the testing cluster, this effectively mirrors traffic across clusters.

## Applying Policies Consistently

In a multi-cluster setup, you need to decide where to apply policies. The general rule is:

- **VirtualService and DestinationRule**: Apply in the cluster where the client (source) pods run. If clients exist in both clusters, apply in both.
- **AuthorizationPolicy**: Apply in the cluster where the server (destination) pods run.
- **PeerAuthentication**: Apply in all clusters that are part of the mesh.

A common pattern is to use a GitOps tool like ArgoCD or Flux to sync policies across clusters:

```bash
# Apply to all clusters
for ctx in cluster-a cluster-b; do
  kubectl apply -f traffic-policies/ --context=$ctx
done
```

## Verifying Policies Are Applied

After applying policies, verify they are picked up by the proxies:

```bash
# Check routes
istioctl proxy-config routes deploy/frontend --context=cluster-a | grep payment

# Check clusters and endpoints
istioctl proxy-config clusters deploy/frontend --context=cluster-a | grep payment
istioctl proxy-config endpoints deploy/frontend --context=cluster-a | grep payment

# Run a connectivity test
istioctl analyze --context=cluster-a
istioctl analyze --context=cluster-b
```

Cross-cluster traffic policies in Istio are powerful but require careful planning. Start with basic routing and failover, then add authorization and connection management as your multi-cluster deployment matures. Always test policies in a staging environment that mirrors your production multi-cluster topology before rolling them out.
