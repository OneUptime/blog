# How to Configure Path-Based Routing with Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Routing, HTTPRoute, Kubernetes

Description: A practical guide to configuring path-based routing with the Kubernetes Gateway API and Istio, including prefix matching, exact matching, regex patterns, and URL rewriting.

---

Path-based routing is the bread and butter of HTTP traffic management. You send `/api` requests to the API service, `/docs` to the documentation service, and `/` to the frontend. With the Kubernetes Gateway API and Istio, path-based routing is done through HTTPRoute resources, and you get three types of path matching plus URL rewriting capabilities.

## The Three Path Match Types

HTTPRoute supports three ways to match URL paths:

1. **PathPrefix** - Matches the beginning of the path
2. **Exact** - Matches the entire path exactly
3. **RegularExpression** - Matches against a regex pattern

Each has its use cases, and understanding when to use which one will save you from subtle routing bugs.

## Setting Up the Gateway

Before creating routes, you need a Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: web-gateway
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
```

## Prefix-Based Routing

PathPrefix is the most commonly used match type. It matches any path that starts with the specified prefix:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: prefix-routes
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1
    backendRefs:
    - name: api-v1-service
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /api/v2
    backendRefs:
    - name: api-v2-service
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /static
    backendRefs:
    - name: cdn-service
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: frontend-service
      port: 80
```

With this config:
- `/api/v1/users` goes to api-v1-service
- `/api/v2/users` goes to api-v2-service
- `/static/css/main.css` goes to cdn-service
- `/about`, `/login`, or any other path goes to frontend-service

The `/` prefix is a catch-all that matches everything. Put it last because rules are evaluated in order, and the first match wins.

## Prefix Matching Behavior

An important detail: PathPrefix matching in the Gateway API is segment-aware. This means `/api` matches `/api`, `/api/`, and `/api/anything`, but it does NOT match `/apikeys` or `/api-docs`.

This is different from simple string prefix matching. The Gateway API treats `/` as a segment boundary. So `/api` only matches paths where `/api` is a complete path segment.

```yaml
# This matches /api, /api/, /api/users, /api/users/123
# But does NOT match /apikeys or /api-docs
- matches:
  - path:
      type: PathPrefix
      value: /api
```

## Exact Path Matching

Exact matching is useful when you want to route a specific path and nothing else:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: exact-routes
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: Exact
        value: /health
    backendRefs:
    - name: health-check-service
      port: 80
  - matches:
    - path:
        type: Exact
        value: /ready
    backendRefs:
    - name: readiness-service
      port: 80
  - matches:
    - path:
        type: Exact
        value: /metrics
    backendRefs:
    - name: metrics-service
      port: 80
```

`/health` matches only `/health` - not `/health/` or `/health/check`. If you need to match both `/health` and `/health/`, create two matches or use PathPrefix.

## Regular Expression Matching

For more complex patterns, use RegularExpression:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: regex-routes
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: RegularExpression
        value: "/api/v[0-9]+/users"
    backendRefs:
    - name: users-service
      port: 80
  - matches:
    - path:
        type: RegularExpression
        value: "/api/v[0-9]+/orders"
    backendRefs:
    - name: orders-service
      port: 80
  - matches:
    - path:
        type: RegularExpression
        value: "/files/[a-f0-9]{32}"
    backendRefs:
    - name: file-service
      port: 80
```

The first rule matches `/api/v1/users`, `/api/v2/users`, `/api/v99/users`, etc. The file rule matches paths like `/files/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`.

Use regex sparingly - it's more computationally expensive than prefix or exact matching. For simple cases, prefer PathPrefix.

## Combining Path Matching with Other Conditions

Path matching works alongside header, query parameter, and method matching:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: combined-routes
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  rules:
  # GET /api/users goes to read service
  - matches:
    - path:
        type: PathPrefix
        value: /api/users
      method: GET
    backendRefs:
    - name: users-read-service
      port: 80
  # POST /api/users goes to write service
  - matches:
    - path:
        type: PathPrefix
        value: /api/users
      method: POST
    backendRefs:
    - name: users-write-service
      port: 80
  # /api/users with beta header goes to beta service
  - matches:
    - path:
        type: PathPrefix
        value: /api/users
      headers:
      - name: x-beta
        value: "true"
    backendRefs:
    - name: users-beta-service
      port: 80
```

## URL Path Rewriting

Often the backend service expects a different path than what the client sends. URL rewriting handles this:

### Replace Prefix

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: rewrite-routes
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1
    filters:
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /v1
    backendRefs:
    - name: api-service
      port: 80
```

This rewrites `/api/v1/users` to `/v1/users` before forwarding to the backend. Useful when the client-facing URL structure differs from the backend's expected paths.

### Full Path Replacement

```yaml
rules:
- matches:
  - path:
      type: Exact
      value: /old-endpoint
  filters:
  - type: URLRewrite
    urlRewrite:
      path:
        type: ReplaceFullPath
        replaceFullPath: /new-endpoint
  backendRefs:
  - name: api-service
    port: 80
```

This replaces the entire path, regardless of what matched.

## Strip Path Prefix

A common pattern is to strip a prefix before forwarding. For example, clients hit `/service-a/api/data` and the backend expects just `/api/data`:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: strip-prefix-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /service-a
    filters:
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /
    backendRefs:
    - name: service-a
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /service-b
    filters:
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /
    backendRefs:
    - name: service-b
      port: 80
```

`/service-a/api/data` becomes `/api/data` when it reaches service-a. `/service-b/health` becomes `/health` when it reaches service-b.

## Route Priority and Ordering

Rules within an HTTPRoute are evaluated in order. Across multiple HTTPRoutes, the Gateway API has specificity rules:

1. Exact matches take priority over prefix matches
2. Longer prefixes take priority over shorter ones
3. If two routes are equally specific, the one with more matching criteria (headers, query params) wins

This means you can safely define your routes in separate HTTPRoute resources:

```yaml
# This is more specific and will take priority
- matches:
  - path:
      type: PathPrefix
      value: /api/v2/admin

# This is less specific
- matches:
  - path:
      type: PathPrefix
      value: /api/v2
```

## Debugging Path Routing

If requests aren't going where you expect:

```bash
# Check the Envoy route table
istioctl proxy-config route deploy/web-gateway-istio -n production -o json

# Test with curl and verbose output
curl -v http://app.example.com/api/v1/users --resolve app.example.com:80:<gateway-ip>
```

Check that your HTTPRoute was accepted:

```bash
kubectl get httproute -n production -o wide
```

Look at the `status.parents` section to see if the route was accepted by the gateway and if all references resolved correctly.

Path-based routing is fundamental to any web application architecture. The Gateway API gives you a clean, standardized way to configure it, and with Istio underneath, you get high-performance Envoy-based routing with all the observability and security benefits of the mesh.
