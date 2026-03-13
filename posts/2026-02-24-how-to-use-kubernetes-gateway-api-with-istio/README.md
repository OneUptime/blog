# How to Use Kubernetes Gateway API with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Kubernetes, Networking, Ingresses

Description: A complete guide to using the Kubernetes Gateway API with Istio, including installation, creating gateways, configuring routes, and understanding the differences from Istio's classic APIs.

---

The Kubernetes Gateway API is the successor to the Ingress resource, and Istio has first-class support for it. If you've been using Istio's own Gateway and VirtualService resources, the Gateway API offers a more standardized approach that works across different service mesh and ingress implementations. Istio actually recommends the Gateway API as the preferred way to manage traffic going forward.

## Why Gateway API Over Istio APIs

The classic Istio APIs (Gateway, VirtualService, DestinationRule) work well but are Istio-specific. The Kubernetes Gateway API is a cross-project standard maintained by the Kubernetes SIG-Network group. Benefits include:

- Portability across different implementations (Istio, Contour, Cilium, etc.)
- Role-based resource model (infrastructure providers manage GatewayClass, platform teams manage Gateway, developers manage Routes)
- Better multi-tenancy support
- Active upstream development with regular new features

## Installing Gateway API CRDs

Before using Gateway API with Istio, you need the Gateway API CRDs installed in your cluster. Istio 1.22+ includes experimental support, and newer versions have GA support for most resources.

Install the standard Gateway API CRDs:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml
```

If you also need experimental features (like TCPRoute, TLSRoute, GRPCRoute):

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml
```

Verify the CRDs are installed:

```bash
kubectl get crd | grep gateway
```

You should see:

```text
gatewayclasses.gateway.networking.k8s.io
gateways.gateway.networking.k8s.io
httproutes.gateway.networking.k8s.io
referencegrants.gateway.networking.k8s.io
```

## Installing Istio with Gateway API Support

Istio automatically detects Gateway API CRDs and enables support. Install Istio normally:

```bash
istioctl install --set profile=minimal
```

Or with the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: minimal
```

Verify that Istio recognizes the Gateway API:

```bash
kubectl logs deploy/istiod -n istio-system | grep "gateway"
```

You should see log messages about Gateway API controllers being started.

## Creating a GatewayClass

A GatewayClass defines which controller implements the Gateway. Istio automatically creates a GatewayClass named `istio`:

```bash
kubectl get gatewayclass
```

```text
NAME    CONTROLLER                    ACCEPTED   AGE
istio   istio.io/gateway-controller   True       5m
```

If it's not there, you can create it manually:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: istio
spec:
  controllerName: istio.io/gateway-controller
```

## Creating a Gateway

A Gateway represents a load balancer that accepts traffic into the cluster. Unlike Istio's Gateway resource, a Kubernetes Gateway API Gateway actually provisions the underlying infrastructure:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: my-tls-cert
    allowedRoutes:
      namespaces:
        from: Same
```

When you apply this, Istio creates a Deployment and Service for the gateway automatically:

```bash
kubectl get pods -n production | grep my-gateway
kubectl get svc -n production | grep my-gateway
```

This is a big difference from the classic Istio Gateway - you don't need to pre-deploy an ingress gateway. The Gateway API resource handles everything.

## Creating an HTTPRoute

HTTPRoute is the primary route type and replaces most of what VirtualService does:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-route
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: frontend-service
      port: 80
```

The `parentRefs` field links this route to the Gateway. The `hostnames` field is like the `hosts` field in an Istio VirtualService. The `rules` section defines routing based on path matching.

## Traffic Splitting

One of the most useful features is traffic splitting for canary deployments:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-route
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: app-v1
      port: 80
      weight: 90
    - name: app-v2
      port: 80
      weight: 10
```

This sends 90% of traffic to app-v1 and 10% to app-v2.

## Header-Based Routing

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-route
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - headers:
      - name: x-version
        value: beta
    backendRefs:
    - name: app-beta
      port: 80
  - backendRefs:
    - name: app-stable
      port: 80
```

Requests with the `x-version: beta` header go to app-beta. Everything else goes to app-stable.

## Comparing Gateway API to Istio APIs

Here's how the resources map:

| Istio API | Gateway API Equivalent |
|-----------|----------------------|
| Gateway | Gateway |
| VirtualService (HTTP) | HTTPRoute |
| VirtualService (TCP) | TCPRoute |
| VirtualService (TLS) | TLSRoute |
| VirtualService (gRPC) | GRPCRoute |
| DestinationRule | (partially) BackendTLSPolicy, no direct equivalent for all features |

Some Istio features don't have Gateway API equivalents yet:
- Fault injection
- Request mirroring
- Retry policies (coming in future Gateway API versions)
- Circuit breaking (still requires DestinationRule)

## Checking Gateway Status

The Gateway API uses status conditions to report the state of resources:

```bash
kubectl get gateway my-gateway -n production -o yaml
```

Look at the `status` section:

```yaml
status:
  conditions:
  - type: Accepted
    status: "True"
  - type: Programmed
    status: "True"
  addresses:
  - type: IPAddress
    value: 10.0.0.50
  listeners:
  - name: http
    attachedRoutes: 2
    conditions:
    - type: Accepted
      status: "True"
    - type: Programmed
      status: "True"
```

`Accepted` means the Gateway was valid. `Programmed` means the underlying infrastructure (the Envoy deployment) is running and ready.

Check route status too:

```bash
kubectl get httproute my-app-route -n production -o yaml
```

The status shows whether the route was accepted by the parent Gateway.

## Coexisting with Classic Istio APIs

You can use both Gateway API resources and classic Istio APIs in the same mesh. They don't conflict. This makes migration gradual - you can start creating new routes with the Gateway API while keeping existing VirtualServices in place.

However, don't configure the same hostname with both a VirtualService and an HTTPRoute attached to the same gateway. That can cause unpredictable behavior.

## Debugging

Use istioctl to inspect the generated Envoy configuration:

```bash
# Check the gateway pod's listeners
istioctl proxy-config listener deploy/my-gateway-istio -n production

# Check routes
istioctl proxy-config route deploy/my-gateway-istio -n production

# Describe a pod to see what Gateway API resources affect it
istioctl experimental describe pod <pod-name> -n production
```

The Gateway API is where Istio is headed, and getting comfortable with it now will pay off. The resource model is cleaner, the role separation makes more sense for teams, and you get the benefit of a standard that works beyond just Istio.
