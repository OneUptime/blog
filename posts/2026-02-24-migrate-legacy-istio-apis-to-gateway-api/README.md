# How to Migrate from Legacy Istio APIs to Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Kubernetes, Migration, Networking

Description: Step-by-step guide to migrating from Istio's classic networking APIs like VirtualService and Gateway to the Kubernetes Gateway API.

---

Istio has been moving toward the Kubernetes Gateway API as the standard way to configure traffic routing. If you have been using Istio's classic APIs - VirtualService, DestinationRule, and the Istio Gateway resource - for a while, now is a good time to start planning your migration. The Gateway API provides a more standardized, portable approach to traffic management that works across different service mesh and ingress implementations.

This guide covers the practical steps to move from legacy Istio APIs to the Gateway API.

## What Is Changing?

The Kubernetes Gateway API is a set of CRDs that provide a role-oriented, expressive way to model service networking. Istio has supported the Gateway API since version 1.16, and support has gotten progressively better in subsequent releases.

Here is the mapping between old and new resources:

| Legacy Istio API | Gateway API Equivalent |
|---|---|
| `Gateway` (networking.istio.io) | `Gateway` (gateway.networking.k8s.io) |
| `VirtualService` | `HTTPRoute`, `TCPRoute`, `GRPCRoute` |
| `DestinationRule` | No direct equivalent (some features in `BackendPolicy`) |

The important thing to note: DestinationRule does not have a full replacement yet. Features like circuit breaking and connection pool settings still require Istio-specific configuration.

## Prerequisites

Make sure you are running Istio 1.21 or later for the best Gateway API support. You also need the Gateway API CRDs installed:

```bash
kubectl get crd gateways.gateway.networking.k8s.io
```

If they are not installed:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml
```

Check your Istio version:

```bash
istioctl version
```

## Step 1: Inventory Your Existing Resources

Before you start migrating, get a full picture of what you have:

```bash
# List all Istio networking resources
kubectl get virtualservices --all-namespaces
kubectl get destinationrules --all-namespaces
kubectl get gateways --all-namespaces
kubectl get serviceentries --all-namespaces
```

Export them for reference:

```bash
kubectl get virtualservices --all-namespaces -o yaml > legacy-virtualservices.yaml
kubectl get gateways --all-namespaces -o yaml > legacy-gateways.yaml
```

## Step 2: Migrate Gateway Resources

The Istio Gateway resource maps to the Kubernetes Gateway resource, but the structure is different.

**Legacy Istio Gateway:**

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
    hosts:
    - "app.example.com"
    tls:
      mode: SIMPLE
      credentialName: app-tls
```

**New Gateway API equivalent:**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    port: 80
    protocol: HTTP
    hostname: "app.example.com"
    allowedRoutes:
      namespaces:
        from: Same
  - name: https
    port: 443
    protocol: HTTPS
    hostname: "app.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-tls
    allowedRoutes:
      namespaces:
        from: Same
```

Key differences to notice:

- `gatewayClassName: istio` replaces the `selector` field
- Each listener is defined separately with a `name`
- TLS configuration uses `certificateRefs` instead of `credentialName`
- The `allowedRoutes` field controls which namespaces can attach routes to this gateway

When you apply the new Gateway, Istio will automatically create a new deployment and service for it. This is different from the legacy approach where you referenced an existing `istio-ingressgateway` deployment.

## Step 3: Migrate VirtualService to HTTPRoute

This is where most of the work happens. VirtualService is a powerful resource, and you need to map its features to HTTPRoute.

**Legacy VirtualService:**

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-routes
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/my-gateway
  http:
  - match:
    - uri:
        prefix: /api/v1
      headers:
        x-custom-header:
          exact: "test"
    route:
    - destination:
        host: api-v1
        port:
          number: 8080
      weight: 90
    - destination:
        host: api-v2
        port:
          number: 8080
      weight: 10
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
  - route:
    - destination:
        host: web-frontend
        port:
          number: 80
```

**New HTTPRoute equivalent:**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-routes
spec:
  parentRefs:
  - name: my-gateway
    namespace: default
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1
      headers:
      - name: x-custom-header
        value: "test"
    backendRefs:
    - name: api-v1
      port: 8080
      weight: 90
    - name: api-v2
      port: 8080
      weight: 10
    timeouts:
      request: 30s
  - backendRefs:
    - name: web-frontend
      port: 80
```

A few things changed:

- `gateways` becomes `parentRefs`
- `destination.host` becomes `backendRefs[].name`
- Weights are specified directly in `backendRefs`
- Timeouts moved to the `timeouts` field on the rule
- Retry configuration is not yet in the standard Gateway API - you still need Istio-specific configuration for this

## Step 4: Handle Features Not Yet in Gateway API

Some Istio VirtualService features do not have Gateway API equivalents yet. For these, you have two options:

### Option A: Use Istio Policy Attachments

Istio provides custom policy resources that attach to Gateway API objects:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-v1-dr
spec:
  host: api-v1
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

DestinationRule still works alongside Gateway API routes. You can use HTTPRoute for routing and keep DestinationRule for circuit breaking and load balancing configuration.

### Option B: Use Retry Filters (Istio Extension)

For retry policies, Istio supports attaching retry configuration via annotations or through the Telemetry API depending on the version.

## Step 5: Migrate Mesh-Internal Routes

For service-to-service routing within the mesh (not through an ingress gateway), the migration is slightly different. Legacy VirtualService resources with `mesh` gateway become HTTPRoute resources without a `parentRef`:

**Legacy internal routing:**

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-route
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

**Gateway API equivalent for mesh traffic:**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: reviews-route
spec:
  parentRefs:
  - group: ""
    kind: Service
    name: reviews
  rules:
  - matches:
    - headers:
      - name: end-user
        value: jason
    backendRefs:
    - name: reviews-v2
      port: 9080
  - backendRefs:
    - name: reviews-v1
      port: 9080
```

Notice that for mesh-internal routing, the `parentRef` points to a Kubernetes Service rather than a Gateway.

## Step 6: Run Both APIs Side by Side

You do not need to migrate everything at once. Istio supports both legacy and Gateway API resources running simultaneously. Start by migrating one service at a time:

```bash
# Apply the new Gateway API resources
kubectl apply -f new-httproute.yaml

# Test traffic flows correctly
curl -H "Host: app.example.com" http://$GATEWAY_IP/api/v1

# Once verified, remove the legacy resource
kubectl delete virtualservice app-routes
```

## Step 7: Validate the Migration

After migrating each resource, check that Istio has picked it up correctly:

```bash
# Check the proxy configuration
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system

# Verify the HTTPRoute status
kubectl get httproute app-routes -o yaml | grep -A 10 status
```

The HTTPRoute status should show that the route has been accepted by the parent Gateway.

## Common Migration Gotchas

**Header matching syntax**: In VirtualService, header matching uses nested objects (`exact`, `prefix`, `regex`). In HTTPRoute, you use `type` field with values like `Exact`, `RegularExpression`.

**Namespace boundaries**: Gateway API has stricter namespace isolation by default. If your routes are in a different namespace than the Gateway, you need to configure `allowedRoutes.namespaces` on the Gateway listener.

**Port references**: VirtualService uses `port.number`, while HTTPRoute backendRefs use just `port` as an integer.

**No subset support**: Gateway API does not have the concept of subsets. Instead, you deploy different versions as separate Kubernetes Services and reference them directly in backendRefs.

## Timeline and Planning

There is no urgent deadline to migrate away from legacy Istio APIs. They still work and will continue to be supported for a while. But starting the migration now, service by service, puts you in a better position as the ecosystem moves toward the Gateway API standard. Prioritize migrating ingress routing first, then tackle internal mesh routing, and leave DestinationRule for last since it has the least Gateway API coverage.
