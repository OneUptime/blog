# How to Add Custom HTTP Filters with EnvoyFilter

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, HTTP Filters, Envoy, Kubernetes, Proxy

Description: Add custom HTTP filters to Envoy proxies in Istio using EnvoyFilter resources including Lua scripting, header manipulation, CORS, compression, and rate limiting.

---

Envoy processes HTTP requests through a chain of filters. Each filter can inspect, modify, or reject requests and responses as they flow through the proxy. Istio configures a default set of HTTP filters, but sometimes you need to add your own. EnvoyFilter lets you insert custom HTTP filters into the chain for specific workloads or across the mesh.

## Understanding the HTTP Filter Chain

When an HTTP request arrives at an Envoy proxy, it passes through filters in a specific order. The default Istio HTTP filter chain looks roughly like this:

1. `envoy.filters.http.cors` - CORS handling
2. `envoy.filters.http.fault` - Fault injection
3. `istio.stats` - Istio statistics
4. `envoy.filters.http.router` - The router (always last)

The router filter is always the last filter in the chain. It is responsible for forwarding the request to the upstream service. Any custom filters you add must be inserted before the router.

## Adding a Lua HTTP Filter

Lua filters are the easiest way to add custom logic without compiling a custom Envoy binary. Here is how to add a Lua filter that modifies request headers:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-request-header
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
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
              function envoy_on_request(request_handle)
                -- Add a timestamp header to every request
                request_handle:headers():add("x-request-timestamp", os.date("!%Y-%m-%dT%H:%M:%SZ"))

                -- Log the request path
                local path = request_handle:headers():get(":path")
                request_handle:logInfo("Request path: " .. path)
              end

              function envoy_on_response(response_handle)
                -- Add server timing header
                response_handle:headers():add("server-timing", "proxy;dur=0")

                -- Remove internal headers before sending to client
                response_handle:headers():remove("x-internal-debug")
              end
```

The `INSERT_BEFORE` operation with `subFilter.name: envoy.filters.http.router` places the Lua filter right before the router, which is typically where you want custom logic.

## Adding Response Header Manipulation

If you just need to add or modify headers without complex logic, you can use the header-to-metadata filter or a simpler Lua script:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: response-headers
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-gateway
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
                -- Security headers
                response_handle:headers():add("X-Content-Type-Options", "nosniff")
                response_handle:headers():add("X-Frame-Options", "DENY")
                response_handle:headers():add("X-XSS-Protection", "1; mode=block")
                response_handle:headers():add("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

                -- Remove server header
                response_handle:headers():remove("server")
              end
```

This adds common security headers to every response from the api-gateway service and removes the server header that could leak implementation details.

## Adding gzip Compression

Enable response compression for specific services:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gzip-compression
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
          name: envoy.filters.http.compressor
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.compressor.v3.Compressor
            response_direction_config:
              common_config:
                min_content_length: 1024
                content_type:
                  - text/html
                  - text/plain
                  - text/css
                  - application/javascript
                  - application/json
            compressor_library:
              name: text_optimized
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.compression.gzip.compressor.v3.Gzip
                memory_level: 5
                window_bits: 12
                compression_level: DEFAULT_COMPRESSION
                compression_strategy: DEFAULT_STRATEGY
```

This compresses responses larger than 1024 bytes for the specified content types. It is placed before the router so it compresses responses before they are sent back to the client.

## Adding CORS Configuration

While Istio supports basic CORS through VirtualService, EnvoyFilter gives you more fine-grained control:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: cors-policy
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
          name: envoy.filters.http.cors
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors
    - applyTo: VIRTUAL_HOST
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          typed_per_filter_config:
            envoy.filters.http.cors:
              "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.CorsPolicy
              allow_origin_string_match:
                - safe_regex:
                    regex: "https://.*\\.example\\.com"
              allow_methods: "GET, POST, PUT, DELETE, OPTIONS"
              allow_headers: "content-type, authorization, x-request-id"
              expose_headers: "x-custom-header"
              max_age: "86400"
              allow_credentials: true
```

## Adding a Local Rate Limit

Envoy has a local rate limiting filter that can limit requests per second without an external rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-rate-limit
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
          name: envoy.filters.http.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 100
              tokens_per_fill: 100
              fill_interval: 60s
            filter_enabled:
              runtime_key: local_rate_limit_enabled
              default_value:
                numerator: 100
                denominator: HUNDRED
            filter_enforced:
              runtime_key: local_rate_limit_enforced
              default_value:
                numerator: 100
                denominator: HUNDRED
            response_headers_to_add:
              - append_action: OVERWRITE_IF_EXISTS_OR_ADD
                header:
                  key: x-rate-limit
                  value: "100"
```

This limits each pod to 100 requests per 60 seconds. Since this is a local rate limit, each pod enforces its own limit independently. If you have 5 pods, the effective rate limit is 500 requests per 60 seconds across all pods.

## Adding a Filter to the Gateway

To add an HTTP filter to the ingress gateway instead of sidecars, change the workloadSelector and match context:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-security-headers
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
                response_handle:headers():add("X-Content-Type-Options", "nosniff")
                response_handle:headers():add("X-Frame-Options", "SAMEORIGIN")
              end
```

Note the `context: GATEWAY` and the namespace being `istio-system` (where the gateway runs).

## Filter Ordering

The order of HTTP filters matters. Some filters depend on others being run first. When inserting multiple custom filters, use specific ordering operations:

```yaml
configPatches:
  # First, add the rate limit filter
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
        name: envoy.filters.http.local_ratelimit
        typed_config:
          # ... rate limit config

  # Then, add the Lua filter before the rate limit
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.local_ratelimit
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          # ... Lua config
```

This results in the order: Lua -> Rate Limit -> Router.

## Verifying Filter Installation

After applying an EnvoyFilter, verify it was installed correctly:

```bash
# Check the HTTP filter chain
istioctl proxy-config listeners deploy/my-app -n default -o json | \
  jq '.[].filterChains[].filters[] | select(.name=="envoy.filters.network.http_connection_manager") | .typedConfig.httpFilters[].name'
```

You should see your custom filter name in the list, in the correct position relative to the router.

## Lua Filter Limitations

A few things to keep in mind about Lua filters:

- Lua filters run synchronously and block the request. Keep them fast.
- You cannot make external HTTP calls from Lua filters (use the ext_authz filter for that).
- Lua in Envoy uses LuaJIT, which has a slightly different standard library than standard Lua.
- Errors in Lua code can crash the filter chain, so test thoroughly.

## Summary

Custom HTTP filters in Istio let you add logic that the standard APIs do not support. Use Lua filters for simple header manipulation and custom logic, the compressor filter for response compression, the local rate limit filter for per-pod rate limiting, and the CORS filter for detailed CORS configuration. Always use INSERT_BEFORE with the router filter as the anchor point, scope your filters with workloadSelector, and verify installation with istioctl proxy-config. Keep custom filters minimal and document why the standard Istio APIs were insufficient.
