# How to Use EnvoyFilter for Advanced Proxy Customization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Envoy, Proxy, Kubernetes, Configuration

Description: A hands-on guide to using Istio EnvoyFilter resources for advanced Envoy proxy customization with real examples and best practices.

---

EnvoyFilter is the escape hatch in Istio. When the high-level APIs like VirtualService, DestinationRule, and AuthorizationPolicy do not cover your use case, EnvoyFilter lets you directly manipulate the Envoy proxy configuration. It is powerful, but it comes with risks. You are working at a lower level of abstraction, which means you need to understand how Envoy configuration works.

## When to Use EnvoyFilter

You should reach for EnvoyFilter only when Istio's standard APIs are not enough. Good use cases include:

- Adding custom Envoy filters that Istio does not expose
- Modifying specific Envoy settings that have no Istio equivalent
- Tuning connection pool parameters beyond what DestinationRule supports
- Adding custom access log formats
- Configuring Lua filters for quick request manipulation

If you can accomplish something with VirtualService or DestinationRule, use those instead. They are stable, well-tested, and upgrade-safe. EnvoyFilter patches can break when you upgrade Istio because the underlying Envoy configuration structure might change.

## Basic EnvoyFilter Structure

Every EnvoyFilter has patches that describe what to change and where:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: my-custom-filter
  namespace: istio-system
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
            function envoy_on_request(request_handle)
              request_handle:headers():add("x-custom-header", "hello")
            end
```

The key parts are `applyTo`, `match`, and `patch`. Let us break each one down.

## The applyTo Field

This tells Istio what part of the Envoy configuration you want to modify:

- `LISTENER` - Top-level listener configuration
- `FILTER_CHAIN` - Filter chain within a listener
- `NETWORK_FILTER` - Network-level filters (like TCP proxy)
- `HTTP_FILTER` - HTTP-level filters (like router, CORS, etc.)
- `ROUTE_CONFIGURATION` - Route configuration
- `VIRTUAL_HOST` - Virtual host within a route configuration
- `HTTP_ROUTE` - Individual route within a virtual host
- `CLUSTER` - Upstream cluster configuration
- `EXTENSION_CONFIG` - Extension configuration

## The match Field

The match field narrows down exactly where your patch applies. The `context` is important:

- `SIDECAR_INBOUND` - Applies to inbound traffic on sidecars
- `SIDECAR_OUTBOUND` - Applies to outbound traffic on sidecars
- `GATEWAY` - Applies to gateway proxies
- `ANY` - Applies everywhere

You can further narrow with listener names, port numbers, and route names:

```yaml
match:
  context: SIDECAR_INBOUND
  listener:
    portNumber: 8080
    filterChain:
      filter:
        name: envoy.filters.network.http_connection_manager
```

## Patch Operations

The `operation` field supports:

- `MERGE` - Deep merge with existing configuration
- `ADD` - Add to an existing list
- `REMOVE` - Remove a filter or configuration
- `INSERT_BEFORE` - Insert before a matched filter
- `INSERT_AFTER` - Insert after a matched filter
- `INSERT_FIRST` - Insert at the beginning of the filter chain
- `REPLACE` - Replace the matched configuration entirely

## Example: Custom Access Log Format

A common use case is customizing the access log format to include fields that Istio does not expose:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-access-log
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      app: my-service
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
                  response_code: "%RESPONSE_CODE%"
                  response_flags: "%RESPONSE_FLAGS%"
                  duration: "%DURATION%"
                  upstream_host: "%UPSTREAM_HOST%"
                  request_id: "%REQ(X-REQUEST-ID)%"
                  user_agent: "%REQ(USER-AGENT)%"
```

## Example: Adding Connection Timeout Settings

Sometimes you need to tune connection parameters that Istio does not expose through DestinationRule:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: connection-tuning
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
      cluster:
        service: backend-service.default.svc.cluster.local
    patch:
      operation: MERGE
      value:
        connect_timeout: 5s
        per_connection_buffer_limit_bytes: 32768
```

## Example: Adding a Lua Filter for Request Manipulation

Lua filters are lightweight and useful for simple request/response manipulation without building a full Wasm plugin:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: lua-request-transform
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
          inline_code: |
            function envoy_on_request(request_handle)
              local path = request_handle:headers():get(":path")
              if string.find(path, "^/api/v1/") then
                request_handle:headers():add("x-api-version", "v1")
              end
            end

            function envoy_on_response(response_handle)
              response_handle:headers():add("x-served-by", "istio-mesh")
            end
```

## Example: Configuring Circuit Breaker Thresholds

If you need circuit breaker settings beyond what DestinationRule offers:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: circuit-breaker-tuning
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
      cluster:
        service: upstream-service.default.svc.cluster.local
    patch:
      operation: MERGE
      value:
        circuit_breakers:
          thresholds:
          - priority: DEFAULT
            max_connections: 1000
            max_pending_requests: 500
            max_requests: 2000
            max_retries: 5
```

## Debugging EnvoyFilter Issues

When your EnvoyFilter is not working as expected, here is your debugging toolkit:

Check if the filter is applied to the proxy:

```bash
istioctl proxy-config listener my-service-pod-xyz -n default -o json
```

Dump the full Envoy configuration:

```bash
kubectl exec my-service-pod-xyz -c istio-proxy -- \
  curl -s localhost:15000/config_dump > envoy-config.json
```

Check istiod logs for configuration push errors:

```bash
kubectl logs -l app=istiod -n istio-system | grep "my-custom-filter"
```

Use `istioctl analyze` to catch common issues:

```bash
istioctl analyze -n default
```

## Best Practices

1. **Always use workloadSelector** - Applying EnvoyFilters mesh-wide is dangerous. Scope them to specific workloads.

2. **Document everything** - Future you will not remember why you added that obscure Envoy setting. Add comments and link to relevant documentation.

3. **Test on non-production first** - EnvoyFilter patches can break proxy configuration entirely, which means traffic stops flowing.

4. **Pin to specific Envoy config versions** - Use the `@type` field to be explicit about which Envoy API version you are targeting.

5. **Review after Istio upgrades** - EnvoyFilter patches interact directly with the Envoy configuration structure, which can change between Istio versions.

## Summary

EnvoyFilter is the most powerful and most dangerous tool in the Istio toolkit. It lets you customize virtually any aspect of the Envoy proxy, but at the cost of stability guarantees during upgrades. Use it sparingly, scope it tightly, and always have a plan for testing your filters after Istio version bumps. When you genuinely need it, though, there is nothing else that gives you this level of control over your service mesh data plane.
