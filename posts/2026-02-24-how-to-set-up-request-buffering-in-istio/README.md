# How to Set Up Request Buffering in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Request Buffering, EnvoyFilter, Performance, Kubernetes

Description: How to configure request buffering in Istio to handle large request bodies, improve retry behavior, and manage memory usage with EnvoyFilter configuration.

---

Request buffering controls whether Envoy fully reads the request body before forwarding it to the upstream service or streams it through as it arrives. By default, Envoy streams request bodies, which is great for latency but causes problems when retries need to re-send the body. This post explains how to configure request buffering in Istio and when you should use it.

## Why Request Buffering Matters

When Envoy streams a request body and the upstream fails midway through, Envoy cannot retry the request because the body data is already gone - it was forwarded as it arrived and not stored. If you want reliable retries for POST, PUT, or PATCH requests with bodies, you need request buffering.

Buffering also matters for:

- Route-level retries on requests with bodies
- Request transformations that need the full body
- Lua or Wasm filters that process the request body
- Request mirroring with bodies

The trade-off is memory usage and latency. Buffering means Envoy stores the entire request body in memory before forwarding, which adds latency for the first byte and uses more RAM.

## Default Behavior

By default, Envoy in Istio does not buffer request bodies. It uses streaming mode where bytes are forwarded to the upstream as they arrive. The `per_connection_buffer_limit_bytes` on the listener controls TCP-level buffering, but that is different from HTTP request body buffering.

## Configuring the Buffer Filter

Envoy has a dedicated buffer filter that you can add via EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: request-buffer
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
          name: envoy.filters.http.buffer
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.Buffer
            max_request_bytes: 10485760
```

The `max_request_bytes` field sets the maximum size of the request body that Envoy will buffer, in bytes. In this example, it is 10 MB. If the request body exceeds this limit, Envoy returns a 413 (Payload Too Large) response.

## Buffer Filter on the Gateway

For inbound gateway traffic:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-request-buffer
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
          name: envoy.filters.http.buffer
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.Buffer
            max_request_bytes: 5242880
```

This buffers up to 5 MB of request bodies at the gateway level.

## Per-Route Buffer Configuration

You can also configure buffering on a per-route basis using route-level typed per filter config:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-route-buffer
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
    - applyTo: HTTP_ROUTE
      match:
        context: SIDECAR_INBOUND
        routeConfiguration:
          vhost:
            name: "inbound|http|8080"
            route:
              action: ANY
      patch:
        operation: MERGE
        value:
          typed_per_filter_config:
            envoy.filters.http.buffer:
              "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.BufferPerRoute
              buffer:
                max_request_bytes: 2097152
```

This applies a 2 MB buffer limit to specific routes. You can also disable buffering for specific routes if you have it enabled globally:

```yaml
typed_per_filter_config:
  envoy.filters.http.buffer:
    "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.BufferPerRoute
    disabled: true
```

## Connection Buffer Limits

Separate from the HTTP buffer filter, you can configure TCP-level buffer limits on listeners:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: connection-buffer-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 8080
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 1048576
```

This sets a 1 MB per-connection buffer at the TCP level. This is different from the HTTP buffer filter - it controls how much data Envoy buffers at the transport layer, regardless of HTTP framing.

## Configuring Retry Buffer Size

When retries are configured on a VirtualService, Envoy needs to buffer the request body to retry it. The retry buffer has its own configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: retry-buffer-config
  namespace: default
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
            request_timeout: 30s
```

For retries to work with request bodies, you typically need the buffer filter enabled on the outbound path:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: outbound-buffer-for-retries
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
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
          name: envoy.filters.http.buffer
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.Buffer
            max_request_bytes: 5242880
```

Now when the VirtualService retry policy kicks in, Envoy has the full request body buffered and can resend it.

## Memory Considerations

Buffering stores request bodies in memory. For high-traffic services, this can add up fast:

- 1000 concurrent requests with 1 MB bodies = 1 GB of buffer memory
- 5000 concurrent requests with 5 MB bodies = 25 GB of buffer memory

Set your buffer limits based on realistic request sizes:

```yaml
# For APIs with JSON payloads (typically small)
max_request_bytes: 1048576  # 1 MB

# For file upload endpoints
max_request_bytes: 52428800  # 50 MB

# For general web traffic
max_request_bytes: 5242880  # 5 MB
```

Make sure the Envoy container has enough memory allocated:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemory: "512Mi"
        sidecar.istio.io/proxyMemoryLimit: "1Gi"
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

## Monitoring Buffer Usage

Watch Envoy's buffer-related stats:

```bash
# Check buffer stats
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep buffer

# Key metrics to watch:
# http.inbound_0.0.0.0_8080.buffer.rq_timeout - requests that timed out during buffering
# cluster.outbound|8080||service.upstream_rq_retry - retry attempts
```

## When Not to Buffer

Do not enable buffering for:

- Streaming requests (WebSocket, gRPC streaming, SSE)
- Very large file uploads (use chunked transfer instead)
- Low-latency services where the buffering delay is unacceptable
- Services with high concurrency and large request bodies (memory pressure)

Request buffering is one of those features that is invisible when it works well. Enable it where you need reliable retries or body-dependent processing, size the buffers appropriately for your traffic patterns, and monitor memory usage to avoid surprises.
