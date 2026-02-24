# How to Handle File Upload Through Istio Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, File Upload, Proxy Configuration, EnvoyFilter, Kubernetes

Description: How to configure Istio for handling large file uploads including timeout adjustments, body size limits, chunked transfer encoding, and streaming configurations.

---

File uploads through an Istio proxy can fail in surprising ways if you have not tuned the configuration. By default, Istio's Envoy proxy has reasonable limits for typical API traffic, but file uploads push against those limits. Large files can trigger request timeouts, body size limits, or memory issues. This post walks through everything you need to configure to handle file uploads reliably.

## Common File Upload Failures

Before jumping into solutions, here are the typical error symptoms:

- **413 Payload Too Large** - the request body exceeds the proxy's size limit
- **408 Request Timeout** - the upload takes too long
- **503 Upstream Connection Timeout** - the proxy times out waiting for the upstream to accept the request
- **Connection Reset** - the proxy closes the connection mid-upload
- **Stream idle timeout** - no data flows for too long during a slow upload

Each of these has a different configuration fix.

## Increasing Request Body Size Limits

Envoy does not have a default request body size limit in streaming mode. But if you have the buffer filter enabled (which is needed for retries), it will enforce a size limit:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: upload-buffer-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: upload-service
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
            max_request_bytes: 104857600
```

That sets a 100 MB limit. For larger files, increase accordingly. But be mindful of memory - if you allow 100 MB uploads and have 50 concurrent uploads, that is 5 GB of buffer memory.

If you do not need retries on upload endpoints, avoid the buffer filter entirely and let Envoy stream the upload:

```yaml
# Disable buffer filter for upload routes
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: disable-buffer-uploads
  namespace: default
spec:
  workloadSelector:
    labels:
      app: upload-service
  configPatches:
    - applyTo: HTTP_ROUTE
      match:
        context: SIDECAR_INBOUND
        routeConfiguration:
          vhost:
            route:
              action: ANY
      patch:
        operation: MERGE
        value:
          typed_per_filter_config:
            envoy.filters.http.buffer:
              "@type": type.googleapis.com/envoy.extensions.filters.http.buffer.v3.BufferPerRoute
              disabled: true
```

## Adjusting Timeouts

File uploads, especially over slow connections, need generous timeouts:

### VirtualService Timeout

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: upload-routes
  namespace: default
spec:
  hosts:
    - upload-service
  http:
    - match:
        - uri:
            prefix: /upload
      route:
        - destination:
            host: upload-service
            port:
              number: 8080
      timeout: 600s
```

The VirtualService timeout controls how long Envoy waits for the upstream to send a complete response. For uploads, you need this to cover the time it takes to receive the file plus the time the backend spends processing it.

### Stream Idle Timeout

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: upload-idle-timeout
  namespace: default
spec:
  workloadSelector:
    labels:
      app: upload-service
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
            stream_idle_timeout: 600s
            request_timeout: 600s
```

The `stream_idle_timeout` is particularly important for slow uploads. If the client pauses sending data for longer than this timeout (for example, on a slow mobile connection), Envoy closes the connection. The default is 5 minutes, which may not be enough for very large files over slow networks.

The `request_timeout` covers the entire request duration from when headers arrive to when the body is fully received.

### Gateway-Level Timeouts

If uploads come through the Istio gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-upload-timeout
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
            stream_idle_timeout: 600s
            request_timeout: 600s
```

## Connection Buffer Limits

For large file uploads, you might need to increase the connection buffer:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: upload-connection-buffer
  namespace: default
spec:
  workloadSelector:
    labels:
      app: upload-service
  configPatches:
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
        listener:
          portNumber: 8080
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 10485760
```

This sets a 10 MB connection buffer, which helps when data arrives in large chunks.

## Disabling Retries for Uploads

Retrying a file upload is usually not what you want. The retry would need to re-send the entire file, which is wasteful and may cause duplicate uploads. Disable retries for upload endpoints:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: upload-routes
  namespace: default
spec:
  hosts:
    - upload-service
  http:
    - match:
        - uri:
            prefix: /upload
      route:
        - destination:
            host: upload-service
            port:
              number: 8080
      timeout: 600s
      retries:
        attempts: 0
```

Setting `attempts: 0` disables retries entirely for this route.

## Chunked Transfer Encoding

For HTTP/1.1 uploads, chunked transfer encoding is the standard way to upload files without knowing the size upfront. Envoy handles this natively, but you need to make sure nothing along the path breaks chunked encoding.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: upload-service
  namespace: default
spec:
  host: upload-service
  trafficPolicy:
    connectionPool:
      http:
        useClientProtocol: true
```

Setting `useClientProtocol: true` ensures Envoy uses the same protocol the client sent. This preserves chunked encoding and other protocol-level features.

## HTTP/2 Considerations

HTTP/2 handles large bodies differently from HTTP/1.1. It uses frames and flow control windows. For large uploads over HTTP/2:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: h2-upload-settings
  namespace: default
spec:
  workloadSelector:
    labels:
      app: upload-service
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
              initial_stream_window_size: 1048576
              initial_connection_window_size: 2097152
```

The flow control window size affects how much data can be in-flight before the sender has to wait for an acknowledgment. Larger windows allow faster uploads but use more memory.

## Multipart Upload Handling

Most file uploads use multipart/form-data encoding. Envoy passes these through transparently, but you need to make sure the Content-Type header is preserved:

```yaml
# Do not set content-type in VirtualService headers
# This would break multipart encoding
http:
  - route:
      - destination:
          host: upload-service
        headers:
          request:
            # Do NOT do this for upload routes:
            # set:
            #   content-type: "application/json"
```

## Sidecar Resource Limits

Make sure the sidecar has enough resources for handling large uploads:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: upload-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemory: "512Mi"
        sidecar.istio.io/proxyMemoryLimit: "1Gi"
        sidecar.istio.io/proxyCPU: "500m"
    spec:
      containers:
        - name: upload-app
          image: upload-service:latest
```

## Complete Upload Configuration

Here is a full configuration for a service that handles file uploads up to 500 MB:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: upload-service
  namespace: default
spec:
  hosts:
    - upload-service
  http:
    - match:
        - uri:
            prefix: /upload
      route:
        - destination:
            host: upload-service
            port:
              number: 8080
      timeout: 900s
      retries:
        attempts: 0
    - route:
        - destination:
            host: upload-service
            port:
              number: 8080
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: upload-service
  namespace: default
spec:
  host: upload-service
  trafficPolicy:
    connectionPool:
      http:
        useClientProtocol: true
        h2UpgradePolicy: DO_NOT_UPGRADE
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: upload-service-config
  namespace: default
spec:
  workloadSelector:
    labels:
      app: upload-service
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
            stream_idle_timeout: 900s
            request_timeout: 900s
    - applyTo: LISTENER
      match:
        context: SIDECAR_INBOUND
      patch:
        operation: MERGE
        value:
          per_connection_buffer_limit_bytes: 10485760
```

This configuration allows streaming uploads up to 900 seconds without buffering the entire file in the proxy, disables retries, and uses the client's original protocol.

File uploads through Istio are manageable once you understand which timeout and buffer settings to adjust. The key principle is to stream whenever possible (avoid full-body buffering), set generous timeouts, and allocate enough sidecar resources.
