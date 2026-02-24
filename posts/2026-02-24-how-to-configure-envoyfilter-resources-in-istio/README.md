# How to Configure EnvoyFilter Resources in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Envoy, Configuration, Service Mesh

Description: How to use EnvoyFilter resources in Istio for advanced proxy customization that goes beyond standard Istio APIs.

---

EnvoyFilter is Istio's escape hatch. When the standard Istio APIs (VirtualService, DestinationRule, AuthorizationPolicy) cannot express what you need, EnvoyFilter lets you directly patch the Envoy proxy configuration. It is powerful, flexible, and also the easiest way to break your mesh if you are not careful.

This guide covers how to use EnvoyFilter resources safely and effectively.

## When to Use EnvoyFilter

You should reach for EnvoyFilter only when the higher-level Istio APIs do not cover your use case. Common scenarios include:

- Adding custom HTTP response headers that Istio APIs do not support
- Configuring Envoy features that Istio does not expose (like compression, CORS fine-tuning, or custom load balancing)
- Adding Lua filters for lightweight request/response transformation
- Modifying bootstrap configuration
- Integrating with Envoy features that are not yet supported by Istio

If you can accomplish something with VirtualService, DestinationRule, or the Telemetry API, prefer those. They are stable, well-tested, and upgrade-safe. EnvoyFilter patches can break when you upgrade Istio if the underlying Envoy configuration structure changes.

## EnvoyFilter Structure

An EnvoyFilter resource has two main parts: a match condition and a patch. The match condition selects which part of the Envoy configuration to modify, and the patch describes what to do.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: example-filter
  namespace: production
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
    - applyTo: <TARGET>
      match:
        context: <CONTEXT>
        <match_conditions>
      patch:
        operation: <OPERATION>
        value:
          <envoy_config>
```

## Apply Targets

The `applyTo` field specifies what part of the Envoy configuration you are patching:

- **CLUSTER** - Upstream cluster configuration
- **LISTENER** - Listener configuration
- **FILTER_CHAIN** - Filter chain within a listener
- **NETWORK_FILTER** - Network-level filter
- **HTTP_FILTER** - HTTP-level filter
- **ROUTE_CONFIGURATION** - Route configuration
- **VIRTUAL_HOST** - Virtual host within a route configuration
- **HTTP_ROUTE** - HTTP route entry
- **BOOTSTRAP** - Bootstrap configuration
- **EXTENSION_CONFIG** - Extension configuration

## Context Types

The `context` field in the match condition specifies which proxy context to apply to:

- **SIDECAR_INBOUND** - Inbound traffic to the sidecar
- **SIDECAR_OUTBOUND** - Outbound traffic from the sidecar
- **GATEWAY** - Traffic at an Istio gateway
- **ANY** - All contexts

## Practical Examples

### Adding Custom Response Headers

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-response-headers
  namespace: production
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
            inline_code: |
              function envoy_on_response(response_handle)
                response_handle:headers():add("x-served-by", "istio-mesh")
                response_handle:headers():add("x-frame-options", "DENY")
              end
```

### Enabling gzip Compression

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: enable-compression
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
                  - "text/html"
                  - "application/json"
                  - "text/plain"
            compressor_library:
              name: text_optimized
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.compression.gzip.compressor.v3.Gzip
                memory_level: 5
                compression_level: BEST_SPEED
```

### Modifying Connection Timeouts

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-timeouts
  namespace: production
spec:
  workloadSelector:
    labels:
      app: slow-backend
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: slow-backend.production.svc.cluster.local
      patch:
        operation: MERGE
        value:
          connect_timeout: 10s
          per_connection_buffer_limit_bytes: 32768
```

### Adding Rate Limiting Headers

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-headers
  namespace: production
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
            inline_code: |
              function envoy_on_response(response_handle)
                local limit = response_handle:headers():get("x-ratelimit-limit")
                if limit then
                  response_handle:headers():add("retry-after", "60")
                end
              end
```

### Modifying Bootstrap Configuration

Bootstrap patches apply when the proxy starts and cannot be changed at runtime:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: bootstrap-overrides
  namespace: istio-system
spec:
  configPatches:
    - applyTo: BOOTSTRAP
      patch:
        operation: MERGE
        value:
          overload_manager:
            refresh_interval: 0.25s
            resource_monitors:
              - name: envoy.resource_monitors.global_downstream_max_connections
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.resource_monitors.downstream_connections.v3.DownstreamConnectionsConfig
                  max_active_downstream_connections: 50000
```

## Patch Operations

The available patch operations:

- **MERGE** - Deep merge the patch value with the existing config
- **ADD** - Add the value to a list
- **REMOVE** - Remove the matched config
- **INSERT_BEFORE** - Insert a filter before the matched filter
- **INSERT_AFTER** - Insert a filter after the matched filter
- **INSERT_FIRST** - Insert a filter at the beginning of the filter chain
- **REPLACE** - Replace the matched config entirely

## Debugging EnvoyFilter Issues

EnvoyFilter problems are notoriously hard to debug. Here is a systematic approach:

```bash
# Check if the filter was applied
istioctl proxy-config listener deploy/my-service -o json | python3 -m json.tool | grep "my-filter-name"

# Dump the full Envoy config
istioctl proxy-config all deploy/my-service -o json > envoy-config.json

# Check for configuration errors
istioctl analyze -n production

# Look at proxy logs for config rejection
kubectl logs deploy/my-service -c istio-proxy | grep -i "error\|reject\|invalid"

# Compare expected vs actual config
istioctl proxy-config listener deploy/my-service -o json | jq '.[] | select(.name=="0.0.0.0_8080")'
```

## Safety Guidelines

1. **Always use `workloadSelector`** when possible. Mesh-wide EnvoyFilter resources in `istio-system` are risky
2. **Test in a non-production namespace first**
3. **Pin to specific Envoy config versions** - When Istio upgrades, the underlying Envoy config structure can change
4. **Document your EnvoyFilter resources** - Future you will not remember why a specific patch exists
5. **Monitor proxy config rejection** - Envoy silently ignores invalid config patches
6. **Use `istioctl proxy-config`** to verify the patch was applied correctly

EnvoyFilter is the tool you use when nothing else works. Use it sparingly, test it thoroughly, and document it well. Your future self will thank you during the next Istio upgrade.
