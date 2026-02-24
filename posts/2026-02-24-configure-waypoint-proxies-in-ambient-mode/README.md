# How to Configure Waypoint Proxies in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Waypoint Proxy, Kubernetes, Traffic Management

Description: How to deploy and configure waypoint proxies in Istio ambient mode for Layer 7 traffic management, routing, and HTTP-aware authorization policies.

---

Waypoint proxies are the L7 component of Istio ambient mode. While ztunnel handles L4 concerns like mTLS and TCP-level authorization, waypoint proxies handle everything that requires understanding the application protocol: HTTP routing, retries, header manipulation, fault injection, and L7 authorization policies.

You deploy waypoint proxies only where you need them, which is what makes ambient mode so efficient. Most workloads only need ztunnel's L4 security. A handful might need the full L7 feature set.

## When Do You Need a Waypoint Proxy?

You need a waypoint proxy when you want to:

- Route traffic based on HTTP paths, headers, or methods
- Apply retries, timeouts, or circuit breaking
- Inject faults for chaos testing
- Use L7 AuthorizationPolicies (matching on HTTP methods or paths)
- Collect request-level metrics (not just TCP metrics)
- Apply rate limits based on HTTP attributes

If you only need mTLS and identity-based access control, ztunnel is sufficient and you can skip waypoint proxies entirely.

## Deploying a Waypoint Proxy for a Namespace

The simplest way to deploy a waypoint is using istioctl:

```bash
istioctl waypoint apply -n bookinfo --enroll-namespace
```

This creates a waypoint proxy deployment in the `bookinfo` namespace and configures the namespace to route traffic through it.

Verify the waypoint is running:

```bash
kubectl get pods -n bookinfo -l gateway.networking.k8s.io/gateway-name
```

```
NAME                              READY   STATUS    RESTARTS   AGE
bookinfo-waypoint-7f8b9c-xxxxx   1/1     Running   0          30s
```

You can also check the Gateway resource:

```bash
kubectl get gateways -n bookinfo
```

```
NAME                CLASS            ADDRESS       PROGRAMMED   AGE
bookinfo-waypoint   istio-waypoint   10.96.10.50   True         30s
```

## Deploying a Waypoint with YAML

If you prefer declarative configuration (or use GitOps), create the Gateway resource directly:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: bookinfo-waypoint
  namespace: bookinfo
  labels:
    istio.io/waypoint-for: service
spec:
  gatewayClassName: istio-waypoint
  listeners:
    - name: mesh
      port: 15008
      protocol: HBONE
```

Then label the namespace to use the waypoint:

```bash
kubectl label namespace bookinfo istio.io/use-waypoint=bookinfo-waypoint
```

## Waypoint Proxy per Service Account

Instead of a namespace-wide waypoint, you can create waypoint proxies for specific service accounts. This gives finer-grained control:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: reviews-waypoint
  namespace: bookinfo
  labels:
    istio.io/waypoint-for: service
spec:
  gatewayClassName: istio-waypoint
  listeners:
    - name: mesh
      port: 15008
      protocol: HBONE
```

Associate it with a specific service:

```bash
kubectl label service reviews -n bookinfo istio.io/use-waypoint=reviews-waypoint
```

Now only traffic destined for the `reviews` service goes through this waypoint. Other services in the namespace are unaffected.

## Configuring L7 Authorization Policies

With a waypoint proxy in place, you can write HTTP-aware authorization policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: reviews-http-policy
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: reviews
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/bookinfo/sa/bookinfo-productpage"
      to:
        - operation:
            methods: ["GET"]
            paths: ["/reviews/*"]
```

This policy allows only GET requests to paths matching `/reviews/*` from the productpage service. POST, PUT, DELETE, and other methods are denied.

Without a waypoint proxy, this policy would not work because ztunnel cannot inspect HTTP methods or paths.

## Configuring HTTP Routing

VirtualService resources work with waypoint proxies for advanced routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-routing
  namespace: bookinfo
spec:
  hosts:
    - reviews
  http:
    - match:
        - headers:
            end-user:
              exact: jason
      route:
        - destination:
            host: reviews
            subset: v2
    - route:
        - destination:
            host: reviews
            subset: v1
```

With the corresponding DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
  namespace: bookinfo
spec:
  host: reviews
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
    - name: v3
      labels:
        version: v3
```

## Configuring Retries and Timeouts

Add retry and timeout policies through VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-resilience
  namespace: bookinfo
spec:
  hosts:
    - ratings
  http:
    - timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: "5xx,reset,connect-failure"
      route:
        - destination:
            host: ratings
            port:
              number: 9080
```

## Fault Injection

Test your application's resilience by injecting faults through the waypoint:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-fault
  namespace: bookinfo
spec:
  hosts:
    - ratings
  http:
    - fault:
        delay:
          percentage:
            value: 50
          fixedDelay: 3s
        abort:
          percentage:
            value: 10
          httpStatus: 503
      route:
        - destination:
            host: ratings
```

This introduces a 3-second delay on 50% of requests and returns a 503 error on 10% of requests.

## Scaling Waypoint Proxies

By default, a waypoint proxy runs as a single replica. For production, scale it up:

```bash
kubectl scale deployment bookinfo-waypoint -n bookinfo --replicas=3
```

Or configure autoscaling:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bookinfo-waypoint
  namespace: bookinfo
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bookinfo-waypoint
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Inspecting Waypoint Proxy Configuration

Since waypoint proxies are Envoy-based, you can use the same proxy debugging tools:

```bash
# View routes
istioctl proxy-config routes deploy/bookinfo-waypoint -n bookinfo

# View clusters
istioctl proxy-config clusters deploy/bookinfo-waypoint -n bookinfo

# View listeners
istioctl proxy-config listeners deploy/bookinfo-waypoint -n bookinfo

# Check proxy status
istioctl proxy-status
```

Access the Envoy admin interface:

```bash
kubectl port-forward deploy/bookinfo-waypoint -n bookinfo 15000:15000
curl http://localhost:15000/stats
```

## Removing a Waypoint Proxy

If you no longer need L7 features for a namespace:

```bash
istioctl waypoint delete -n bookinfo
```

Or remove the specific Gateway resource:

```bash
kubectl delete gateway bookinfo-waypoint -n bookinfo
```

Remove the namespace label:

```bash
kubectl label namespace bookinfo istio.io/use-waypoint-
```

Traffic will continue to flow through ztunnel for L4 security. Only the L7 processing stops.

## Performance Implications

Adding a waypoint proxy introduces an extra network hop. The traffic path becomes:

Source pod -> Source ztunnel -> Waypoint proxy -> Destination ztunnel -> Destination pod

Compare this to ztunnel-only:

Source pod -> Source ztunnel -> Destination ztunnel -> Destination pod

The extra hop adds some latency (typically sub-millisecond if the waypoint is on the same node, a few milliseconds if cross-node). For latency-sensitive services, measure the impact in your specific environment before committing.

The memory cost of a waypoint proxy is comparable to a sidecar (it is Envoy, after all), but the difference is you are running one shared instance instead of one per pod. For a namespace with 20 services, that is 1 waypoint instead of 20 sidecars.

Deploy waypoint proxies thoughtfully - only where L7 features are genuinely needed. The power of ambient mode is the ability to be selective about where you pay the L7 overhead.
