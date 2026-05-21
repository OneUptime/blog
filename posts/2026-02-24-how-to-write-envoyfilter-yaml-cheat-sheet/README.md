# How to Write EnvoyFilter YAML (Cheat Sheet)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, YAML, Cheat Sheet, Envoy, Proxy Configuration

Description: Complete cheat sheet for writing Istio EnvoyFilter YAML to customize Envoy proxy behavior with patching and filter insertion.

---

EnvoyFilter is the power tool in Istio's toolbox. It lets you directly modify the Envoy proxy configuration that Istio generates, giving you access to features that are not exposed through higher-level Istio APIs. The tradeoff is that EnvoyFilter is more complex and more fragile than other Istio resources because it patches the raw Envoy configuration.

Use EnvoyFilter when you need something that VirtualService, DestinationRule, or other Istio resources cannot do. Here is a comprehensive YAML reference.

## Basic Structure

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: my-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: <TARGET>
      match:
        context: <CONTEXT>
        <match-criteria>
      patch:
        operation: <OPERATION>
        value: <CONFIG>
```

## Key Concepts

### applyTo Values

| Value | What it targets |
|-------|----------------|
| `LISTENER` | Envoy listener configuration |
| `FILTER_CHAIN` | Filter chain within a listener |
| `NETWORK_FILTER` | Network-level filter (TCP) |
| `HTTP_FILTER` | HTTP-level filter |
| `ROUTE_CONFIGURATION` | Route configuration |
| `VIRTUAL_HOST` | Virtual host within a route |
| `HTTP_ROUTE` | Specific HTTP route |
| `CLUSTER` | Upstream cluster configuration |
| `EXTENSION_CONFIG` | Extension configuration |
| `LISTENER_FILTER` | Listener filter configuration |

### Context Values

| Value | Meaning |
|-------|---------|
| `SIDECAR_INBOUND` | Inbound traffic to a sidecar |
| `SIDECAR_OUTBOUND` | Outbound traffic from a sidecar |
| `GATEWAY` | Traffic at an Istio gateway |
| `ANY` | All contexts |

### Patch Operations

| Operation | Description |
|-----------|-------------|
| `ADD` | Add a new element |
| `REMOVE` | Remove an existing element |
| `MERGE` | Merge with existing configuration |
| `INSERT_BEFORE` | Insert before a specific filter |
| `INSERT_AFTER` | Insert after a specific filter |
| `INSERT_FIRST` | Insert at the beginning |
| `REPLACE` | Replace an existing element |

## Workload Selector

Target specific workloads:

```yaml
spec:
  workloadSelector:
    labels:
      app: my-app
      version: v1
```

No selector means it applies to all workloads in the namespace. Be careful with this.

For mesh-wide filters, place the EnvoyFilter in the Istio config root namespace, often `istio-system`, without a selector.

## Add Custom Response Headers

Add headers to all responses from a service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-response-headers
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
            default_source_code:
              inline_string: |
                function envoy_on_response(response_handle)
                  response_handle:headers():add("x-powered-by", "istio")
                  response_handle:headers():add("x-custom-header", "my-value")
                end
```

## Rate Limiting with Local Rate Limit

Add a local rate limit to a service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-rate-limit
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

## Custom Access Log Format

Change the access log format:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: access-log-format
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
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
            access_log:
              - name: envoy.access_loggers.file
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
                  path: /dev/stdout
                  log_format:
                    json_format:
                      timestamp: "%START_TIME%"
                      method: "%REQ(:METHOD)%"
                      path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
                      protocol: "%PROTOCOL%"
                      status: "%RESPONSE_CODE%"
                      duration: "%DURATION%"
                      upstream: "%UPSTREAM_HOST%"
                      request_id: "%REQ(X-REQUEST-ID)%"
```

## Modify Connection Timeout

Change the idle timeout for connections:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: connection-timeout
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
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
```

## Add CORS at the Listener Level

The CORS filter must be paired with a route or virtual host CORS policy to take effect.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: cors-filter
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
          name: envoy.filters.http.cors
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors
    - applyTo: VIRTUAL_HOST
      match:
        context: SIDECAR_INBOUND
        routeConfiguration:
          vhost:
            name: "inbound|http|8080"
      patch:
        operation: MERGE
        value:
          typed_per_filter_config:
            envoy.filters.http.cors:
              "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.CorsPolicy
              allow_origin_string_match:
                - safe_regex:
                    google_re2: {}
                    regex: ".*"
              allow_methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS"
              allow_headers: "authorization,content-type,x-requested-with"
              expose_headers: "x-request-id"
              max_age: "86400"
```

## Modify Cluster Settings

Change upstream cluster behavior:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: cluster-settings
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: api-server.backend.svc.cluster.local
      patch:
        operation: MERGE
        value:
          connect_timeout: 10s
          dns_refresh_rate: 30s
```

## Gateway-Specific Filters

Apply filters only to the ingress gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-filter
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
            default_source_code:
              inline_string: |
                function envoy_on_request(request_handle)
                  request_handle:headers():add("x-gateway-timestamp", tostring(os.time()))
                end
```

## Enable gzip Compression

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gzip-compression
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
            compressor_library:
              name: text_optimized
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.compression.gzip.compressor.v3.Gzip
                memory_level: 5
                window_bits: 12
                compression_level: DEFAULT
```

## Debugging EnvoyFilter Issues

Check if your filter was applied:

```bash
istioctl proxy-config listener deploy/my-app -n default -o json | grep -A5 "your-filter-name"
```

Check for configuration errors:

```bash
istioctl analyze -n default
```

Look at proxy logs for filter-related errors:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy | grep -i "filter\|error\|warning"
```

## Best Practices

1. Always use `workloadSelector` to target specific workloads. Avoid mesh-wide EnvoyFilters when possible.
2. Test in a staging environment first. EnvoyFilter can break your proxy if the patch is wrong.
3. Pin your filters to specific Istio versions since Envoy filter names and APIs can change between versions.
4. Use `MERGE` operation when possible since it is less brittle than `REPLACE`.
5. Document why each EnvoyFilter exists because they are harder to understand than other Istio resources.

EnvoyFilter is powerful but comes with operational complexity. Use it as a last resort when higher-level Istio APIs cannot do what you need.
