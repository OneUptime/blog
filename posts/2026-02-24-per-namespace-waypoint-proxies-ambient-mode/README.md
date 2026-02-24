# How to Configure Per-Namespace Waypoint Proxies in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Waypoint Proxy, Ambient Mesh, Kubernetes, Traffic Management

Description: Step-by-step guide to configuring per-namespace waypoint proxies in Istio ambient mode for L7 traffic processing.

---

Waypoint proxies in Istio ambient mode can be scoped to an entire namespace, meaning all services in that namespace share a single waypoint for L7 traffic processing. This is the simplest way to get L7 features like HTTP routing, header-based authorization, and traffic splitting working in ambient mode. Here is how to set it up and manage it.

## Prerequisites

Before you start, make sure you have:

- Istio installed with the ambient profile
- The namespace enrolled in the ambient mesh
- The Kubernetes Gateway API CRDs installed

```bash
# Verify Istio ambient installation
istioctl version

# Make sure ztunnel is running
kubectl get daemonset ztunnel -n istio-system

# Enroll your namespace in ambient mode
kubectl label namespace my-app istio.io/dataplane-mode=ambient

# Verify Gateway API CRDs are present
kubectl get crd gateways.gateway.networking.k8s.io
```

## Creating a Namespace Waypoint

The quickest way to create a namespace-level waypoint is with istioctl:

```bash
# Create a waypoint for the entire namespace
istioctl waypoint apply -n my-app --enroll-namespace
```

The `--enroll-namespace` flag does two things: it creates the waypoint Gateway resource and it labels the namespace so that all services in it use the waypoint.

You can also do this manually by creating the Gateway resource and applying the label yourself:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: waypoint
  namespace: my-app
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
```

Apply the Gateway:

```bash
kubectl apply -f waypoint-gateway.yaml
```

Then label the namespace to use this waypoint:

```bash
kubectl label namespace my-app istio.io/use-waypoint=waypoint
```

## Verifying the Waypoint

After creating the waypoint, check that it is running:

```bash
# Check the waypoint pod
kubectl get pods -n my-app -l gateway.istio.io/managed=istio.io-mesh-controller

# Check the Gateway status
kubectl get gateway waypoint -n my-app -o yaml
```

The Gateway should show a status with `Programmed: True`:

```yaml
status:
  conditions:
  - type: Accepted
    status: "True"
  - type: Programmed
    status: "True"
```

## How Namespace Waypoints Work

When a namespace has a waypoint configured, here is what happens to traffic destined for services in that namespace:

1. The source ztunnel sees traffic heading to a service in `my-app`
2. It checks if `my-app` has a waypoint proxy
3. It finds the waypoint via the namespace label `istio.io/use-waypoint=waypoint`
4. It forwards the traffic to the waypoint via HBONE
5. The waypoint applies any L7 policies and routing rules
6. The waypoint forwards the traffic to the actual destination

This means every service in the namespace gets L7 processing, even if only some services need it. If you want more granular control, consider per-service waypoints instead.

## Applying L7 Policies

Once the waypoint is in place, you can start using L7-level Istio features. Here are some examples:

**HTTP-based Authorization Policy:**

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: my-app
spec:
  rules:
  - from:
    - source:
        requestPrincipals: ["*"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

**Virtual Service for Traffic Routing:**

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-routing
  namespace: my-app
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
```

**Destination Rule with Connection Pool Settings:**

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-dr
  namespace: my-app
spec:
  host: reviews
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 100
      tcp:
        maxConnections: 100
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Customizing the Waypoint Deployment

The waypoint proxy runs as a standard Kubernetes Deployment. You can customize its resources, replicas, and other settings.

To adjust resources, you can patch the deployment after it is created:

```bash
# Get the waypoint deployment name
kubectl get deployment -n my-app -l gateway.istio.io/managed=istio.io-mesh-controller

# Patch resource limits
kubectl patch deployment waypoint -n my-app --type=json -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/resources", "value": {
    "requests": {"cpu": "200m", "memory": "128Mi"},
    "limits": {"cpu": "1000m", "memory": "512Mi"}
  }}
]'
```

For replicas, you can scale the deployment:

```bash
kubectl scale deployment waypoint -n my-app --replicas=3
```

Or set up an HPA:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: waypoint-hpa
  namespace: my-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: waypoint
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Testing the Waypoint

To confirm traffic is flowing through the waypoint, you can check the waypoint proxy logs:

```bash
# Watch waypoint logs
kubectl logs -n my-app -l gateway.istio.io/managed=istio.io-mesh-controller -f

# Or check waypoint stats
WAYPOINT_POD=$(kubectl get pod -n my-app -l gateway.istio.io/managed=istio.io-mesh-controller -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n my-app $WAYPOINT_POD -- curl -s localhost:15000/stats | grep downstream_rq
```

You can also use istioctl to verify the configuration:

```bash
# Check routes configured on the waypoint
istioctl proxy-config route $WAYPOINT_POD -n my-app

# Check listeners
istioctl proxy-config listener $WAYPOINT_POD -n my-app
```

## Removing a Namespace Waypoint

To remove the waypoint from a namespace:

```bash
# Remove the namespace label first
kubectl label namespace my-app istio.io/use-waypoint-

# Delete the waypoint
istioctl waypoint delete -n my-app
```

Or manually:

```bash
kubectl label namespace my-app istio.io/use-waypoint-
kubectl delete gateway waypoint -n my-app
```

After removing the waypoint, traffic will still be encrypted by ztunnel (L4), but L7 policies and routing rules will no longer be enforced.

## Common Issues

**Waypoint not receiving traffic:** Check that the namespace label `istio.io/use-waypoint` is set correctly and matches the Gateway name. Also verify that the namespace is enrolled in ambient mode with `istio.io/dataplane-mode=ambient`.

**L7 policies not being enforced:** Make sure the policies are in the same namespace as the waypoint. Also check that the waypoint Gateway status shows `Programmed: True`.

**High latency:** A namespace waypoint processes traffic for all services, so if you have high-throughput services, the waypoint can become a bottleneck. Scale up the waypoint replicas or consider per-service waypoints for heavy-traffic services.

## Summary

Per-namespace waypoint proxies give you L7 traffic management for all services in a namespace through a single shared proxy. They are the simplest way to get started with L7 features in ambient mode. Create them with `istioctl waypoint apply --enroll-namespace`, apply your VirtualService and AuthorizationPolicy resources as usual, and scale the waypoint deployment based on your traffic needs.
