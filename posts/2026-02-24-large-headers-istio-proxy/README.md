# How to Handle Large Headers Through Istio Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Headers, Proxy Configuration, Troubleshooting

Description: Fix issues with large HTTP headers being rejected by Istio's Envoy proxy by configuring header size limits, buffer sizes, and connection manager settings.

---

You have probably run into this at some point: your application works fine on its own, but once you put it behind Istio's Envoy proxy, requests with large headers start failing with 431 (Request Header Fields Too Large) or get silently dropped. This happens because Envoy has default limits on header sizes, and those defaults are conservative.

The most common culprits are JWT tokens (especially when they carry lots of claims), large cookies, or custom headers that carry serialized data. Here is how to fix it.

## Understanding Envoy's Default Limits

Envoy has a few settings that affect how large headers can be:

- **max_request_headers_kb**: Maximum size of request headers. Default is 60 KB.
- **max_headers_count**: Maximum number of headers. Default is 100.
- **initial connection window size**: Affects HTTP/2 header handling.

For most APIs, 60 KB of headers is plenty. But if you are passing large JWT tokens, session cookies, or forwarding chains that add headers at each hop, you can hit the limit fast.

A typical JWT with standard claims is about 1-2 KB. But JWTs with extensive permissions, group memberships, or embedded access tokens can easily be 10-20 KB. Add CORS headers, tracing headers, and other middleware headers on top of that, and you are approaching the limit.

## Diagnosing the Problem

When headers exceed the limit, Envoy returns a 431 status code. Check the proxy logs:

```bash
kubectl logs deploy/my-service -n my-namespace -c istio-proxy | grep "431\|header"
```

You might see entries like:

```text
[2026-02-24T10:15:30.123Z] "GET /api/data HTTP/1.1" 431 - via_upstream - "-" 0 0 0 - "10.0.1.5" "Mozilla/5.0" "abc-123"
```

You can also check the Envoy stats for header-related rejections:

```bash
istioctl proxy-config stats deploy/my-service -n my-namespace | grep "header_size"
```

Look for `downstream_rq_too_large` or `http1.response_flood` counters.

## Increasing Header Size Limits

Use an EnvoyFilter to increase the maximum request header size. This applies to the HTTP connection manager in the Envoy proxy:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: increase-header-size
  namespace: my-namespace
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
          max_request_headers_kb: 256
```

This increases the limit from 60 KB to 256 KB for inbound traffic to `my-service`. Apply the same for outbound if needed:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: increase-header-size-outbound
  namespace: my-namespace
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_OUTBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          max_request_headers_kb: 256
```

## Applying to the Ingress Gateway

If the problem is at the ingress gateway (external traffic coming into the cluster), apply the EnvoyFilter to the gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: increase-gateway-header-size
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          max_request_headers_kb: 256
```

## Increasing the Number of Headers

If the issue is too many headers rather than total size, increase the `common_http_protocol_options`:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: increase-header-count
  namespace: my-namespace
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
          common_http_protocol_options:
            max_headers_count: 200
```

## Handling HTTP/2 Header Compression

HTTP/2 uses HPACK header compression, which has its own table size limit. If you are using HTTP/2 between services (which Istio enables by default for gRPC), you might need to adjust the HPACK table size:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: http2-header-settings
  namespace: my-namespace
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
          http2_protocol_options:
            max_header_list_size: 262144
            initial_stream_window_size: 1048576
```

The `max_header_list_size` sets the maximum size of the header list in bytes after decompression. The default is typically 64 KB.

## Mesh-Wide Header Size Configuration

If many services in your mesh need larger headers, apply the EnvoyFilter globally instead of per-workload:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-header-size
  namespace: istio-system
spec:
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          max_request_headers_kb: 128
```

Applying in `istio-system` without a `workloadSelector` makes it apply to all proxies in the mesh.

## Verifying the Configuration

After applying the EnvoyFilter, verify that the setting took effect:

```bash
istioctl proxy-config listener deploy/my-service -n my-namespace -o json | \
  jq '.[].filterChains[].filters[] | select(.name == "envoy.filters.network.http_connection_manager") | .typedConfig.maxRequestHeadersKb'
```

If the value matches what you set, the configuration is applied correctly.

Test with a large header:

```bash
# Generate a large header value (100 KB)
LARGE_HEADER=$(python3 -c "print('x' * 102400)")

kubectl exec deploy/sleep -n my-namespace -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Large-Header: $LARGE_HEADER" \
  http://my-service:8080/health
```

If it returns 200 instead of 431, your configuration is working.

## Best Practices

Before increasing header limits, consider whether you actually need such large headers. Some alternatives:

- **Move data out of headers into the request body.** If you are passing large payloads in headers, use a POST request instead.
- **Compress JWTs.** If your JWT is too large, review what claims you are including. Move non-essential claims to a user info endpoint.
- **Use reference tokens instead of self-contained tokens.** Instead of passing a large JWT, pass a short opaque token and let the service resolve it.
- **Strip unnecessary headers.** Middleware and proxies often add headers that downstream services do not need.

If you do need large headers, set the limit to the smallest value that works for your use case. Setting `max_request_headers_kb: 8192` (8 MB) just because you can is inviting abuse. A malicious client could send requests with massive headers to consume proxy memory.

Also remember that the header limit applies per-request. In a service-to-service call chain where each hop adds headers, the total header size grows. If service A adds 10 KB of headers and calls service B which adds another 10 KB and calls service C, service C sees 20 KB+ of headers.

## Summary

Large header issues in Istio are caused by Envoy's default conservative limits. Use EnvoyFilter resources to increase `max_request_headers_kb`, `max_headers_count`, and HTTP/2 header list sizes. Apply changes to specific workloads, the ingress gateway, or mesh-wide depending on the scope of the problem. But also question whether your headers really need to be that large, because reducing header size is often a better fix than increasing limits.
