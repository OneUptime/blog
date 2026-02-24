# How to Configure All EnvoyFilter Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, EnvoyFilter, Envoy Proxy, Customization, Kubernetes

Description: Detailed guide to every EnvoyFilter field in Istio including config patches, match conditions, priorities, and common use cases for customizing Envoy behavior.

---

EnvoyFilter is the escape hatch in Istio. When the high-level Istio APIs do not expose the Envoy configuration you need, EnvoyFilter lets you reach into the generated Envoy config and modify it directly. It is powerful but also risky because you are working with Envoy internals that can change between versions. Use it when there is no other option.

## Top-Level Structure

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: my-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
      patch:
        operation: MERGE
        value: {}
  priority: 0
  targetRefs:
    - kind: Gateway
      group: gateway.networking.k8s.io
      name: my-gateway
```

## Workload Selector

```yaml
spec:
  workloadSelector:
    labels:
      app: my-service
      version: v1
```

The `workloadSelector` determines which proxy instances receive this filter. It matches pod labels. If omitted, the EnvoyFilter applies to all proxies in the namespace. An EnvoyFilter in `istio-system` without a selector applies to all proxies in the mesh.

Be very careful with broad selectors. An EnvoyFilter that accidentally breaks Envoy config can take down your entire mesh.

## Target Refs

```yaml
spec:
  targetRefs:
    - kind: Gateway
      group: gateway.networking.k8s.io
      name: my-gateway
```

The `targetRefs` field is an alternative to `workloadSelector` for targeting Kubernetes Gateway API resources. It is mutually exclusive with `workloadSelector`.

## Priority

```yaml
spec:
  priority: 10
```

The `priority` field controls the order in which EnvoyFilters are applied when multiple filters match the same proxy. Lower numbers are applied first. The default is 0. This is important when you have multiple EnvoyFilters that modify the same part of the config.

## Config Patches

The `configPatches` array is where the actual modifications happen. Each patch has three parts: `applyTo`, `match`, and `patch`.

### ApplyTo

The `applyTo` field specifies what part of the Envoy configuration to modify:

- `LISTENER` - the listener configuration
- `FILTER_CHAIN` - filter chains within a listener
- `NETWORK_FILTER` - network-level filters (L4)
- `HTTP_FILTER` - HTTP-level filters (L7)
- `ROUTE_CONFIGURATION` - the route configuration object
- `VIRTUAL_HOST` - virtual hosts within a route configuration
- `HTTP_ROUTE` - individual routes within a virtual host
- `CLUSTER` - upstream cluster configurations
- `EXTENSION_CONFIG` - extension configurations
- `BOOTSTRAP` - the bootstrap configuration (rarely used)
- `LISTENER_FILTER` - listener-level filters

### Match

The `match` block determines which specific Envoy objects get patched.

#### Context

```yaml
match:
  context: SIDECAR_INBOUND
```

The `context` specifies the traffic direction:

- `ANY` - matches all contexts
- `SIDECAR_INBOUND` - inbound traffic to a sidecar
- `SIDECAR_OUTBOUND` - outbound traffic from a sidecar
- `GATEWAY` - traffic through a gateway

#### Listener Match

```yaml
match:
  context: SIDECAR_INBOUND
  listener:
    name: "0.0.0.0_8080"
    portNumber: 8080
    portName: http
    filterChain:
      name: "my-filter-chain"
      sni: "*.example.com"
      transportProtocol: tls
      applicationProtocols:
        - h2
        - http/1.1
      destinationPort: 8080
      filter:
        name: envoy.filters.network.http_connection_manager
        subFilter:
          name: envoy.filters.http.router
```

The listener match narrows down which listener and filter chain to patch. The `filterChain` sub-block matches specific filter chains within the listener. The `filter` and `subFilter` fields locate specific filters within the chain.

#### Route Configuration Match

```yaml
match:
  context: SIDECAR_OUTBOUND
  routeConfiguration:
    portNumber: 8080
    portName: http
    gateway: my-gateway
    name: "8080"
    vhost:
      name: "my-service.default.svc.cluster.local:8080"
      route:
        name: default
        action: ANY
```

The `vhost.route.action` can be `ANY`, `ROUTE`, `REDIRECT`, or `DIRECT_RESPONSE`.

#### Cluster Match

```yaml
match:
  context: SIDECAR_OUTBOUND
  cluster:
    name: "outbound|8080|v1|my-service.default.svc.cluster.local"
    service: "my-service.default.svc.cluster.local"
    subset: v1
    portNumber: 8080
```

### Patch Operations

The `patch` block specifies what to do:

#### MERGE

```yaml
patch:
  operation: MERGE
  value:
    connect_timeout: 5s
```

MERGE deep-merges the provided value with the existing config. This is the safest operation because it only modifies specified fields.

#### ADD

```yaml
patch:
  operation: ADD
  value:
    name: envoy.filters.http.cors
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors
```

ADD inserts a new element. For filters, it adds to the end of the filter chain by default.

#### INSERT_BEFORE

```yaml
patch:
  operation: INSERT_BEFORE
  value:
    name: envoy.filters.http.lua
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
      inline_code: |
        function envoy_on_request(handle)
          handle:logInfo("Request received")
        end
```

INSERT_BEFORE adds the element before the matched filter. This is important for HTTP filters where order matters.

#### INSERT_AFTER

Same as INSERT_BEFORE but adds after the matched filter.

#### INSERT_FIRST

Adds the element as the first in the list.

#### REMOVE

```yaml
patch:
  operation: REMOVE
```

REMOVE deletes the matched element entirely. No `value` is needed.

#### REPLACE

```yaml
patch:
  operation: REPLACE
  value:
    name: envoy.filters.http.router
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
      suppress_envoy_headers: true
```

REPLACE swaps the matched element with the provided value.

## Common Use Cases

### Add Custom Lua Filter

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-lua-filter
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
              function envoy_on_request(handle)
                handle:headers():add("x-request-timestamp", os.clock())
              end
```

### Modify Cluster Settings

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: cluster-circuit-breaker
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
          service: backend.default.svc.cluster.local
      patch:
        operation: MERGE
        value:
          circuit_breakers:
            thresholds:
              - max_connections: 1000
                max_pending_requests: 1000
                max_requests: 1000
                max_retries: 10
```

### Add Custom Response Header

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-response-headers
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
                key: x-envoy-decorator-operation
                value: "custom-operation"
              append: false
```

### Modify Listener Timeout

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: listener-timeout
  namespace: default
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
            request_timeout: 300s
            stream_idle_timeout: 300s
```

## Debugging EnvoyFilter

To verify your EnvoyFilter is applied:

```bash
# Check the effective Envoy config
istioctl proxy-config listeners <pod-name> -n <namespace> -o json

# Check clusters
istioctl proxy-config clusters <pod-name> -n <namespace> -o json

# Check routes
istioctl proxy-config routes <pod-name> -n <namespace> -o json
```

EnvoyFilter is the most flexible Istio resource but also the most dangerous. Always test in a non-production environment first, be specific with your match conditions, and keep patches as small as possible. When Istio upgrades, review your EnvoyFilters to make sure they still work with the new Envoy version.
