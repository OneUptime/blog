# How to Configure Per-Service Waypoint Proxies in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Waypoint Proxy, Ambient Mesh, Kubernetes, Service Mesh

Description: How to configure per-service waypoint proxies in Istio ambient mode for fine-grained L7 traffic control on individual services.

---

While namespace-level waypoint proxies work well for many scenarios, sometimes you need more granular control. Per-service waypoint proxies let you deploy L7 processing for specific services rather than an entire namespace. This is useful when only a few services need HTTP routing or L7 authorization, and you want to avoid routing all namespace traffic through a shared waypoint.

## Why Per-Service Waypoints

There are several reasons to use per-service waypoints instead of namespace-level ones:

- Only some services in a namespace need L7 features
- Different services have different scaling requirements for their waypoint
- You want to isolate waypoint failures so they only affect the service they serve
- You want independent upgrade cycles for different services' waypoints

The tradeoff is that you end up managing more waypoint deployments. For a namespace with 20 services where only 3 need L7 features, per-service waypoints make a lot of sense. For a namespace where every service needs L7 features, a namespace waypoint is simpler.

## Creating a Per-Service Waypoint

To create a waypoint for a specific service, you use istioctl with the `--for` flag:

```bash
# Create a waypoint for a specific service
istioctl waypoint apply -n my-app --name reviews-waypoint
```

Then label the service to use that waypoint:

```bash
kubectl label service reviews -n my-app istio.io/use-waypoint=reviews-waypoint
```

You can also do this declaratively with a Gateway resource:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: reviews-waypoint
  namespace: my-app
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
```

Apply it:

```bash
kubectl apply -f reviews-waypoint.yaml
kubectl label service reviews -n my-app istio.io/use-waypoint=reviews-waypoint
```

## Verifying the Setup

Check that the waypoint is running and the service is correctly associated:

```bash
# See the waypoint pod
kubectl get pods -n my-app -l istio.io/gateway-name=reviews-waypoint

# Check the service label
kubectl get service reviews -n my-app -o jsonpath='{.metadata.labels.istio\.io/use-waypoint}'
```

The output should show `reviews-waypoint`.

You can also verify the Gateway status:

```bash
kubectl get gateway reviews-waypoint -n my-app
```

## Multiple Per-Service Waypoints in One Namespace

You can have multiple per-service waypoints in the same namespace. Each service gets its own waypoint deployment:

```bash
# Create waypoints for different services
istioctl waypoint apply -n my-app --name reviews-waypoint
istioctl waypoint apply -n my-app --name ratings-waypoint
istioctl waypoint apply -n my-app --name details-waypoint

# Associate each service with its waypoint
kubectl label service reviews -n my-app istio.io/use-waypoint=reviews-waypoint
kubectl label service ratings -n my-app istio.io/use-waypoint=ratings-waypoint
kubectl label service details -n my-app istio.io/use-waypoint=details-waypoint
```

Services without a waypoint label will not get L7 processing - they will only have ztunnel's L4 features (mTLS, L4 auth policies).

```bash
# List all waypoints in a namespace
kubectl get gateway -n my-app

# List all waypoint pods
kubectl get pods -n my-app -l gateway.istio.io/managed=istio.io-mesh-controller
```

## Applying Policies to Per-Service Waypoints

When you apply Istio policies to a service that has its own waypoint, those policies are enforced at that waypoint. Use `targetRefs` to scope policies to specific services:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: reviews-auth
  namespace: my-app
spec:
  targetRefs:
  - kind: Service
    group: ""
    name: reviews
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/my-app/sa/productpage"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/reviews/*"]
```

Similarly, VirtualService rules targeting the reviews service will be processed by the reviews waypoint:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-vs
  namespace: my-app
spec:
  hosts:
  - reviews
  http:
  - fault:
    delay:
      percentage:
        value: 10
      fixedDelay: 2s
    route:
    - destination:
        host: reviews
        subset: v1
      weight: 80
    - destination:
        host: reviews
        subset: v2
      weight: 20
```

## Scaling Per-Service Waypoints Independently

Each per-service waypoint is its own Deployment, so you can scale them independently based on traffic patterns:

```bash
# The reviews service gets heavy traffic - scale up
kubectl scale deployment reviews-waypoint -n my-app --replicas=3

# The details service is low traffic - one replica is fine
kubectl scale deployment details-waypoint -n my-app --replicas=1
```

You can set up different HPAs for each waypoint:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: reviews-waypoint-hpa
  namespace: my-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: reviews-waypoint
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ratings-waypoint-hpa
  namespace: my-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ratings-waypoint
  minReplicas: 1
  maxReplicas: 3
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
```

## Mixing Per-Service and Namespace Waypoints

You can have a namespace-level waypoint and per-service waypoints at the same time. The per-service waypoint takes precedence for that specific service:

```bash
# Namespace-level waypoint for general services
istioctl waypoint apply -n my-app --enroll-namespace

# Per-service waypoint for the reviews service (overrides namespace waypoint)
istioctl waypoint apply -n my-app --name reviews-waypoint
kubectl label service reviews -n my-app istio.io/use-waypoint=reviews-waypoint
```

In this setup:
- Traffic to `reviews` goes through `reviews-waypoint`
- Traffic to all other services in `my-app` goes through the namespace waypoint

This is a good pattern when one service has different scaling or policy needs than the rest.

## Debugging Per-Service Waypoints

To debug a specific service's waypoint, target its pod:

```bash
# Get the reviews waypoint pod
REVIEWS_WP=$(kubectl get pod -n my-app -l istio.io/gateway-name=reviews-waypoint -o jsonpath='{.items[0].metadata.name}')

# Check its configuration
istioctl proxy-config route $REVIEWS_WP -n my-app
istioctl proxy-config cluster $REVIEWS_WP -n my-app
istioctl proxy-config listener $REVIEWS_WP -n my-app

# Check its logs
kubectl logs -n my-app $REVIEWS_WP

# Check Envoy stats
kubectl exec -n my-app $REVIEWS_WP -- curl -s localhost:15000/stats | grep downstream
```

## Removing a Per-Service Waypoint

To remove a per-service waypoint:

```bash
# Remove the service label first
kubectl label service reviews -n my-app istio.io/use-waypoint-

# Delete the waypoint
kubectl delete gateway reviews-waypoint -n my-app
```

After removal, if a namespace waypoint exists, the service will fall back to using it. If no namespace waypoint exists, the service will only have ztunnel L4 processing.

## Summary

Per-service waypoint proxies give you fine-grained control over L7 traffic processing in Istio ambient mode. You deploy them by creating Gateway resources and labeling individual services with `istio.io/use-waypoint`. Each service can have its own scaling, policies, and upgrade lifecycle. This approach works well when only a subset of services need L7 features or when services have very different traffic patterns.
