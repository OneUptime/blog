# How to Transform Response Headers with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Headers, Response Transformation, VirtualService, Security Headers

Description: How to modify, add, and remove HTTP response headers using Istio VirtualService and EnvoyFilter for security and operational needs.

---

Response header transformation is something you will eventually need in any service mesh setup. Whether you are adding security headers like `Strict-Transport-Security`, removing server fingerprinting headers, or injecting debugging information, Istio makes it possible to handle all of this at the mesh level instead of changing every single backend service.

## VirtualService Response Headers

The most straightforward approach uses the `headers.response` field in a VirtualService route:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            port:
              number: 8080
          headers:
            response:
              add:
                x-served-by: "istio-mesh"
              set:
                x-frame-options: "DENY"
                x-content-type-options: "nosniff"
                strict-transport-security: "max-age=31536000; includeSubDomains"
              remove:
                - server
                - x-powered-by
```

Just like with request headers, `add` appends and `set` replaces. The `remove` field strips headers from the response before it is sent back to the client.

## Adding Security Headers Globally

One of the most practical uses is injecting security headers at the gateway level so every response gets them, regardless of what the backend does:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: secure-gateway-routes
spec:
  hosts:
    - "*.example.com"
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            host: frontend
            port:
              number: 80
          headers:
            response:
              set:
                strict-transport-security: "max-age=63072000; includeSubDomains; preload"
                x-content-type-options: "nosniff"
                x-frame-options: "SAMEORIGIN"
                referrer-policy: "strict-origin-when-cross-origin"
                permissions-policy: "camera=(), microphone=(), geolocation=()"
                content-security-policy: "default-src 'self'"
              remove:
                - server
                - x-powered-by
                - x-aspnet-version
```

This is a huge win for security compliance because you define these headers once and they apply everywhere. No need to update every microservice.

## Using EnvoyFilter for All Routes

If you want response header changes to apply across all services in the mesh, not just specific VirtualService routes, use an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-response-headers
  namespace: istio-system
spec:
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
            inlineCode: |
              function envoy_on_response(response_handle)
                response_handle:headers():add("x-mesh-processed", "true")
                response_handle:headers():remove("server")
                response_handle:headers():remove("x-powered-by")
              end
```

For the ingress gateway specifically:

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
            inlineCode: |
              function envoy_on_response(response_handle)
                response_handle:headers():add("strict-transport-security", "max-age=31536000")
                response_handle:headers():remove("server")
              end
```

## Conditional Response Header Transformation

Sometimes you only want to modify response headers based on certain conditions. With EnvoyFilter and Lua, you can check the response status code and act accordingly:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: conditional-response-headers
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-service
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
            inlineCode: |
              function envoy_on_response(response_handle)
                local status = response_handle:headers():get(":status")
                if status == "200" then
                  response_handle:headers():add("x-cache-control", "public, max-age=3600")
                elseif status == "500" then
                  response_handle:headers():add("x-error-tracking", "enabled")
                  response_handle:headers():remove("x-debug-info")
                end
              end
```

## Removing Server Fingerprinting Headers

A very common security requirement is removing headers that reveal information about your infrastructure:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - route:
        - destination:
            host: api-service
            port:
              number: 8080
          headers:
            response:
              remove:
                - server
                - x-powered-by
                - x-aspnet-version
                - x-runtime
                - x-version
                - x-generator
```

This prevents attackers from easily identifying what technology stack your services run on.

## Adding Cache Control Headers

Response header transformation is useful for adding caching directives at the mesh level:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: static-assets
spec:
  hosts:
    - cdn.example.com
  gateways:
    - main-gateway
  http:
    - match:
        - uri:
            regex: ".*\\.(js|css|png|jpg|svg|woff2)$"
      route:
        - destination:
            host: static-service
            port:
              number: 80
          headers:
            response:
              set:
                cache-control: "public, max-age=31536000, immutable"
    - route:
        - destination:
            host: static-service
            port:
              number: 80
          headers:
            response:
              set:
                cache-control: "no-cache, no-store, must-revalidate"
```

## Adding Debug Headers in Non-Production

You can use response headers to inject debugging information in staging environments:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: debug-response-headers
  namespace: staging
spec:
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
            inlineCode: |
              function envoy_on_response(response_handle)
                local headers = response_handle:headers()
                headers:add("x-upstream-service", os.getenv("HOSTNAME") or "unknown")
                headers:add("x-response-time-ms", response_handle:streamInfo():dynamicMetadata():get("envoy.lua") or "N/A")
              end
```

## Verifying Response Headers

Test your response header transformations with curl:

```bash
curl -I http://your-service/api/health
```

The `-I` flag shows only the response headers. You can also use verbose mode:

```bash
curl -v http://your-service/api/health 2>&1 | grep "< "
```

Inside the mesh, test from a sidecar-injected pod:

```bash
kubectl exec deploy/sleep -- curl -sI http://my-service:8080/health
```

To inspect the Envoy configuration and confirm headers are configured:

```bash
istioctl proxy-config routes deploy/my-service -o json | grep -A 5 "responseHeadersToAdd"
```

## Important Notes

Response header transformations via VirtualService happen after the upstream service responds but before the response leaves the Envoy proxy. This means the backend never sees these changes. It is purely a proxy-level modification.

If you have both VirtualService and EnvoyFilter response header transformations, the EnvoyFilter runs first (at the Envoy filter chain level), and VirtualService modifications are applied as part of the route configuration. If they try to set the same header, the last one wins.

Keep your response header transformations minimal and purposeful. Every header you add increases response size, and while individual headers are tiny, they add up across millions of requests.
