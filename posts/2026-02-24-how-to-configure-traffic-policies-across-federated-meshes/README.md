# How to Configure Traffic Policies Across Federated Meshes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Federation, Traffic Management, Multi-Cluster, Kubernetes

Description: Step-by-step instructions for setting up traffic routing, load balancing, and resilience policies across federated Istio service meshes.

---

Federating Istio meshes is only half the battle. Once your meshes can talk to each other, you need to control how traffic flows between them. Without proper traffic policies, cross-mesh calls can be unpredictable, slow, or unreliable.

Traffic policies in a federated setup cover routing rules, load balancing across meshes, circuit breaking for remote endpoints, retries, timeouts, and failover behavior. Each mesh controls its own policies, but they need to be coordinated so things work end to end.

## Basic Cross-Mesh Routing with VirtualService

The most common scenario is routing traffic to a service that exists in both meshes. Maybe you have a `checkout` service running in mesh-west and mesh-east, and you want traffic to prefer the local instance but fall back to the remote one if it goes down.

First, make sure the service is discoverable in both meshes (either through remote secrets or ServiceEntry). Then set up a VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-routing
  namespace: shop
spec:
  hosts:
    - checkout.shop.svc.cluster.local
  http:
    - route:
        - destination:
            host: checkout.shop.svc.cluster.local
          weight: 100
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: connect-failure,refused-stream,unavailable
```

This applies to all traffic hitting the checkout service, whether the endpoints are local or remote. The timeout and retry settings protect against the higher latency you might see with cross-mesh calls.

## Weighted Traffic Distribution Across Meshes

If you want to split traffic between meshes intentionally (maybe for a canary deployment across regions), you can use subset-based routing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-subsets
  namespace: shop
spec:
  host: checkout.shop.svc.cluster.local
  subsets:
    - name: local
      labels:
        topology.istio.io/cluster: cluster-west
    - name: remote
      labels:
        topology.istio.io/cluster: cluster-east
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

Then reference the subsets in your VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-split
  namespace: shop
spec:
  hosts:
    - checkout.shop.svc.cluster.local
  http:
    - route:
        - destination:
            host: checkout.shop.svc.cluster.local
            subset: local
          weight: 90
        - destination:
            host: checkout.shop.svc.cluster.local
            subset: remote
          weight: 10
```

This sends 90% of traffic to the local mesh and 10% to the remote mesh. Useful for gradual rollouts or testing cross-mesh connectivity under load.

## Circuit Breaking for Remote Endpoints

Remote endpoints are inherently less reliable than local ones. Network partitions, gateway failures, and increased latency are all more likely. Circuit breaking helps prevent cascading failures.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-circuit-breaker
  namespace: shop
spec:
  host: checkout.shop.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

The `outlierDetection` settings are particularly important for federation. If a remote endpoint starts returning 5xx errors, it gets ejected from the load balancing pool. After the ejection time, Istio will try it again.

Setting `maxEjectionPercent` to less than 100 ensures you always have some endpoints available, even during failures.

## Locality-Based Failover

Locality-aware routing is probably the most useful feature for federated meshes. It automatically prefers local endpoints and only fails over to remote ones when necessary.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-locality
  namespace: shop
spec:
  host: checkout.shop.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
    localityLbSetting:
      enabled: true
      failover:
        - from: us-west-1
          to: us-east-1
      failoverPriority:
        - "topology.kubernetes.io/region"
        - "topology.kubernetes.io/zone"
```

For this to work, your nodes need proper locality labels:

```bash
kubectl label node <node-name> topology.kubernetes.io/region=us-west-1
kubectl label node <node-name> topology.kubernetes.io/zone=us-west-1a
```

Traffic will flow to local endpoints first. If enough of them get ejected by outlier detection, Istio will start routing to the failover region.

## Rate Limiting Across Meshes

You might want to limit how much traffic one mesh sends to another. This protects the remote mesh from being overwhelmed and keeps cross-mesh costs (if you pay per data transfer) under control.

Istio supports local rate limiting through EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: cross-mesh-rate-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: eastwestgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/udpa.type.v1.TypedStruct
            type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            value:
              stat_prefix: http_local_rate_limiter
              token_bucket:
                max_tokens: 1000
                tokens_per_fill: 100
                fill_interval: 1s
              filter_enabled:
                runtime_key: local_rate_limit_enabled
                default_value:
                  numerator: 100
                  denominator: HUNDRED
              filter_enforced:
                runtime_key: local_rate_limit_enforced
                default_value:
                  numerator: 100
                  denominator: HUNDRED
```

This limits the east-west gateway to 1000 requests per second with a refill rate of 100 per second.

## Timeout Adjustments for Cross-Mesh Traffic

Cross-mesh calls have higher latency than in-cluster calls. Your timeout configurations need to account for this. A timeout that works fine for in-cluster communication might cause premature failures for cross-mesh requests.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-timeouts
  namespace: shop
spec:
  hosts:
    - checkout.shop.svc.cluster.local
  http:
    - match:
        - sourceLabels:
            mesh: west
      route:
        - destination:
            host: checkout.shop.svc.cluster.local
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 4s
        retryOn: connect-failure,refused-stream,unavailable,reset
```

The `perTryTimeout` should be long enough to account for the gateway hop plus the normal service response time. If your service normally responds in 200ms and the gateway adds 50ms of latency, a perTryTimeout of 2-4 seconds gives plenty of headroom.

## Testing Your Policies

After configuring traffic policies, verify them:

```bash
# Check the effective configuration on a proxy
istioctl proxy-config routes \
  $(kubectl get pod -n shop -l app=frontend -o jsonpath='{.items[0].metadata.name}') \
  --name 8080 -o json

# Check cluster-level configuration (circuit breaking, load balancing)
istioctl proxy-config clusters \
  $(kubectl get pod -n shop -l app=frontend -o jsonpath='{.items[0].metadata.name}') \
  --fqdn checkout.shop.svc.cluster.local -o json
```

Run load tests and watch how traffic distributes:

```bash
# Generate some traffic
for i in $(seq 1 100); do
  kubectl exec -n shop deploy/frontend -c frontend -- \
    curl -s -o /dev/null -w "%{http_code}\n" checkout.shop:8080/health
done
```

Check the results in your monitoring stack to confirm traffic is flowing according to your policies.

Traffic policies across federated meshes require more thought than single-cluster policies. The extra latency, the possibility of partition between meshes, and the different failure modes all need to be accounted for. Start with conservative timeouts and circuit breakers, then tune based on what you observe in production.
