# How to Migrate from Istio APIs to Kubernetes Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Migration, Kubernetes, Networking

Description: A practical migration guide for moving from Istio's Gateway and VirtualService resources to the Kubernetes Gateway API, including resource mapping, coexistence, and step-by-step examples.

---

If you've been running Istio with its native APIs (Gateway, VirtualService, DestinationRule), you might be thinking about migrating to the Kubernetes Gateway API. Istio recommends the Gateway API going forward, and it offers better portability and a cleaner resource model. The good news is that you don't have to migrate everything at once - both APIs can coexist in the same mesh.

## Why Migrate

The Kubernetes Gateway API is the standard that the broader Kubernetes ecosystem is converging on. Several benefits make the migration worth considering:

- **Portability** - Your routing config works across implementations (Istio, Cilium, Contour)
- **Role-based model** - Clear separation between infrastructure ops (GatewayClass, Gateway) and app developers (Routes)
- **Upstream momentum** - Gateway API is where new features are being developed
- **Multi-tenancy** - Better namespace isolation and cross-namespace routing controls

That said, not everything in Istio's APIs has a Gateway API equivalent yet. Features like fault injection, request mirroring, and complex retry policies still need Istio resources.

## Resource Mapping

Here's how Istio resources map to Gateway API resources:

| Istio Resource | Gateway API Resource |
|---|---|
| Gateway | Gateway + GatewayClass |
| VirtualService (HTTP routing) | HTTPRoute |
| VirtualService (TLS passthrough) | TLSRoute |
| VirtualService (TCP routing) | TCPRoute |
| VirtualService (gRPC routing) | GRPCRoute |
| DestinationRule (subsets for routing) | Multiple Services + weight-based backendRefs |
| DestinationRule (traffic policy) | No equivalent - keep using DestinationRule |
| ServiceEntry | No equivalent - keep using ServiceEntry |
| Sidecar | No equivalent - keep using Sidecar |
| AuthorizationPolicy | No equivalent - keep using AuthorizationPolicy |

## Step 1: Install Gateway API CRDs

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml

# For experimental resources (TCPRoute, TLSRoute, GRPCRoute)
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml
```

Verify:

```bash
kubectl get crd | grep gateway.networking.k8s.io
```

## Step 2: Migrate the Gateway Resource

**Before (Istio Gateway):**

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls-cert
    hosts:
    - "app.example.com"
```

**After (Gateway API):**

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
      - name: app-tls-cert
    allowedRoutes:
      namespaces:
        from: Same
```

Key differences:
- No `selector` - the Gateway API Gateway creates its own deployment
- TLS certificates are referenced as Kubernetes Secrets, not Istio credential names
- The Gateway can be in any namespace (not just istio-system)
- `allowedRoutes` controls which namespaces can attach routes

## Step 3: Migrate VirtualService to HTTPRoute

**Before (VirtualService):**

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-routing
  namespace: production
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/my-gateway
  http:
  - match:
    - uri:
        prefix: /api
      headers:
        x-version:
          exact: beta
    route:
    - destination:
        host: api-beta
        port:
          number: 80
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-stable
        port:
          number: 80
      weight: 90
    - destination:
        host: api-canary
        port:
          number: 80
      weight: 10
  - route:
    - destination:
        host: frontend
        port:
          number: 80
```

**After (HTTPRoute):**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-routing
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
      headers:
      - name: x-version
        value: beta
    backendRefs:
    - name: api-beta
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-stable
      port: 80
      weight: 90
    - name: api-canary
      port: 80
      weight: 10
  - backendRefs:
    - name: frontend
      port: 80
```

The structure is similar, but the field names and nesting differ. Some specific translations:

- `gateways` becomes `parentRefs`
- `hosts` becomes `hostnames`
- `uri.prefix` becomes `path.type: PathPrefix`
- `destination.host` becomes `backendRefs.name`
- `weight` is on each backendRef instead of on the route

## Step 4: Migrate URL Redirects and Rewrites

**Before (VirtualService redirect):**

```yaml
http:
- match:
  - uri:
      prefix: /old-path
  redirect:
    uri: /new-path
    redirectCode: 301
```

**After (HTTPRoute redirect):**

```yaml
rules:
- matches:
  - path:
      type: PathPrefix
      value: /old-path
  filters:
  - type: RequestRedirect
    requestRedirect:
      path:
        type: ReplaceFullPath
        replaceFullPath: /new-path
      statusCode: 301
```

**Before (VirtualService rewrite):**

```yaml
http:
- match:
  - uri:
      prefix: /api/v2
  rewrite:
    uri: /api
  route:
  - destination:
      host: api-service
```

**After (HTTPRoute rewrite):**

```yaml
rules:
- matches:
  - path:
      type: PathPrefix
      value: /api/v2
  filters:
  - type: URLRewrite
    urlRewrite:
      path:
        type: ReplacePrefixMatch
        replacePrefixMatch: /api
  backendRefs:
  - name: api-service
    port: 80
```

## Step 5: Handle Features Without Gateway API Equivalents

Some VirtualService features don't have Gateway API equivalents. You have two options:

**Keep using VirtualService** for those specific features alongside Gateway API routes for everything else.

**Use Istio's extensions** through policy resources:

For fault injection, retries, and timeouts, you can still use VirtualService or configure these through DestinationRule and EnvoyFilter.

Example - keeping a VirtualService for fault injection while using HTTPRoute for routing:

```yaml
# HTTPRoute handles the routing
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-service-route
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: my-service
      port: 80
---
# DestinationRule handles connection pool and circuit breaking
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-policy
  namespace: production
spec:
  host: my-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

## Step 6: Migrate DestinationRule Subsets

Istio subsets don't have a direct Gateway API equivalent. Instead, create separate Kubernetes Services:

**Before (with subsets):**

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

**After (separate Services):**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service-v1
spec:
  selector:
    app: my-service
    version: v1
  ports:
  - port: 80
---
apiVersion: v1
kind: Service
metadata:
  name: my-service-v2
spec:
  selector:
    app: my-service
    version: v2
  ports:
  - port: 80
```

Then reference them in the HTTPRoute:

```yaml
rules:
- backendRefs:
  - name: my-service-v1
    port: 80
    weight: 90
  - name: my-service-v2
    port: 80
    weight: 10
```

## Migration Strategy

**Start with new services.** Any new service you deploy should use Gateway API from the start. This builds team familiarity without risking existing services.

**Migrate non-critical services first.** Move staging and development environments before production.

**Run both APIs in parallel.** You can have Istio VirtualServices and Gateway API HTTPRoutes in the same cluster. Just don't configure the same hostname on the same gateway with both.

**Migrate one service at a time.** Create the HTTPRoute, verify it works, then delete the VirtualService.

**Keep DestinationRule and other Istio resources.** These complement Gateway API routes and aren't being replaced.

The migration doesn't have to be all-or-nothing. Take it gradually, service by service, and you'll end up with a cleaner, more portable configuration.
