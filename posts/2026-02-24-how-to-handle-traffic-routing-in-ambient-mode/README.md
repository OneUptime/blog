# How to Handle Traffic Routing in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Traffic Routing, Kubernetes, Service Mesh

Description: A practical guide to configuring traffic routing in Istio ambient mode using waypoint proxies and ztunnel for L4 and L7 traffic management.

---

Istio's ambient mode changes the game for traffic routing. Instead of injecting sidecar proxies into every pod, ambient mode splits responsibilities between ztunnel (handling L4) and waypoint proxies (handling L7). This means you need to think about routing differently compared to the traditional sidecar model.

If you've been running Istio with sidecars, you already know how VirtualService and DestinationRule work. Those resources can still be used in ambient mode, but VirtualService support with ambient is currently considered alpha. The difference is where and how the routing logic gets enforced.

## Understanding the Two-Layer Architecture

In ambient mode, traffic flows through two distinct layers:

**Layer 4 (ztunnel):** Every node runs a ztunnel DaemonSet that handles mTLS, basic L4 authorization, and telemetry. This is always present for any namespace enrolled in the mesh.

**Layer 7 (waypoint proxy):** When you need HTTP routing, retries, header-based matching, or any L7 feature, you deploy a waypoint proxy. Without a waypoint, you only get L4 capabilities.

To enroll a namespace in ambient mode:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

This gets you ztunnel coverage immediately. But for L7 traffic routing rules to work, you need waypoint proxies.

## Deploying a Waypoint Proxy

Waypoint proxies are deployed per-service, per-pod, or per-namespace. Here's how to create a waypoint for an entire namespace:

```bash
istioctl waypoint apply --namespace default --enroll-namespace
```

This creates a Gateway resource:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  labels:
    istio.io/waypoint-for: service
  name: waypoint
  namespace: default
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
```

You can also create a waypoint for a specific service and label that service to use it:

```bash
istioctl waypoint apply --name my-app-waypoint --namespace default
kubectl label service my-app istio.io/use-waypoint=my-app-waypoint
```

## Configuring Traffic Splits

Traffic splitting can use the same Istio APIs you're used to, keeping in mind that VirtualService support in ambient mode is alpha and should not be mixed with Gateway API route configuration for the same traffic. The key difference is that the waypoint proxy enforces the rules instead of a sidecar. Here's a typical canary setup:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-routing
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 90
    - destination:
        host: my-app
        subset: v2
      weight: 10
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
  namespace: default
spec:
  host: my-app
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Without a waypoint proxy in place, this VirtualService will have no effect. The ztunnel only does L4 forwarding and won't process HTTP routing rules.

## Header-Based Routing

You can route traffic based on HTTP headers, which is useful for testing specific versions:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-header-routing
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - match:
    - headers:
        x-version:
          exact: canary
    route:
    - destination:
        host: my-app
        subset: v2
  - route:
    - destination:
        host: my-app
        subset: v1
```

This sends all requests with the `x-version: canary` header to v2, and everything else to v1.

## Fault Injection and Timeouts

Fault injection is available through waypoint proxies when you use Istio's VirtualService API. You can inject delays to test resilience:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-fault
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - fault:
      delay:
        percentage:
          value: 10
        fixedDelay: 3s
    route:
    - destination:
        host: my-app
```

Timeouts and retries also work as expected:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-retry
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
    route:
    - destination:
        host: my-app
```

## Cross-Namespace Routing

When routing traffic between namespaces in ambient mode, make sure both namespaces are labeled for ambient and that the target namespace has a waypoint proxy if you need L7 routing:

```bash
kubectl label namespace backend istio.io/dataplane-mode=ambient
istioctl waypoint apply --namespace backend --enroll-namespace
```

Then create a VirtualService and DestinationRule for the backend service. Use the full service hostname so the destination is unambiguous across namespaces:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-routing
  namespace: backend
spec:
  hosts:
  - backend-api.backend.svc.cluster.local
  http:
  - route:
    - destination:
        host: backend-api.backend.svc.cluster.local
        subset: stable
      weight: 80
    - destination:
        host: backend-api.backend.svc.cluster.local
        subset: canary
      weight: 20
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-api-dr
  namespace: backend
spec:
  host: backend-api.backend.svc.cluster.local
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
```

## Debugging Traffic Routing

When things aren't working, start by checking if the waypoint proxy is running:

```bash
kubectl get gateway -n default
kubectl get pods -n default -l gateway.networking.k8s.io/gateway-name=waypoint
```

Check that your namespace is properly enrolled:

```bash
kubectl get namespace default --show-labels | grep istio
```

You can also use `istioctl analyze` to catch misconfigurations:

```bash
istioctl analyze -n default
```

To see if traffic is actually flowing through the waypoint, check the waypoint proxy logs:

```bash
kubectl logs -n default -l gateway.networking.k8s.io/gateway-name=waypoint -c istio-proxy
```

## Common Pitfalls

One thing that catches people off guard: if you define a VirtualService but don't have a waypoint proxy deployed, the routing rules silently do nothing. There's no error or warning. The traffic just flows through ztunnel at L4 without any L7 processing.

Another gotcha is that waypoint proxies are scoped. A namespace-level waypoint handles traffic for services in that namespace. A service-level waypoint only handles traffic to the labeled service, and a pod-level waypoint only handles traffic addressed directly to that labeled pod. Make sure you're deploying the waypoint at the right scope.

Also, keep in mind that ztunnel handles load balancing at L4 when there's no waypoint. It can apply locality preferences through Istio's traffic-distribution annotation or Kubernetes `spec.trafficDistribution`, but HTTP-aware policies like consistent hashing on a header need a waypoint proxy with a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-lb
  namespace: default
spec:
  host: my-app
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

## Wrapping Up

Traffic routing in ambient mode can use the Istio APIs you already know, with the caveat that VirtualService support in ambient mode is alpha. The main shift is understanding when you need a waypoint proxy and when ztunnel alone is enough. For basic connectivity and mTLS, ztunnel handles everything. For HTTP routing, traffic splitting, retries, fault injection, and HTTP-aware load balancing, deploy a waypoint proxy and apply your routing resources there.

Start by enrolling your namespace, deploy waypoint proxies where needed, and build up your routing rules incrementally. Test each rule as you go to make sure the waypoint is actually processing traffic.
