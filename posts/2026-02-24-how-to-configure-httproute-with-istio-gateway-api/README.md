# How to Configure HTTPRoute with Istio Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, HTTPRoute, Kubernetes, Traffic Management

Description: A complete guide to configuring HTTPRoute resources with Istio and the Kubernetes Gateway API, covering path matching, header routing, redirects, rewrites, and traffic splitting.

---

HTTPRoute is the workhorse of the Kubernetes Gateway API. It handles all HTTP and HTTPS traffic routing, replacing most of what Istio's VirtualService does for HTTP. If you're adopting the Gateway API with Istio, HTTPRoute is the resource you'll create most often.

## Basic HTTPRoute

At minimum, an HTTPRoute needs a parent Gateway reference and at least one backend:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: simple-route
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: my-app
      port: 80
```

This routes all traffic for `app.example.com` coming through `my-gateway` to the `my-app` service on port 80.

## Path Matching

HTTPRoute supports three types of path matching:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: path-routes
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - "app.example.com"
  rules:
  # Exact match - only /api/v1/users
  - matches:
    - path:
        type: Exact
        value: /api/v1/users
    backendRefs:
    - name: users-service
      port: 80
  # Prefix match - /api/v1/orders and anything under it
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1/orders
    backendRefs:
    - name: orders-service
      port: 80
  # RegularExpression match
  - matches:
    - path:
        type: RegularExpression
        value: "/api/v[0-9]+/products"
    backendRefs:
    - name: products-service
      port: 80
  # Default catch-all
  - backendRefs:
    - name: frontend
      port: 80
```

Rules are evaluated in order, and the first match wins. Put more specific rules before less specific ones.

## Header Matching

Route based on request headers:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-routes
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - headers:
      - type: Exact
        name: x-api-version
        value: "2"
    backendRefs:
    - name: api-v2
      port: 80
  - matches:
    - headers:
      - type: RegularExpression
        name: x-feature-flag
        value: "beta-.*"
    backendRefs:
    - name: beta-service
      port: 80
  - backendRefs:
    - name: api-v1
      port: 80
```

You can match on multiple headers simultaneously (AND logic):

```yaml
rules:
- matches:
  - headers:
    - name: x-api-version
      value: "2"
    - name: x-tenant
      value: "enterprise"
  backendRefs:
  - name: enterprise-api-v2
    port: 80
```

Both headers must match for the rule to apply.

## Query Parameter Matching

Route based on URL query parameters:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: query-routes
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  rules:
  - matches:
    - queryParams:
      - type: Exact
        name: format
        value: json
    backendRefs:
    - name: json-api
      port: 80
  - backendRefs:
    - name: default-api
      port: 80
```

## Method Matching

Route based on HTTP method:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: method-routes
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  rules:
  - matches:
    - method: GET
      path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: read-api
      port: 80
  - matches:
    - method: POST
      path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: write-api
      port: 80
```

## Request Redirects

Redirect traffic to a different URL:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: redirect-route
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  hostnames:
  - "old.example.com"
  rules:
  - filters:
    - type: RequestRedirect
      requestRedirect:
        hostname: new.example.com
        statusCode: 301
```

You can also redirect to HTTPS:

```yaml
rules:
- filters:
  - type: RequestRedirect
    requestRedirect:
      scheme: https
      statusCode: 301
```

## URL Rewrites

Rewrite the URL path before forwarding to the backend:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: rewrite-route
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /v2/api
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

Requests to `/v2/api/users` get rewritten to `/api/users` before being sent to the backend.

You can also rewrite the hostname:

```yaml
filters:
- type: URLRewrite
  urlRewrite:
    hostname: internal-api.production.svc.cluster.local
```

## Request Header Modification

Add, set, or remove request headers:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-modify-route
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
  rules:
  - filters:
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: x-request-source
          value: gateway
        set:
        - name: x-forwarded-proto
          value: https
        remove:
        - x-internal-header
    backendRefs:
    - name: my-app
      port: 80
```

Similarly, you can modify response headers:

```yaml
filters:
- type: ResponseHeaderModifier
  responseHeaderModifier:
    add:
    - name: x-served-by
      value: istio-gateway
    set:
    - name: strict-transport-security
      value: "max-age=31536000; includeSubDomains"
    remove:
    - server
```

## Traffic Splitting

Split traffic between multiple backends with weights:

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
    - name: app-stable
      port: 80
      weight: 95
    - name: app-canary
      port: 80
      weight: 5
```

Weights are relative. With 95 and 5, about 95% goes to stable and 5% goes to canary. You can use any numbers - 9 and 1 would give the same result.

## Combining Matches and Filters

You can combine multiple match conditions and filters in a single rule:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: complex-route
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
        value: /api/v2
      headers:
      - name: x-tenant
        value: premium
    filters:
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: x-priority
          value: high
    backendRefs:
    - name: premium-api
      port: 80
      weight: 100
```

## Targeting Specific Listeners

If your Gateway has multiple listeners, you can target specific ones using `sectionName`:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: https-only-route
  namespace: production
spec:
  parentRefs:
  - name: my-gateway
    sectionName: https
  rules:
  - backendRefs:
    - name: secure-app
      port: 80
```

This route only attaches to the `https` listener and won't receive traffic from other listeners.

## Checking Route Status

```bash
kubectl get httproute -n production
```

For detailed status:

```bash
kubectl get httproute simple-route -n production -o yaml
```

The status shows whether the route was accepted by the parent Gateway:

```yaml
status:
  parents:
  - parentRef:
      name: my-gateway
    controllerName: istio.io/gateway-controller
    conditions:
    - type: Accepted
      status: "True"
    - type: ResolvedRefs
      status: "True"
```

If `Accepted` is False, check the `reason` and `message` fields for details. Common issues:
- Backend service doesn't exist
- Parent Gateway doesn't allow routes from this namespace
- Invalid match or filter configuration

## Debugging HTTPRoute

```bash
# Check the generated Envoy routes
istioctl proxy-config route deploy/my-gateway-istio -n production -o json

# Analyze for issues
istioctl analyze -n production
```

HTTPRoute covers the vast majority of HTTP routing needs. It's well-designed, intuitive, and with Istio backing it, you get the full power of Envoy underneath. For anything HTTPRoute can't do, you can still fall back to Istio's VirtualService or use EnvoyFilter for advanced cases.
