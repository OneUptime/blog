# How to Handle Large Payload Transfers Through Istio Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Performance, Kubernetes, Service Mesh, Envoy

Description: How to configure Istio and Envoy proxy settings to handle large payload transfers including file uploads, bulk API responses, and streaming data.

---

When your services need to transfer large payloads - file uploads, bulk data exports, large API responses, video streams - the Istio sidecar proxy can become a bottleneck if it is not configured properly. By default, Envoy (the proxy that powers Istio) has sensible limits for typical web traffic, but those defaults can cause failures when dealing with multi-megabyte or gigabyte payloads.

This post covers the specific settings you need to adjust and the different approaches for handling large data transfers through the mesh.

## Default Limits That Bite You

Envoy has several default limits that affect large payloads:

- HTTP request headers: 60 KiB
- HTTP response headers: 60 KiB by default, except HTTP/1 response headers which default to 80 KiB
- HTTP request body: no hard limit by default, but buffering behavior can cause issues
- gRPC received message size: commonly 4 MB, depending on the gRPC library and direction
- HTTP/2 initial stream window: 16 MB in current Envoy releases
- HTTP/2 initial connection window: 24 MB in current Envoy releases

When you hit these limits, you will see errors like "upstream reset", "payload too large", or gRPC status code RESOURCE_EXHAUSTED.

## Increasing HTTP Header Size

If your requests carry large headers (common with JWTs, cookies, or custom metadata), increase the header limit with an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: large-headers
  namespace: istio-system
spec:
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: ANY
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

This increases the max header size to 256 KB. Apply this in the `istio-system` namespace to affect all proxies, or in a specific namespace to limit the scope.

## Handling Large HTTP Request Bodies

For file uploads or large POST requests, the main concern is buffering. Envoy can proxy arbitrarily large bodies when all HTTP filters on the route are streaming, but filters such as the buffer filter, transcoding filters, or custom filters that read the full body can force buffering. For large files, this consumes a lot of memory in the sidecar and can trigger 413 responses when buffer limits are exceeded.

Avoid buffering filters on upload routes and use a VirtualService with a large timeout for long-running transfers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: upload-service
  namespace: app
spec:
  hosts:
    - upload-service.app.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /upload
      route:
        - destination:
            host: upload-service.app.svc.cluster.local
            port:
              number: 8080
      timeout: 600s
```

The long timeout (600 seconds) gives the upstream service enough time to complete the request and response for a large transfer. Use the stream idle timeout below if the transfer can pause with no bytes flowing.

## Configuring Stream Idle Timeout

For streaming or chunked transfers, the stream idle timeout controls how long a stream can be open without any data flowing. If your large transfer has pauses between chunks, increase this:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: stream-timeout
  namespace: app
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
            stream_idle_timeout: 300s
```

## gRPC Large Messages

Many gRPC libraries have a default 4 MB receive message size limit. For services that send large gRPC messages, check both the client and server send and receive limits and increase the relevant settings on both sides. The application-level setting handles the gRPC library limit, but you also need to make sure Istio does not interfere.

On the Istio side, the main thing is ensuring the timeout is long enough for large message transfers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-service
  namespace: app
spec:
  hosts:
    - data-service.app.svc.cluster.local
  http:
    - route:
        - destination:
            host: data-service.app.svc.cluster.local
            port:
              number: 50051
      timeout: 300s
```

For the gRPC message size, configure it in your application code. For a Go client:

```go
conn, err := grpc.NewClient(
    "data-service.app.svc.cluster.local:50051",
    grpc.WithDefaultCallOptions(
        grpc.MaxCallRecvMsgSize(100*1024*1024), // 100 MB
        grpc.MaxCallSendMsgSize(100*1024*1024), // 100 MB
    ),
)
```

On the Go server, use `grpc.MaxRecvMsgSize` and `grpc.MaxSendMsgSize` with `grpc.NewServer`.

## HTTP/2 Window Sizes

HTTP/2 uses flow control windows that limit how much data can be in-flight. Current Envoy releases default to a 16 MB stream window and a 24 MB connection window, which is enough for many workloads. If you have measured flow-control stalls or high-bandwidth, high-latency links, tune the window sizes:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: http2-windows
  namespace: app
spec:
  workloadSelector:
    labels:
      app: data-service
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: data-service.app.svc.cluster.local
      patch:
        operation: MERGE
        value:
          typed_extension_protocol_options:
            envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
              "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
              explicit_http_config:
                http2_protocol_options:
                  initial_stream_window_size: 33554432
                  initial_connection_window_size: 67108864
```

This sets the stream window to 32 MB and the connection window to 64 MB, which can improve throughput for large transfers on links where flow control is the bottleneck.

## Sidecar Resource Allocation

Large payload transfers put significant load on the Istio sidecar. The proxy needs enough memory to handle buffering and enough CPU for TLS encryption/decryption of the data stream:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: upload-service
  namespace: app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "1000m"
        sidecar.istio.io/proxyMemory: "512Mi"
        sidecar.istio.io/proxyCPULimit: "2000m"
        sidecar.istio.io/proxyMemoryLimit: "1Gi"
    spec:
      containers:
        - name: upload-service
          image: my-upload-service:latest
```

For services that regularly handle payloads over 100 MB, you might need 1 GB or more of memory for the sidecar.

## TCP Passthrough for Very Large Transfers

If you are transferring very large files (gigabytes) and the HTTP layer overhead is a problem, consider using TCP passthrough instead. Name your port with the `tcp-` prefix and Istio will skip HTTP processing entirely:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: bulk-transfer
  namespace: app
spec:
  selector:
    app: bulk-transfer
  ports:
    - name: tcp-transfer
      port: 9000
      targetPort: 9000
```

With TCP passthrough, there is no header parsing, no request buffering, and no HTTP/2 flow control. The proxy just forwards raw bytes, which is much more efficient for large transfers.

## Bypassing the Sidecar

For extreme cases where even TCP passthrough overhead is unacceptable, you can exclude specific ports from the sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bulk-transfer
  namespace: app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "9000"
        traffic.sidecar.istio.io/excludeOutboundPorts: "9000"
    spec:
      containers:
        - name: bulk-transfer
          image: my-bulk-transfer:latest
```

This tells the sidecar to not intercept traffic on port 9000. The traffic goes directly between pods without any proxy involvement. You lose mTLS and observability for that port, but you eliminate all proxy overhead.

## Monitoring Large Transfers

Watch for sidecar memory pressure when handling large payloads:

```bash
kubectl top pod -n app --containers | grep istio-proxy
```

Also check for timeout and reset errors:

```text
istio_requests_total{response_code="408", destination_service="upload-service.app.svc.cluster.local"}
istio_requests_total{response_flags="UT", destination_service="upload-service.app.svc.cluster.local"}
```

The `UT` response flag means "upstream request timeout", which indicates the transfer took longer than the configured timeout.

Handling large payloads through Istio requires attention to timeouts, buffer sizes, and sidecar resources. For most cases, increasing timeouts and sidecar memory is enough. For extremely large transfers, TCP passthrough or port exclusion gives you the raw performance you need.
