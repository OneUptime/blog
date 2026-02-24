# How to Handle Large File Uploads Through Istio Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, File Upload, Envoy, Kubernetes, Performance

Description: How to configure Istio to handle large file uploads properly, including buffer sizes, timeouts, streaming configuration, and gateway settings.

---

File uploads are one of those things that work fine in development and then break in production when you add a service mesh. The Istio sidecar proxy (Envoy) has default limits on request body sizes, buffer sizes, and timeouts that are reasonable for typical API traffic but completely inadequate for large file uploads. A 50MB file upload that works perfectly without Istio will hit a wall when the sidecar is in the path.

The symptoms are usually clear: upload requests fail with 413 (Payload Too Large), 408 (Request Timeout), or the connection just drops mid-upload. Fixing this requires adjusting several settings across different Istio resources.

## Understanding the Upload Path

When a client uploads a file through Istio, the data flows through multiple proxy layers:

1. If entering through the ingress gateway: Client -> Gateway Envoy -> Sidecar Envoy (destination) -> Application
2. For mesh-internal uploads: Client App -> Sidecar Envoy (source) -> Sidecar Envoy (destination) -> Application

Each proxy in the path has its own limits. You need to adjust settings at every hop.

## Increasing the Request Body Size Limit

Envoy doesn't have a built-in request body size limit for proxied requests by default - it streams the body through. However, if you have any Envoy filters that buffer the full request (like certain Wasm filters or ext_authz), they might run into buffer limits.

The main thing to watch for is the gateway-level configuration. If your ingress gateway has a limit, increase it:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: increase-upload-limit
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
            max_request_headers_kb: 60
```

The `max_request_headers_kb` limits header size, not body size. This is relevant because multipart upload headers can be large if there are many form fields.

## Timeout Configuration

Large file uploads take time, especially over slower connections. The default Istio timeout of 15 seconds is nowhere near enough for a multi-gigabyte upload.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: upload-service
  namespace: default
spec:
  hosts:
    - upload-service.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /upload
      route:
        - destination:
            host: upload-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 0s
    - route:
        - destination:
            host: upload-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 30s
```

Setting `timeout: 0s` on the upload route disables the request timeout entirely. Alternatively, set it to a large value that accommodates your biggest expected upload:

```yaml
timeout: 600s  # 10 minutes
```

If the upload goes through the ingress gateway, set the timeout on the gateway VirtualService too:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: upload-ingress
  namespace: default
spec:
  hosts:
    - "upload.example.com"
  gateways:
    - upload-gateway
  http:
    - match:
        - uri:
            prefix: /upload
      route:
        - destination:
            host: upload-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 0s
```

## Stream Idle Timeout

Envoy also has a stream idle timeout. If no data flows on the connection for a certain period, the stream is closed. During a large file upload, there could be pauses in data transmission (slow client, network congestion).

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
          portNumber: 8080
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
```

`stream_idle_timeout: 300s` means the connection is closed only if no data flows for 5 minutes. `request_timeout: 0s` disables the overall request timeout at the Envoy level.

## Buffer Size Configuration

By default, Envoy streams data through without buffering the entire request body. This means large uploads don't consume proxy memory proportional to the file size. But if you use features that require buffering (like request mirroring with body, or certain WASM plugins), you might need to increase buffer limits.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: upload-buffer
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
          portNumber: 8080
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

This sets the buffer to 100MB. Only use this if you actually need request buffering. For most upload scenarios, streaming (the default) is better because it uses constant memory regardless of file size.

## Connection Pool Settings

Large uploads mean long-lived connections. Make sure the connection pool can handle multiple concurrent uploads:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: upload-service-dr
  namespace: default
spec:
  host: upload-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
      http:
        maxRequestsPerConnection: 0
        http1MaxPendingRequests: 50
```

`maxRequestsPerConnection: 0` means unlimited requests per connection. This prevents the proxy from closing a connection during an active upload because it hit a request limit.

## Disabling Retries for Upload Routes

Retrying a large file upload is almost never what you want. It wastes bandwidth and can cause duplicate processing on the server. Disable retries for upload endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: upload-service
  namespace: default
spec:
  hosts:
    - upload-service.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /upload
      route:
        - destination:
            host: upload-service.default.svc.cluster.local
            port:
              number: 8080
      timeout: 0s
      retries:
        attempts: 0
```

Setting `attempts: 0` disables retries for this route.

## Gateway-Specific Settings

If uploads come through the ingress gateway, the gateway Envoy also needs tuning. Apply an EnvoyFilter to the gateway workload:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-upload-settings
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
          portNumber: 8443
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
```

## Monitoring Upload Performance

Track upload performance through Envoy metrics:

```bash
# Check active connections
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "downstream_cx_active\|upstream_cx_active"

# Check for timeout-related errors
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "timeout\|overflow"

# Check request duration histogram
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep "request_duration"
```

## Testing Upload Limits

Test your configuration with progressively larger files:

```bash
# Generate a test file
dd if=/dev/zero of=/tmp/testfile bs=1M count=100

# Upload through the mesh
kubectl exec -it <client-pod> -n default -- \
  curl -X POST -F "file=@/tmp/testfile" \
  http://upload-service.default.svc.cluster.local:8080/upload \
  -w "\n%{http_code} %{time_total}s\n"
```

Start with small files and increase the size to find where things break. This helps you identify which limit is the bottleneck.

Large file uploads through Istio work well once you adjust the timeout and connection settings. The key changes are disabling route timeouts, setting appropriate idle timeouts, disabling retries, and making sure each proxy in the path has consistent settings. Miss one hop and uploads will still fail at that point.
