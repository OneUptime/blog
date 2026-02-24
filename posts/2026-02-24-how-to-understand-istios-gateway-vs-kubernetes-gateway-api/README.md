# How to Understand Istio's Gateway vs Kubernetes Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, Kubernetes Gateway API, Ingress, Networking

Description: A thorough comparison of Istio Gateway and the Kubernetes Gateway API, covering their architecture differences, feature parity, and migration strategies.

---

There are now two Gateway options when running Istio: Istio's own Gateway resource (part of the Istio API) and the Kubernetes Gateway API (a standard Kubernetes resource). Both handle ingress traffic, both work with Istio, but they have different designs and different levels of maturity. Picking the right one matters for the long-term maintainability of your setup.

## Istio Gateway: The Original Approach

Istio's Gateway resource has been around since the early days of Istio. It defines which ports and protocols to expose at the edge of the mesh:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "app.example.com"
    - "api.example.com"
    tls:
      mode: SIMPLE
      credentialName: my-tls-cert
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
    tls:
      httpsRedirect: true
```

The Gateway is paired with a VirtualService that defines the actual routing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routes
spec:
  hosts:
  - "app.example.com"
  gateways:
  - my-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-service
        port:
          number: 8080
  - route:
    - destination:
        host: frontend-service
        port:
          number: 80
```

The separation is clean: Gateway handles the listener (what to expose), VirtualService handles the routes (where to send traffic).

## The Gateway Deployment Model

Istio Gateway requires a pre-existing Envoy deployment that acts as the ingress proxy. Typically, this is the `istio-ingressgateway` Deployment that gets installed with Istio:

```bash
kubectl get deploy -n istio-system istio-ingressgateway
```

The Gateway's `selector` field selects this deployment:

```yaml
spec:
  selector:
    istio: ingressgateway  # Matches the deployment's pod labels
```

This means:
- Someone needs to create and manage the gateway deployment
- The Gateway resource configures that deployment
- Scaling, resource limits, and placement are separate from the Gateway config

## Kubernetes Gateway API: The New Standard

The Kubernetes Gateway API is a newer, standard Kubernetes API that aims to replace Ingress and provide a richer model for traffic management. Istio implements this API as an alternative to its own Gateway.

The key conceptual difference: instead of selecting an existing deployment, the Kubernetes Gateway API can create the gateway deployment automatically.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  gatewayClassName: istio
  listeners:
  - name: https
    port: 443
    protocol: HTTPS
    hostname: "app.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: my-tls-cert
  - name: http
    port: 80
    protocol: HTTP
    hostname: "app.example.com"
```

Routes are defined with HTTPRoute:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-routes
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
      port: 8080
  - backendRefs:
    - name: frontend-service
      port: 80
```

## Architecture Differences

### Deployment Model

**Istio Gateway** - You manage the gateway deployment yourself. The Gateway resource only configures an existing deployment.

**Kubernetes Gateway API** - The GatewayClass implementation (Istio) automatically creates a Deployment and Service for each Gateway resource. When you create the Gateway, Istio spins up the proxy.

```bash
# After creating a K8s Gateway API Gateway:
kubectl get deploy -n default
# NAME           READY
# my-gateway     1/1     # Automatically created

kubectl get svc -n default
# NAME           TYPE           EXTERNAL-IP
# my-gateway     LoadBalancer   34.x.x.x    # Automatically created
```

This is a big operational difference. With the Kubernetes Gateway API, the gateway lifecycle is tied to the Gateway resource. Delete the resource, and the deployment goes away.

### Role-Based Access

**Istio Gateway** - The Gateway and VirtualService can be in different namespaces, but access control is implicit. Anyone who can create a VirtualService that references a Gateway can route traffic through it.

**Kubernetes Gateway API** - Has explicit role separation built in:
- **Infrastructure provider** - Manages GatewayClass (cluster-wide)
- **Cluster operator** - Creates Gateway resources (namespace-level)
- **Application developer** - Creates HTTPRoute (namespace-level, attached to Gateway)

HTTPRoute attachment is explicit and controlled:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
spec:
  gatewayClassName: istio
  listeners:
  - name: https
    port: 443
    protocol: HTTPS
    hostname: "*.example.com"
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: "true"
```

Only namespaces with the `gateway-access: true` label can attach routes to this gateway.

### Route Types

**Istio Gateway + VirtualService** - Handles HTTP, TLS, and TCP routing all in the VirtualService resource.

**Kubernetes Gateway API** - Separate route types:
- `HTTPRoute` - HTTP/HTTPS traffic
- `TLSRoute` - TLS passthrough
- `TCPRoute` - Raw TCP
- `GRPCRoute` - gRPC-specific routing

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: grpc-routes
spec:
  parentRefs:
  - name: my-gateway
  rules:
  - matches:
    - method:
        service: myapp.ProductService
        method: GetProduct
    backendRefs:
    - name: product-service
      port: 50051
```

### Traffic Splitting

Both support weighted traffic splitting:

```yaml
# Istio VirtualService
http:
- route:
  - destination:
      host: my-service
      subset: v1
    weight: 90
  - destination:
      host: my-service
      subset: v2
    weight: 10

# Kubernetes HTTPRoute
rules:
- backendRefs:
  - name: my-service-v1
    port: 8080
    weight: 90
  - name: my-service-v2
    port: 8080
    weight: 10
```

Note that HTTPRoute references different Services rather than subsets. You need separate Kubernetes Services for each version.

### Header Matching

Both support header-based routing:

```yaml
# Istio VirtualService
http:
- match:
  - headers:
      x-version:
        exact: "beta"
  route:
  - destination:
      host: my-service
      subset: v2

# Kubernetes HTTPRoute
rules:
- matches:
  - headers:
    - name: x-version
      value: beta
  backendRefs:
  - name: my-service-v2
    port: 8080
```

## Feature Comparison

| Feature | Istio Gateway | K8s Gateway API |
|---------|--------------|-----------------|
| Auto-deploy proxy | No | Yes |
| Role-based access | Implicit | Explicit |
| Traffic splitting | Via VirtualService subsets | Via multiple Services |
| Header matching | Yes | Yes |
| Retry/timeout | Yes (VirtualService) | Yes (HTTPRoute backendRef timeout, policy) |
| Fault injection | Yes | Via filter extensions |
| Request mirroring | Yes | Yes (HTTPRoute filters) |
| TCP routing | Yes | Yes (TCPRoute) |
| gRPC routing | Yes (in VirtualService) | Yes (GRPCRoute) |
| Cross-namespace | Yes | Yes (with explicit grants) |
| Status reporting | Limited | Rich status on Gateway and Routes |

## Which Should You Use?

### Use Istio Gateway when:

- You have an existing Istio deployment with the classic gateway model
- You need Istio-specific features not yet in Gateway API (some EnvoyFilter integrations)
- Your team is already familiar with VirtualService and DestinationRule
- You need maximum feature coverage today

### Use Kubernetes Gateway API when:

- You are starting fresh with Istio
- You want a standard Kubernetes API (portable across implementations)
- You want automatic gateway deployment lifecycle
- You need explicit multi-tenant access control
- You want better status reporting for troubleshooting

## Migration from Istio Gateway to Gateway API

If you want to migrate, here is the mapping:

```yaml
# Istio Gateway
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "app.example.com"
    tls:
      mode: SIMPLE
      credentialName: my-tls

# Becomes
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
spec:
  gatewayClassName: istio
  listeners:
  - name: https
    port: 443
    protocol: HTTPS
    hostname: "app.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: my-tls
```

And the VirtualService becomes an HTTPRoute:

```yaml
# Istio VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app
spec:
  hosts:
  - app.example.com
  gateways:
  - my-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-service
        port:
          number: 8080

# Becomes
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - app.example.com
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
```

## Using Both Together

You can run both Istio Gateway and Kubernetes Gateway API in the same cluster. They use different resources and different gateway deployments, so they do not conflict. This makes incremental migration possible.

The Kubernetes Gateway API is the future direction. Istio has committed to full support, and it is already the recommended approach for new installations. But Istio's own Gateway is not going away anytime soon - it is still fully supported and widely used. Pick the one that fits your team's needs and existing infrastructure, and know that you can migrate between them when the time is right.
