# How to Use Istio EnvoyFilter for Advanced Proxy Customization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Envoy Proxy, Service Mesh, Kubernetes, Advanced Configuration

Description: Master Istio EnvoyFilter to customize Envoy proxy behavior beyond standard Istio APIs for specialized networking requirements.

---

EnvoyFilter is Istio's escape hatch for advanced proxy customization. While Istio's high-level APIs handle most use cases, EnvoyFilter lets you directly modify the underlying Envoy configuration. This power comes with responsibility - incorrect filters can break your mesh entirely.

## When to Use EnvoyFilter

Use EnvoyFilter sparingly. Istio's standard resources like VirtualService, DestinationRule, and PeerAuthentication cover most needs. Reserve EnvoyFilter for scenarios where Istio lacks native support.

Common legitimate use cases include adding custom Envoy extensions, modifying HTTP headers in ways VirtualService cannot, implementing custom authentication schemes, or enabling specific Envoy features not exposed through Istio APIs.

The tradeoff is complexity and maintenance burden. EnvoyFilters are tightly coupled to Envoy's configuration structure. Envoy version upgrades may break your filters, requiring updates. Always test thoroughly before production deployment.

## Understanding EnvoyFilter Structure

An EnvoyFilter targets specific workloads and modifies their Envoy configuration at designated extension points. The structure has three key parts: workload selector, configuration match criteria, and the patch to apply.

Here is a basic example that adds a custom HTTP header to all requests:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-header
  namespace: default
spec:
  workloadSelector:
    labels:
      app: myapp
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
        name: envoy.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              request_handle:headers():add("x-custom-source", "my-service")
            end
```

The workloadSelector targets pods with `app: myapp`. The configPatch inserts a Lua filter before the router filter in the HTTP connection manager. The Lua script adds a header to every outbound request.

## Implementing Rate Limiting with EnvoyFilter

Let's implement per-route rate limiting, something Istio does not natively support. First, deploy a rate limit service. Envoy delegates rate limit decisions to this external service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-filter
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      app: istio-ingressgateway
  configPatches:
  # Add the rate limit service cluster
  - applyTo: CLUSTER
    patch:
      operation: ADD
      value:
        name: rate_limit_cluster
        type: STRICT_DNS
        connect_timeout: 1s
        lb_policy: ROUND_ROBIN
        protocol_selection: USE_CONFIGURED_PROTOCOL
        http2_protocol_options: {}
        load_assignment:
          cluster_name: rate_limit_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit.default.svc.cluster.local
                    port_value: 8081
  # Configure the rate limit filter
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
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: production-api
          failure_mode_deny: false
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
```

This configuration adds a rate limit filter to your ingress gateway. The filter consults the rate limit service before allowing requests through. Set `failure_mode_deny` to false during initial rollout - if the rate limit service is unavailable, requests proceed normally.

## Custom Authentication with External Authorization

External authorization lets you delegate authentication and authorization to a custom service. This is useful for complex auth logic that does not fit standard JWT validation:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ext-authz
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
        name: envoy.filters.http.ext_authz
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
          grpc_service:
            envoy_grpc:
              cluster_name: ext-authz
            timeout: 0.5s
          failure_mode_allow: false
          transport_api_version: V3
          with_request_body:
            max_request_bytes: 8192
            allow_partial_message: true
  - applyTo: CLUSTER
    patch:
      operation: ADD
      value:
        name: ext-authz
        type: STRICT_DNS
        connect_timeout: 1s
        lb_policy: ROUND_ROBIN
        http2_protocol_options: {}
        load_assignment:
          cluster_name: ext-authz
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: authz-service.auth.svc.cluster.local
                    port_value: 9000
```

The external authorization service receives each request and returns allow or deny. You can include request body content for policy decisions based on POST data. The timeout of 0.5 seconds prevents slow auth checks from impacting latency too much.

## Modifying TLS Configuration

Sometimes you need to adjust TLS settings beyond what Istio's PeerAuthentication allows. For example, enabling specific cipher suites:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tls-config
  namespace: default
spec:
  workloadSelector:
    labels:
      app: secure-app
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
            headers_with_underscores_action: REJECT_REQUEST
  - applyTo: FILTER_CHAIN
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        transport_socket:
          name: envoy.transport_sockets.tls
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
            common_tls_context:
              tls_params:
                tls_minimum_protocol_version: TLSv1_3
                cipher_suites:
                - ECDHE-ECDSA-AES128-GCM-SHA256
                - ECDHE-RSA-AES128-GCM-SHA256
```

This configuration enforces TLS 1.3 and restricts cipher suites to specific algorithms. Use this when compliance requirements mandate particular cryptographic settings.

## Adding Custom Metrics

Envoy can expose custom metrics based on request attributes. Add metrics that track business-specific dimensions:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-metrics
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-gateway
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
        name: envoy.filters.http.wasm
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: envoy.extensions.filters.http.wasm.v3.Wasm
          value:
            config:
              vm_config:
                runtime: envoy.wasm.runtime.null
                code:
                  local:
                    inline_string: "stats"
              configuration:
                "@type": type.googleapis.com/google.protobuf.StringValue
                value: |
                  {
                    "metrics": [
                      {
                        "name": "api_version",
                        "type": "counter",
                        "dimensions": {
                          "version": "request.headers['x-api-version']"
                        }
                      }
                    ]
                  }
```

This creates a counter metric that tracks API versions based on request headers. You can then query these metrics from Prometheus to understand version distribution across clients.

## Request/Response Transformation

Use Lua scripting for complex request and response transformations:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: request-transform
  namespace: default
spec:
  workloadSelector:
    labels:
      version: v2
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
        name: envoy.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              local path = request_handle:headers():get(":path")
              -- Transform legacy API paths to new format
              if string.match(path, "^/api/v1/") then
                local new_path = string.gsub(path, "^/api/v1/", "/api/v2/")
                request_handle:headers():replace(":path", new_path)
              end
            end

            function envoy_on_response(response_handle)
              -- Add deprecation warning for old API versions
              local path = response_handle:headers():get(":path")
              if string.match(path, "^/api/v1/") then
                response_handle:headers():add("X-API-Deprecated", "true")
              end
            end
```

This filter transparently migrates old API paths to new versions while adding deprecation warnings. Clients continue working while you phase out legacy endpoints.

## Debugging EnvoyFilter Configuration

When EnvoyFilters do not work as expected, enable Envoy's admin interface to inspect the generated configuration:

```bash
# Port forward to a pod's Envoy admin interface
kubectl port-forward pod/myapp-abc123 15000:15000

# View the entire Envoy configuration
curl http://localhost:15000/config_dump

# Check specific listeners
curl http://localhost:15000/config_dump?resource=listeners

# View applied filters
curl http://localhost:15000/config_dump?resource=filters
```

Compare the actual Envoy configuration with your EnvoyFilter intent. Look for missing patches or incorrect insertion points. The config dump is verbose but shows exactly what Envoy sees.

## Testing EnvoyFilter Changes

Always test EnvoyFilters in a non-production environment first. Use traffic splitting to gradually roll out changes:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: canary-test
spec:
  hosts:
  - myapp
  http:
  - match:
    - headers:
        x-test-envoyfilter:
          exact: "true"
    route:
    - destination:
        host: myapp
        subset: with-filter
  - route:
    - destination:
        host: myapp
        subset: without-filter
```

Route test traffic to pods with the EnvoyFilter applied. Monitor error rates and latency before expanding the rollout. Incorrect EnvoyFilters can cause connection failures or crashes, so incremental deployment is essential.

EnvoyFilter provides unlimited flexibility for customizing your service mesh. Use it judiciously for features that Istio's standard APIs cannot provide, and always maintain thorough testing and monitoring practices.
