# How to Configure Envoy Proxy Buffer Sizes in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Performance, Kubernetes, Networking

Description: A practical guide to configuring Envoy proxy buffer sizes in Istio for handling large requests, file uploads, and streaming workloads without running into memory issues.

---

Envoy proxy buffers request and response data as it passes through the sidecar. By default, these buffers are sized for typical web traffic, but if your services handle large file uploads, chunked responses, or other data-heavy workloads, you might need to adjust them. Getting buffer sizes wrong can cause requests to fail with mysterious 413 or 503 errors.

## How Envoy Buffering Works

When a request comes into Envoy, the proxy needs to buffer the data before forwarding it to the upstream service. For HTTP requests, Envoy can operate in two modes:

1. **Buffered mode** - Envoy reads the entire request body into memory before forwarding it. This allows for things like request inspection and retries but uses more memory.
2. **Streaming mode** - Envoy forwards data as it arrives, chunk by chunk. This uses less memory but limits what Envoy can do with the data.

Istio's default configuration uses streaming for most traffic, but certain features (like fault injection or request mirroring) require buffering.

## Default Buffer Limits

The default per-connection buffer limit in Envoy is 1 MiB (1,048,576 bytes). This applies to both the read buffer and the write buffer for each connection. The HTTP/2 initial stream window size defaults to 64 KiB.

These defaults work fine for most API traffic where request and response bodies are relatively small. But if you're dealing with file uploads, large JSON payloads, or binary data transfers, you might need to bump them up.

## Configuring Buffer Sizes with EnvoyFilter

Since Istio doesn't expose buffer configuration directly through VirtualService or DestinationRule, you need to use EnvoyFilter resources.

To change the per-connection buffer limit:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: connection-buffer-limit
  namespace: production
spec:
  workloadSelector:
    labels:
      app: file-upload-service
  configPatches:
  - applyTo: LISTENER
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        perConnectionBufferLimitBytes: 10485760  # 10 MiB
```

This increases the per-connection buffer limit to 10 MiB for inbound traffic to the file-upload-service.

## HTTP Connection Manager Buffer Settings

The HTTP Connection Manager (HCM) filter has its own buffer settings that control how HTTP request and response bodies are handled:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: hcm-buffer-settings
  namespace: production
spec:
  workloadSelector:
    labels:
      app: file-upload-service
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
        typedConfig:
          '@type': type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          streamIdleTimeout: 300s
```

## Adding a Buffer Filter

For more control over request/response buffering, you can add the buffer filter to the HTTP filter chain:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: buffer-filter
  namespace: production
spec:
  workloadSelector:
    labels:
      app: file-upload-service
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
        typedConfig:
          '@type': type.googleapis.com/envoy.extensions.filters.http.buffer.v3.Buffer
          maxRequestBytes: 52428800  # 50 MiB
```

This inserts a buffer filter that allows request bodies up to 50 MiB. Requests larger than this limit will be rejected with a 413 (Payload Too Large) response.

## Configuring HTTP/2 Window Sizes

For HTTP/2 connections, flow control window sizes determine how much data can be in-flight before the receiver sends a window update. If your services communicate over HTTP/2 (which is common within the mesh), tweaking these values can help with large transfers:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: h2-window-size
  namespace: production
spec:
  workloadSelector:
    labels:
      app: data-service
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
      cluster:
        service: data-service.production.svc.cluster.local
    patch:
      operation: MERGE
      value:
        typedExtensionProtocolOptions:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            '@type': type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicitHttpConfig:
              http2ProtocolOptions:
                initialStreamWindowSize: 1048576    # 1 MiB
                initialConnectionWindowSize: 2097152 # 2 MiB
```

Larger window sizes allow more data to be in-flight, which improves throughput for large transfers but uses more memory.

## Sidecar Resource Limits

When you increase buffer sizes, you also need to make sure the sidecar container has enough memory to handle the buffered data. If you allow 50 MiB request bodies and have 100 concurrent connections, that's potentially 5 GB of buffer memory.

Set appropriate resource limits on the sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-upload-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemory: "512Mi"
        sidecar.istio.io/proxyMemoryLimit: "2Gi"
    spec:
      containers:
      - name: app
        image: file-upload-service:latest
```

## Handling Large File Uploads

For services that accept large file uploads, here's a complete configuration that handles bodies up to 100 MiB:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: large-upload-config
  namespace: production
spec:
  workloadSelector:
    labels:
      app: file-upload-service
  configPatches:
  # Increase per-connection buffer limit for inbound
  - applyTo: LISTENER
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        perConnectionBufferLimitBytes: 104857600  # 100 MiB
  # Add buffer filter with 100 MiB limit
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
        typedConfig:
          '@type': type.googleapis.com/envoy.extensions.filters.http.buffer.v3.Buffer
          maxRequestBytes: 104857600  # 100 MiB
```

Pair this with appropriate sidecar resource limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: file-upload-service
  namespace: production
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemory: "1Gi"
        sidecar.istio.io/proxyMemoryLimit: "4Gi"
    spec:
      containers:
      - name: app
        image: file-upload-service:latest
```

## Monitoring Buffer Usage

Check Envoy's buffer-related stats to see if buffers are being hit:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep buffer
```

Key metrics:

- `envoy_http_downstream_rq_too_large` - Requests rejected because they exceeded the buffer limit
- `envoy_cluster_upstream_cx_rx_bytes_total` - Total bytes received from upstream
- `envoy_cluster_upstream_cx_tx_bytes_total` - Total bytes sent to upstream

## Verifying Configuration

After applying your EnvoyFilter, verify it took effect:

```bash
istioctl proxy-config listener <pod-name> -n production -o json | python3 -m json.tool | grep -i buffer
```

You can also dump the full Envoy configuration:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- curl -s localhost:15000/config_dump > envoy-config.json
```

Then search the dump for your buffer settings.

## Troubleshooting

**413 Payload Too Large:** Your request body exceeds the buffer limit. Increase `maxRequestBytes` in the buffer filter or `perConnectionBufferLimitBytes` on the listener.

**503 with upstream connection overflow:** The destination's connection pool might be full. This isn't a buffer issue per se, but large buffered requests hold connections longer, which can exhaust connection pools. Check your DestinationRule connection pool settings.

**OOMKilled sidecar:** You increased buffer sizes without increasing the sidecar's memory limit. Bump up `sidecar.istio.io/proxyMemoryLimit`.

**EnvoyFilter not taking effect:** Check that the `workloadSelector` matches your pods, and that the `match` section targets the right listener context. Use `istioctl analyze` to check for configuration issues:

```bash
istioctl analyze -n production
```

Buffer configuration is one of those things that's invisible when it works and painful when it doesn't. The key is to match your buffer sizes to your actual traffic patterns and make sure you have the memory to back them up.
