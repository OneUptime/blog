# How to Configure Envoy Filters in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, EnvoyFilter, Configuration, Kubernetes

Description: How to use Istio's EnvoyFilter resource to customize Envoy proxy behavior beyond what standard Istio APIs provide.

---

Istio's VirtualService, DestinationRule, and other resources cover most traffic management needs. But sometimes you need to do something that these high-level APIs do not support. That is where EnvoyFilter comes in. It lets you directly modify the Envoy proxy configuration, giving you access to Envoy's full feature set. It is powerful but also easy to mess up, so use it carefully.

## When to Use EnvoyFilter

Reach for EnvoyFilter when you need to:

- Add custom HTTP response headers globally
- Configure rate limiting with the Envoy rate limit filter
- Add Lua scripting for custom request/response processing
- Enable the PROXY protocol on listeners
- Modify connection timeouts that are not exposed through Istio APIs
- Add compression filters
- Configure custom access log formats

## EnvoyFilter Basics

An EnvoyFilter resource has three main parts:

1. **workloadSelector** - Which proxies to apply the change to
2. **configPatches** - What to change
3. **priority** - Order of application when multiple EnvoyFilters match

Each config patch specifies:
- `applyTo` - Where in the Envoy config to apply the patch (LISTENER, ROUTE_CONFIGURATION, CLUSTER, HTTP_FILTER, etc.)
- `match` - Conditions for when to apply the patch
- `patch` - The actual change (ADD, REMOVE, MERGE, INSERT_BEFORE, INSERT_AFTER, INSERT_FIRST, REPLACE)

## Adding Custom Response Headers

A common use case is adding security headers to all responses:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: security-headers
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
              response_handle:headers():add("X-Frame-Options", "DENY")
              response_handle:headers():add("X-Content-Type-Options", "nosniff")
              response_handle:headers():add("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
              response_handle:headers():add("X-XSS-Protection", "1; mode=block")
            end
```

This inserts a Lua filter before the router filter on all inbound sidecar connections. The Lua script adds security headers to every response.

## Adding Request Headers

Add headers to outgoing requests:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-request-headers
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_OUTBOUND
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
              request_handle:headers():add("x-custom-source", "my-app")
            end
```

## Configuring Connection Timeouts

Modify HTTP connection manager timeouts that are not available through standard Istio APIs:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: idle-timeout
  namespace: istio-system
spec:
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          common_http_protocol_options:
            idle_timeout: 300s
          stream_idle_timeout: 300s
          request_timeout: 60s
```

## Enabling GZIP Compression

Add response compression to reduce bandwidth:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gzip-compression
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
        name: envoy.filters.http.compressor
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.compressor.v3.Compressor
          response_direction_config:
            common_config:
              min_content_length: 1024
              content_type:
              - application/json
              - text/html
              - text/plain
              - application/javascript
              - text/css
          compressor_library:
            name: text_optimized
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.compression.gzip.compressor.v3.Gzip
              memory_level: 5
              window_bits: 12
              compression_level: BEST_SPEED
```

## Rate Limiting with Local Rate Limit Filter

Envoy has a local rate limit filter that does not need an external rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-ratelimit
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
              key: x-local-rate-limit
              value: "true"
```

This limits each sidecar instance to 100 requests per minute.

## Targeting Specific Listeners

You can target specific ports or listener names:

```yaml
match:
  context: SIDECAR_INBOUND
  listener:
    portNumber: 8080
    filterChain:
      filter:
        name: envoy.filters.network.http_connection_manager
```

Or target the gateway:

```yaml
match:
  context: GATEWAY
  listener:
    portNumber: 443
```

## Verifying EnvoyFilter Application

After applying an EnvoyFilter, verify that the change took effect:

```bash
# Check the full Envoy config dump
istioctl proxy-config all <pod-name> -o json > config.json

# Check specific listeners
istioctl proxy-config listeners <pod-name> -o json

# Check for configuration errors
istioctl analyze -n default
```

Look for your filter in the configuration. If it does not appear, the match conditions might not be matching correctly.

## Common Pitfalls

**Wrong context** - Using `SIDECAR_INBOUND` when you meant `SIDECAR_OUTBOUND` or `GATEWAY`. Inbound is traffic coming into the pod, outbound is traffic leaving.

**Filter ordering** - Inserting a filter in the wrong position can break the request pipeline. Use `INSERT_BEFORE envoy.filters.http.router` as a safe default.

**Namespace scope** - An EnvoyFilter in `istio-system` applies to all sidecars in the mesh. In any other namespace, it only applies to sidecars in that namespace.

**Version compatibility** - EnvoyFilter patches reference internal Envoy configuration structures that can change between Istio versions. Always test after upgrades.

```bash
# Check for rejected configurations
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep "update_rejected"
```

EnvoyFilter is the escape hatch for when Istio's standard APIs do not cover your needs. Use it sparingly and always document why a particular EnvoyFilter exists, because they are harder to understand and maintain than standard Istio resources.
