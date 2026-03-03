# How to Configure Proxy Buffering Settings in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Proxy Buffering, Envoy, Performance, Kubernetes

Description: Guide to configuring proxy buffering settings in Istio including connection buffer limits, HTTP buffer filter, stream idle timeouts, and memory management.

---

Proxy buffering in Istio controls how the Envoy sidecar handles data flowing between clients and upstream services. Buffering happens at multiple layers - TCP connection buffers, HTTP request/response buffers, and filter-specific buffers. Getting these settings right affects latency, memory usage, and reliability. This post covers all the buffering knobs available.

## Types of Buffering in Envoy

There are several distinct buffering mechanisms in Envoy, and they serve different purposes:

1. **TCP connection buffer** - raw bytes buffered at the transport layer
2. **HTTP request body buffer** - buffering the request body before forwarding
3. **HTTP response body buffer** - buffering the response body before sending to client
4. **Filter buffers** - temporary storage used by specific filters (like the buffer filter)
5. **Watermark buffers** - flow control buffers that apply backpressure

Understanding the difference is important because tuning one does not affect the others.

## TCP Connection Buffer Limits

The `per_connection_buffer_limit_bytes` setting controls how much data Envoy buffers at the TCP level per connection:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: connection-buffer
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

This sets a 1 MB per-connection buffer for inbound traffic. The default in Envoy is 1 MB. When this buffer fills up, Envoy stops reading from the downstream connection until the upstream consumes some data. This is the flow control mechanism.

For outbound connections:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: outbound-connection-buffer
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_OUTBOUND
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 2097152
```

### When to Increase Connection Buffers

- High-throughput services transferring large payloads
- Services with bursty traffic patterns
- When you see "downstream flow control" or "upstream flow control" in Envoy debug logs

### When to Decrease Connection Buffers

- Memory-constrained environments
- Many concurrent connections (each one uses buffer memory)
- Low-bandwidth services that do not need large buffers

## Cluster-Level Buffer Settings

You can also set buffer limits on the upstream cluster (the connection to the backend):

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: cluster-buffer
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
          per_connection_buffer_limit_bytes: 2097152
```

This controls the buffer between the Envoy proxy and the upstream service.

## HTTP Connection Manager Buffering

The HTTP Connection Manager (HCM) has several buffering-related settings:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: hcm-buffering
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
            stream_idle_timeout: 300s
            request_timeout: 0s
            request_headers_timeout: 30s
            max_request_headers_kb: 60
            delayed_close_timeout: 1s
```

### stream_idle_timeout

```yaml
stream_idle_timeout: 300s
```

How long a stream can be idle (no data flowing) before Envoy closes it. Default is 5 minutes. Set this higher for long-polling or slow-processing endpoints. Set to `0s` to disable (be careful - this can lead to resource leaks).

### request_timeout

```yaml
request_timeout: 0s
```

Maximum duration for the entire request (including the body). Default is 0 (disabled). This is different from the VirtualService timeout, which covers the upstream response time. The `request_timeout` covers the time to receive the complete request from the client.

### request_headers_timeout

```yaml
request_headers_timeout: 30s
```

Maximum time to wait for the request headers to arrive. This protects against slow-loris attacks where a client sends headers very slowly.

### max_request_headers_kb

```yaml
max_request_headers_kb: 60
```

Maximum size of request headers in kilobytes. Default is 60 KB. Requests with headers exceeding this size are rejected with a 431 status code.

### delayed_close_timeout

```yaml
delayed_close_timeout: 1s
```

After Envoy sends a local reply (like a 413 for oversized request), it waits this long before closing the connection. This gives the client time to receive the response.

## HTTP Buffer Filter

The dedicated buffer filter provides explicit control over request body buffering:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: http-buffer-filter
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

When the buffer filter is active:

1. Envoy reads the entire request body into memory
2. Only then forwards the request to the upstream
3. If the body exceeds `max_request_bytes`, a 413 is returned

This is necessary for:
- Retries on POST/PUT/PATCH requests
- Request body transformation in Lua or Wasm filters
- Request mirroring with bodies

## Watermark-Based Flow Control

Envoy uses a watermark system for flow control. When buffers reach the high watermark, Envoy pauses reading from the data source. When buffers drain to the low watermark, reading resumes.

You can monitor this through Envoy stats:

```bash
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep flow_control

# Key metrics:
# downstream_flow_control_paused_reading_total
# downstream_flow_control_resumed_reading_total
# upstream_flow_control_paused_reading_total
# upstream_flow_control_resumed_reading_total
```

If you see high numbers of flow control pauses, it means buffers are filling up. Consider:
- Increasing buffer limits
- Reducing request/response body sizes
- Scaling up the service to handle traffic faster

## Buffering for Specific Scenarios

### High-Throughput Data Pipeline

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: data-pipeline-buffering
  namespace: data-processing
spec:
  workloadSelector:
    labels:
      app: data-pipeline
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 4194304
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
            stream_idle_timeout: 600s
            request_timeout: 300s
```

### API Gateway with Retries

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: api-gateway-buffering
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
          name: envoy.filters.http.buffer
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.Buffer
            max_request_bytes: 5242880
```

### Low-Memory Sidecar

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: low-memory-buffering
  namespace: default
spec:
  workloadSelector:
    labels:
      app: lightweight-service
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 262144
    - applyTo: LISTENER
      match:
        context: SIDECAR_OUTBOUND
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 262144
```

## Monitoring Buffer-Related Metrics

```bash
# Connection buffer overflows
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep overflow

# Active connections and their memory usage
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep cx_active

# Buffer filter stats
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep buffer

# Memory usage
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/memory
```

## Memory Planning

When planning buffer sizes, consider the formula:

```text
Total buffer memory = connections * per_connection_buffer * 2 (in + out) + http_buffer * concurrent_buffered_requests
```

For example:
- 500 connections with 1 MB buffer each = 1 GB for connection buffers
- 100 concurrent requests with 5 MB HTTP buffer = 500 MB for HTTP buffers
- Total: ~1.5 GB

Make sure your sidecar memory limits account for buffering:

```yaml
annotations:
  sidecar.istio.io/proxyMemory: "256Mi"
  sidecar.istio.io/proxyMemoryLimit: "2Gi"
```

Getting proxy buffering right is a balance between throughput and resource usage. Start with the defaults, monitor the flow control stats, and adjust when you see either memory pressure or paused connections. Every service has different traffic patterns, so there is no one-size-fits-all configuration.
