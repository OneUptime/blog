# How to Write Custom EnvoyFilter Resources in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Envoy, Kubernetes, Service Mesh, Proxy Configuration

Description: Learn how to write EnvoyFilter resources in Istio to customize Envoy proxy behavior including filter patching, listener modifications, and cluster configuration changes.

---

EnvoyFilter is the escape hatch of Istio. When the standard Istio APIs (VirtualService, DestinationRule, etc.) do not support what you need, EnvoyFilter lets you directly modify the Envoy proxy configuration. It is powerful, but it is also the easiest way to break your mesh if you are not careful. This post covers the fundamentals of writing EnvoyFilter resources correctly.

## When to Use EnvoyFilter

You should only reach for EnvoyFilter when the standard Istio APIs cannot do what you need. Common use cases include:

- Adding custom HTTP headers that VirtualService does not support
- Configuring rate limiting with Envoy's built-in rate limiter
- Adding custom Lua scripting for request/response manipulation
- Modifying Envoy listener settings not exposed through Istio
- Adding compression or decompression filters
- Customizing access log format

If you can accomplish something with a VirtualService or DestinationRule, use those instead. EnvoyFilter is harder to maintain and more likely to break during Istio upgrades.

## EnvoyFilter Structure

Every EnvoyFilter has three main parts:

1. **workloadSelector**: Which proxies to apply the filter to
2. **configPatches**: What to change in the Envoy configuration
3. Each patch has an **applyTo** target, a **match** condition, and a **patch** operation

Here is the basic structure:

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
        <match-conditions>
      patch:
        operation: <OPERATION>
        value:
          <envoy-config>
```

## Understanding applyTo Targets

The `applyTo` field tells Istio which part of the Envoy configuration to modify:

- `LISTENER`: Modify listener-level settings
- `FILTER_CHAIN`: Modify filter chains within listeners
- `NETWORK_FILTER`: Modify network-level filters (e.g., TCP proxy, HTTP connection manager)
- `HTTP_FILTER`: Modify HTTP filters within the HTTP connection manager
- `ROUTE_CONFIGURATION`: Modify route configuration
- `VIRTUAL_HOST`: Modify virtual hosts within route configuration
- `HTTP_ROUTE`: Modify individual HTTP routes
- `CLUSTER`: Modify upstream cluster settings
- `EXTENSION_CONFIG`: Modify extension configurations

## Understanding match Context

The `context` field in the match section specifies which proxy to target:

- `SIDECAR_INBOUND`: The inbound listener of sidecar proxies (traffic coming into the pod)
- `SIDECAR_OUTBOUND`: The outbound listener of sidecar proxies (traffic going out of the pod)
- `GATEWAY`: Ingress or egress gateway proxies
- `ANY`: All proxies

## Understanding Patch Operations

The `operation` field specifies what to do:

- `ADD`: Add a new element (filter, cluster, etc.)
- `REMOVE`: Remove an existing element
- `INSERT_BEFORE`: Insert before a matched element
- `INSERT_AFTER`: Insert after a matched element
- `INSERT_FIRST`: Insert at the beginning of a list
- `REPLACE`: Replace an existing element
- `MERGE`: Merge with an existing element (for struct-like configs)

## Example: Adding a Custom Response Header

A simple example to start with. This adds a custom header to all responses from a specific service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-response-header
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
              function envoy_on_response(response_handle)
                response_handle:headers():add("x-served-by", "my-app")
              end
```

This inserts a Lua filter before the router filter on the inbound listener. The Lua script adds an `x-served-by` header to every response.

## Example: Modifying Access Log Format

Customize the access log format to include additional information:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-access-log
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
                      status: "%RESPONSE_CODE%"
                      duration: "%DURATION%"
                      upstream_host: "%UPSTREAM_HOST%"
                      request_id: "%REQ(X-REQUEST-ID)%"
```

## Example: Setting Connection Timeout on a Listener

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
              idle_timeout: 3600s
            stream_idle_timeout: 300s
```

## Scoping EnvoyFilters

EnvoyFilter scope matters a lot. An EnvoyFilter without a `workloadSelector` in the `istio-system` namespace applies to every proxy in the mesh. This is almost always a bad idea.

**Best practice: always use workloadSelector**:

```yaml
spec:
  workloadSelector:
    labels:
      app: my-app
```

If you need to apply an EnvoyFilter to the ingress gateway:

```yaml
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
```

If you absolutely need a mesh-wide EnvoyFilter, apply it in `istio-system` with extreme caution and thorough testing.

## Debugging EnvoyFilter

When your EnvoyFilter is not working as expected, use these debugging steps:

### Verify the Filter Was Applied

```bash
# Check the Envoy configuration dump
istioctl proxy-config all deploy/my-app -n default -o json > /tmp/envoy-config.json

# Search for your filter name
grep -l "my-filter-name" /tmp/envoy-config.json
```

### Check for Errors

```bash
# Check istiod logs for EnvoyFilter errors
kubectl logs deploy/istiod -n istio-system | grep "EnvoyFilter"

# Check the proxy sync status
istioctl proxy-status
```

### Check Envoy Admin

```bash
# View the active configuration
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET config_dump
```

This dumps the complete Envoy configuration. Search for your filter or patch to verify it was applied correctly.

## Common Mistakes

**Wrong @type URL**: The `typed_config` `@type` field must exactly match the Envoy proto type. Getting this wrong means your filter is silently ignored.

**Wrong filter name**: Envoy filter names are specific. Use `envoy.filters.http.router`, not `router` or `http_router`.

**Incorrect match context**: Applying an inbound filter patch with `SIDECAR_OUTBOUND` context means it never matches.

**Missing workloadSelector**: Without it, the filter applies to all proxies in the namespace (or mesh-wide if in istio-system).

**Patch priority**: EnvoyFilter patches are applied in order of creation timestamp, then by namespace priority (istio-system first). Be aware of ordering issues.

## EnvoyFilter and Istio Upgrades

EnvoyFilter resources directly reference Envoy internal APIs, which can change between Envoy versions. When Istio upgrades its bundled Envoy version, your EnvoyFilters may break.

To minimize upgrade risk:

1. Keep an inventory of all EnvoyFilters in your mesh
2. Before upgrading Istio, review the Envoy changelog for breaking changes
3. Test all EnvoyFilters in staging before upgrading production
4. Consider replacing EnvoyFilters with standard Istio APIs when new features make them available

```bash
# List all EnvoyFilters
kubectl get envoyfilters -A
```

## Summary

EnvoyFilter is a powerful tool for customizing Envoy proxy behavior beyond what standard Istio APIs support. Always scope your filters with workloadSelector, use the correct applyTo target and match context, and verify the patch was applied using istioctl proxy-config. Keep EnvoyFilter usage minimal because they create a maintenance burden during Istio upgrades. When you do use them, document why the standard APIs were not sufficient and check for standard API alternatives with each Istio upgrade.
