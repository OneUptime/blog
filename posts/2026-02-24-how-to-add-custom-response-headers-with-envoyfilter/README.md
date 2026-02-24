# How to Add Custom Response Headers with EnvoyFilter

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, HTTP Headers, Envoy, Kubernetes

Description: Step-by-step guide to adding custom response headers to your services using EnvoyFilter in Istio for security, debugging, and compliance needs.

---

Adding custom response headers is one of the most common things people do with EnvoyFilter. Whether you need security headers like `Strict-Transport-Security`, debugging headers like request IDs, or custom headers for your application logic, EnvoyFilter gives you full control over the HTTP response before it reaches the client.

## Why Not Use VirtualService?

Istio's VirtualService resource does let you set headers, but it has limitations. VirtualService headers are applied during routing, which means they work well for request headers but can be finicky with response headers in certain configurations. EnvoyFilter operates at a lower level and gives you more predictable behavior, especially for response headers on inbound traffic.

## Adding a Simple Response Header

Here's the most straightforward example. This adds a custom `X-Powered-By` header to all responses from a specific service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-powered-by-header
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
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
          inline_code: |
            function envoy_on_response(response_handle)
              response_handle:headers():add("X-Powered-By", "MyService/2.0")
            end
```

This uses a Lua filter because it's the most flexible way to manipulate response headers. The `envoy_on_response` function runs for every response going through the proxy.

## Adding Security Headers

One of the most practical uses is adding security headers that your application might not set on its own:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: security-headers
  namespace: default
spec:
  workloadSelector:
    labels:
      app: web-frontend
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
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
          inline_code: |
            function envoy_on_response(response_handle)
              response_handle:headers():add("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
              response_handle:headers():add("X-Content-Type-Options", "nosniff")
              response_handle:headers():add("X-Frame-Options", "DENY")
              response_handle:headers():add("X-XSS-Protection", "1; mode=block")
              response_handle:headers():add("Referrer-Policy", "strict-origin-when-cross-origin")
            end
```

This is particularly useful when you have multiple services behind an ingress gateway and want consistent security headers across all of them without modifying each application.

## Removing Headers

Sometimes you want to strip headers from the response. Maybe your backend leaks internal information through headers like `Server` or `X-Powered-By`:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: remove-server-header
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
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
          inline_code: |
            function envoy_on_response(response_handle)
              response_handle:headers():remove("server")
              response_handle:headers():remove("x-powered-by")
              response_handle:headers():remove("x-aspnet-version")
            end
```

## Conditional Headers Based on Response Status

You can add headers conditionally based on the response status code:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: conditional-headers
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
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
          inline_code: |
            function envoy_on_response(response_handle)
              local status = response_handle:headers():get(":status")
              if status == "429" then
                response_handle:headers():add("Retry-After", "60")
              end
              if status >= "500" then
                response_handle:headers():add("X-Error-Support", "https://support.example.com")
              end
            end
```

## Adding Headers at the Gateway Level

If you want headers added at the ingress gateway rather than at the sidecar level, change the context to `GATEWAY`:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-response-headers
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
          inline_code: |
            function envoy_on_response(response_handle)
              response_handle:headers():add("X-Gateway", "istio-ingress")
              response_handle:headers():add("Strict-Transport-Security", "max-age=31536000")
            end
```

## Using the Header Manipulation Filter (No Lua)

If you just need simple static header additions without Lua scripting, you can modify the route configuration directly:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: static-response-headers
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: ROUTE_CONFIGURATION
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        response_headers_to_add:
        - header:
            key: X-Custom-Header
            value: my-value
          append_action: OVERWRITE_IF_EXISTS_OR_ADD
        response_headers_to_remove:
        - server
```

This approach is simpler and doesn't require Lua, but it's limited to static values.

## Debugging Response Headers

To verify your headers are being added correctly:

```bash
curl -v http://my-service.default.svc.cluster.local:8080/
```

The `-v` flag shows you the full response headers. You can also check the Envoy config dump to make sure your filter was applied:

```bash
kubectl exec -it deploy/my-service -c istio-proxy -- pilot-agent request GET config_dump | python3 -m json.tool | grep -A 5 "lua"
```

## Common Mistakes

The most common issue is getting the `match` section wrong. If your filter isn't being applied, double-check:

1. The `context` matches where you want the filter (SIDECAR_INBOUND, SIDECAR_OUTBOUND, or GATEWAY)
2. The `workloadSelector` labels match your target pods
3. The `subFilter` name is correct (it should be `envoy.filters.http.router` for HTTP filters)

Another gotcha is using `add()` vs `replace()` in Lua. The `add()` method appends a new header value even if one exists, while `replace()` overwrites the existing value. If you're seeing duplicate headers, switch from `add()` to `replace()`.

Response header manipulation through EnvoyFilter is one of the most practical features in Istio's arsenal. It lets you enforce consistent headers across your entire mesh without touching application code, which is especially valuable for security compliance and debugging.
