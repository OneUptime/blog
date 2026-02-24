# How to Modify Request Path with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, URL Rewrite, Path Routing, VirtualService, Traffic Management

Description: How to rewrite and redirect request paths using Istio VirtualService for URL normalization, API versioning, and backend routing.

---

Modifying request paths is something you run into constantly when working with microservices. Maybe your frontend expects one URL structure while your backend uses another. Or you are migrating from a monolith and need old URLs to reach new services. Or your API gateway needs to strip a prefix before passing the request to the actual service. Istio handles all of these scenarios through VirtualService path rewriting and redirects.

## Basic Path Rewriting

The most common operation is stripping a prefix. Say your gateway receives requests at `/api/users/123` but your backend service expects just `/users/123`. VirtualService handles this with the `rewrite` field:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-rewrite
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            prefix: /api/users
      rewrite:
        uri: /users
      route:
        - destination:
            host: user-service
            port:
              number: 8080
```

When a request comes in for `/api/users/123`, Istio rewrites it to `/users/123` before sending it to `user-service`. The prefix `/api/users` gets replaced with `/users`, and the rest of the path is preserved.

## Rewriting to Root

A common pattern is routing requests from a path prefix to the root of a service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: service-rewrite
spec:
  hosts:
    - app.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            prefix: /billing
      rewrite:
        uri: /
      route:
        - destination:
            host: billing-service
            port:
              number: 8080
```

A request to `/billing/invoices/42` becomes `/invoices/42` at the billing service.

## Multiple Path Rewrites

You can have different rewrite rules for different path prefixes:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: multi-rewrite
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            prefix: /v1/users
      rewrite:
        uri: /api/users
      route:
        - destination:
            host: user-service-v1
            port:
              number: 8080
    - match:
        - uri:
            prefix: /v2/users
      rewrite:
        uri: /api/users
      route:
        - destination:
            host: user-service-v2
            port:
              number: 8080
    - match:
        - uri:
            prefix: /v1/orders
      rewrite:
        uri: /orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
```

Both `/v1/users/123` and `/v2/users/123` get rewritten to `/api/users/123`, but they are routed to different backend service versions.

## Regex Path Matching

For more complex path patterns, use regex matching:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: regex-rewrite
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            regex: "/legacy/api/v[0-9]+/(.*)"
      rewrite:
        uri: /api/current
      route:
        - destination:
            host: api-service
            port:
              number: 8080
```

This catches any path like `/legacy/api/v1/something` or `/legacy/api/v3/something` and rewrites it to `/api/current`.

Note that with basic VirtualService rewrite, you cannot use regex capture groups in the rewrite URI. The rewrite is a static replacement. For capture group based rewrites, you need an EnvoyFilter.

## HTTP Redirects

Instead of rewriting the path internally, you can send the client a redirect:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: redirect-rules
spec:
  hosts:
    - app.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            exact: /old-page
      redirect:
        uri: /new-page
        redirectCode: 301
    - match:
        - uri:
            prefix: /blog
      redirect:
        uri: /articles
        redirectCode: 308
```

The difference between rewrite and redirect is that rewrite happens transparently (the client does not know the path changed), while redirect sends an HTTP 301/302/308 response telling the client to make a new request to the new URL.

## Host and Path Combined Redirect

You can redirect to a completely different host:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: host-redirect
spec:
  hosts:
    - old.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            prefix: /
      redirect:
        authority: new.example.com
        redirectCode: 301
```

All traffic to `old.example.com` gets a 301 redirect to `new.example.com` with the same path preserved.

## Rewriting with Authority (Host Header)

You can also change the host header along with the path:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: authority-rewrite
spec:
  hosts:
    - api.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            prefix: /external-api
      rewrite:
        uri: /api
        authority: internal-api.default.svc.cluster.local
      route:
        - destination:
            host: internal-api
            port:
              number: 8080
```

## Advanced Path Manipulation with EnvoyFilter

When VirtualService rewriting is not flexible enough, EnvoyFilter with Lua lets you do arbitrary path manipulation:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: path-transformer
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              function envoy_on_request(request_handle)
                local path = request_handle:headers():get(":path")
                -- Convert /users/123/profile to /api/v2/users/123/profile
                local new_path = path:gsub("^/users/(%d+)/", "/api/v2/users/%1/")
                if new_path ~= path then
                  request_handle:headers():replace(":path", new_path)
                end
              end
```

This uses Lua's string pattern matching to do capture-group-style rewrites that VirtualService cannot handle natively.

## Stripping Query Parameters

VirtualService rewrite only modifies the path, not query parameters. To strip or modify query parameters, use EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: strip-query-params
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              function envoy_on_request(request_handle)
                local path = request_handle:headers():get(":path")
                -- Remove debug query parameter
                local new_path = path:gsub("[?&]debug=[^&]*", "")
                if new_path ~= path then
                  request_handle:headers():replace(":path", new_path)
                end
              end
```

## Testing Path Modifications

Verify your path rewrites are working:

```bash
# Deploy httpbin as a test backend
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/httpbin.yaml

# Test the rewrite - httpbin echoes back the received URL
curl -s http://api.example.com/api/users/123 | python3 -m json.tool
```

httpbin's `/anything` endpoint is particularly useful because it echoes back the full request including the path:

```bash
curl -s http://api.example.com/anything | python3 -m json.tool
```

Check the Envoy route configuration:

```bash
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json | grep -A 3 "prefixRewrite\|regex"
```

## Gotchas

- Path rewriting happens after route matching. The match condition uses the original path, and the rewrite applies to the destination.
- Trailing slashes matter. `/api/users` and `/api/users/` are different paths in Istio.
- Rewrite with prefix match replaces only the matched prefix. `/api/users/123` with prefix `/api` rewritten to `/v2` becomes `/v2/users/123`.
- Redirects and rewrites are mutually exclusive in the same route rule. You cannot have both.

Path modification is one of those fundamental capabilities that makes Istio work as an effective API gateway. Getting the rewrite rules right takes some testing, but once they are in place, they give you complete control over how URLs map to your backend services.
