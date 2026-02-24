# How to Set Up URL Rewriting in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, URL Rewriting, VirtualService, Traffic Management, Kubernetes

Description: Practical guide to configuring URL rewrites in Istio using VirtualService for path prefix rewriting, regex rewrites, and host authority rewriting.

---

URL rewriting in Istio lets you modify the request path or host header before it reaches your backend service. This is useful when your external URL structure does not match your internal service paths. Instead of making your backend aware of external routing, you handle the translation at the proxy layer.

## Basic Path Prefix Rewrite

The most common use case is stripping or replacing a path prefix. Say your gateway exposes `/api/v1/users` but your backend expects requests at `/users`:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-rewrite
  namespace: default
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1/users
      rewrite:
        uri: /users
      route:
        - destination:
            host: user-service
            port:
              number: 8080
```

When a request comes in for `/api/v1/users/123`, the rewrite changes it to `/users/123`. The prefix `/api/v1/users` is replaced with `/users`, and the rest of the path is preserved.

Important detail: the rewrite `uri` replaces the matched prefix, not the entire path. So if you match on `prefix: /api/v1` and rewrite to `uri: /v2`, a request for `/api/v1/users/123` becomes `/v2/users/123`.

## Stripping a Path Prefix

To strip a prefix entirely, rewrite to `/`:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: strip-prefix
  namespace: default
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - match:
        - uri:
            prefix: /service-a
      rewrite:
        uri: /
      route:
        - destination:
            host: service-a
            port:
              number: 8080
    - match:
        - uri:
            prefix: /service-b
      rewrite:
        uri: /
      route:
        - destination:
            host: service-b
            port:
              number: 8080
```

A request to `/service-a/health` gets rewritten to `/health` and routed to service-a. A request to `/service-b/api/data` becomes `/api/data` and goes to service-b.

## Regex-Based URL Rewriting

For more complex rewriting patterns, you can use regex with capture groups:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: regex-rewrite
  namespace: default
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - match:
        - uri:
            regex: "/service/([^/]+)/(.*)"
      rewrite:
        uriRegexRewrite:
          match: "/service/([^/]+)/(.*)"
          rewrite: "/\\2/instance/\\1"
      route:
        - destination:
            host: backend-service
            port:
              number: 8080
```

A request to `/service/myapp/api/data` gets rewritten to `/api/data/instance/myapp`. The capture groups in the regex are referenced with `\\1`, `\\2`, etc. in the rewrite string.

Note that `uri` and `uriRegexRewrite` are mutually exclusive in the rewrite block. You use one or the other.

Another regex example - versioned API path restructuring:

```yaml
http:
  - match:
      - uri:
          regex: "/api/v([0-9]+)/(.+)"
    rewrite:
      uriRegexRewrite:
        match: "/api/v([0-9]+)/(.+)"
        rewrite: "/\\2?api_version=\\1"
    route:
      - destination:
          host: api-service
          port:
            number: 8080
```

This converts `/api/v2/users/list` into `/users/list?api_version=2`.

## Authority (Host) Rewriting

You can also rewrite the Host header (also called the authority in HTTP/2):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: host-rewrite
  namespace: default
spec:
  hosts:
    - public.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - match:
        - uri:
            prefix: /api
      rewrite:
        authority: internal-api.default.svc.cluster.local
      route:
        - destination:
            host: internal-api
            port:
              number: 8080
```

This changes the Host header from `public.example.com` to `internal-api.default.svc.cluster.local` before forwarding. This is useful when the backend service validates the Host header or uses it for routing.

## Combining Path and Authority Rewrites

You can rewrite both the path and the authority in the same rule:

```yaml
http:
  - match:
      - uri:
          prefix: /legacy/api
    rewrite:
      uri: /v2/api
      authority: new-backend.default.svc.cluster.local
    route:
      - destination:
          host: new-backend
          port:
            number: 8080
```

## Multiple Rewrite Rules

VirtualService rules are evaluated in order, so you can have multiple rewrite rules for different path patterns:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: multi-rewrite
  namespace: default
spec:
  hosts:
    - app.example.com
  gateways:
    - istio-system/my-gateway
  http:
    - match:
        - uri:
            prefix: /users
      rewrite:
        uri: /api/v2/users
      route:
        - destination:
            host: user-service
            port:
              number: 8080
    - match:
        - uri:
            prefix: /orders
      rewrite:
        uri: /api/v1/orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
    - match:
        - uri:
            prefix: /products
      rewrite:
        uri: /catalog/products
      route:
        - destination:
            host: catalog-service
            port:
              number: 8080
    - route:
        - destination:
            host: default-service
            port:
              number: 8080
```

The last rule without a match acts as a catch-all.

## Rewrites for Mesh-Internal Traffic

Rewrites work for mesh-internal traffic too, not just gateway traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: internal-rewrite
  namespace: default
spec:
  hosts:
    - legacy-service.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /new-endpoint
      rewrite:
        uri: /old-endpoint
      route:
        - destination:
            host: legacy-service
            port:
              number: 8080
    - route:
        - destination:
            host: legacy-service
            port:
              number: 8080
```

This rewrites calls from any service in the mesh to the legacy service. When service A calls `legacy-service/new-endpoint/data`, it gets rewritten to `/old-endpoint/data`.

## Verifying Rewrites

To verify that rewrites are working:

```bash
# Check the route configuration on the proxy
istioctl proxy-config routes <pod-name> -n <namespace> -o json

# Test with curl (from inside the mesh)
kubectl exec <pod> -c istio-proxy -- curl -v http://app.example.com/api/v1/users

# Check Envoy access logs for the rewritten path
kubectl logs <gateway-pod> -c istio-proxy -n istio-system
```

In the access logs, you will see the original path in the request line and the rewritten path in the upstream request.

## Common Pitfalls

### Trailing Slash Behavior

Be aware of trailing slash behavior. A prefix match on `/api` will match both `/api` and `/api/something`, but rewriting `/api` to `/v2` turns `/api/something` into `/v2/something` and `/api` into `/v2`. If your backend expects a trailing slash, you might need to handle both cases:

```yaml
http:
  - match:
      - uri:
          exact: /api
    redirect:
      uri: /api/
  - match:
      - uri:
          prefix: /api/
    rewrite:
      uri: /v2/
    route:
      - destination:
          host: backend
```

### Case Sensitivity

URI matching is case-sensitive by default. If you need case-insensitive matching, use the `ignoreUriCase: true` option in the match block:

```yaml
match:
  - uri:
      prefix: /api
    ignoreUriCase: true
```

### Regex Performance

Regex rewrites are more expensive than prefix rewrites. For high-traffic services, prefer prefix-based rewrites when possible. If you must use regex, keep the patterns simple and avoid backtracking.

URL rewriting in Istio is flexible enough to handle most path translation needs. Start with simple prefix rewrites and reach for regex only when the pattern genuinely requires it.
