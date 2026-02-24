# How to Configure API Response Transformation with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Gateway, EnvoyFilter, Response Transformation, Service Mesh

Description: Learn how to transform API responses using Istio EnvoyFilter and Lua scripting to modify headers, body content, and status codes at the mesh level.

---

When you run a service mesh, there are plenty of situations where you need to tweak the response coming back from your services before it reaches the client. Maybe you need to strip internal headers, add CORS headers uniformly, or reshape JSON payloads. Istio gives you the tools to do this at the proxy layer without touching your application code.

## Why Transform Responses at the Mesh Level?

The typical approach is to handle response transformation inside each microservice. That works fine when you have two or three services. Once you hit twenty or thirty, maintaining consistent response formats across all of them becomes a real headache. By pushing this logic into the Istio sidecar proxies, you get a single place to manage transformations.

Some common use cases:

- Stripping internal debugging headers before responses leave the cluster
- Adding security headers like `X-Content-Type-Options` or `Strict-Transport-Security`
- Transforming response bodies for API versioning
- Injecting correlation IDs into response headers

## Using EnvoyFilter for Response Header Manipulation

The most straightforward way to transform responses in Istio is through EnvoyFilter resources. These let you hook into the Envoy proxy configuration directly.

Here is an example that adds security headers to all responses:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-security-headers
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
              response_handle:headers():add("X-Content-Type-Options", "nosniff")
              response_handle:headers():add("X-Frame-Options", "DENY")
              response_handle:headers():add("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
            end
```

This EnvoyFilter targets all sidecar inbound listeners in the mesh and runs a Lua script on every response. The script adds three security headers that your services no longer need to worry about.

## Removing Internal Headers

Sometimes your services expose headers meant for internal debugging or routing. You probably do not want those leaking out to external clients.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: strip-internal-headers
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
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
              response_handle:headers():remove("x-internal-debug")
              response_handle:headers():remove("x-backend-server")
              response_handle:headers():remove("x-upstream-latency")
            end
```

Notice the `workloadSelector` field. This applies the filter only to pods labeled `app: my-api` rather than everything in the namespace.

## Transforming Response Bodies with Lua

Header manipulation is simple. Body transformation is trickier because Envoy streams response bodies, so you need to buffer the entire body before you can modify it.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: transform-response-body
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
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
              local content_type = response_handle:headers():get("content-type")
              if content_type and string.find(content_type, "application/json") then
                local body = response_handle:body():getBytes(0, response_handle:body():length())
                local modified = string.gsub(body, '"internal_id":%s*"[^"]*",?', '')
                response_handle:body():setBytes(modified)
              end
            end
```

This strips any `internal_id` field from JSON responses. Keep in mind that Lua string manipulation on JSON is fragile. For more sophisticated body transformations, consider using a Wasm filter instead.

## Using VirtualService for Simple Header Operations

If you just need to add or set response headers, VirtualService has built-in support without needing EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1networking
kind: VirtualService
metadata:
  name: my-api-vs
  namespace: default
spec:
  hosts:
  - my-api
  http:
  - route:
    - destination:
        host: my-api
        port:
          number: 8080
      headers:
        response:
          set:
            x-api-version: "v2"
            x-served-by: "istio-mesh"
          remove:
          - x-powered-by
          - server
```

The `headers.response` section in VirtualService lets you set, add, or remove response headers. This is cleaner than EnvoyFilter for basic header operations.

## Wasm Filters for Advanced Transformations

When Lua gets too limiting, WebAssembly (Wasm) filters give you full programming language support. You can write your filter in Go, Rust, or C++ and compile it to Wasm.

Here is how you reference a Wasm filter in an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: wasm-response-transform
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
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
        name: envoy.filters.http.wasm
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
          value:
            config:
              name: response-transformer
              vm_config:
                runtime: envoy.wasm.runtime.v8
                code:
                  local:
                    filename: /var/local/wasm/response-transform.wasm
```

You would mount the Wasm binary into the sidecar container using a ConfigMap or an init container.

## Targeting Specific Routes

You do not always want to transform every response. Combining EnvoyFilter with route-level matching lets you be selective:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: selective-transform
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
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
              local path = response_handle:headers():get(":path")
              if path and string.find(path, "^/api/v1/") then
                response_handle:headers():add("X-API-Deprecated", "true")
                response_handle:headers():add("X-API-Sunset-Date", "2026-06-01")
              end
            end
```

This only adds deprecation headers to responses from `/api/v1/` endpoints.

## Debugging Response Transformations

When things go wrong, check the Envoy access logs and the config dump:

```bash
# Check if the EnvoyFilter was applied
istioctl proxy-config listener <pod-name> -o json | grep -A 20 "lua"

# Watch the proxy logs for Lua errors
kubectl logs <pod-name> -c istio-proxy -f

# Dump the full Envoy config to verify filter placement
istioctl proxy-config all <pod-name> -o json > envoy-config.json
```

## Performance Considerations

Body transformations come with a cost. Buffering the entire response body increases memory usage and adds latency. For high-throughput services, stick with header-only transformations when possible. If you must transform bodies, set appropriate buffer limits and monitor your sidecar memory usage.

Response transformation at the mesh level is a powerful pattern. Start with VirtualService header operations for simple cases, move to EnvoyFilter with Lua for moderate complexity, and reach for Wasm when you need full-blown transformation logic. The key is keeping your transformation logic as close to the edge as possible while avoiding unnecessary body buffering.
