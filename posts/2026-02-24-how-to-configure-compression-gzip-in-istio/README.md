# How to Configure Compression (gzip) in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Compression, Gzip, Performance, EnvoyFilter, Kubernetes

Description: Step-by-step guide to enabling gzip and other compression algorithms in Istio using EnvoyFilter to reduce bandwidth and improve response times.

---

Compressing HTTP responses before sending them to clients can significantly reduce bandwidth usage and improve page load times. Instead of configuring compression in each individual application, you can handle it at the proxy layer with Istio. This means every service in your mesh gets compression without any code changes.

## How Compression Works in Envoy

Envoy supports response compression through its compressor filter. When a client sends a request with the `Accept-Encoding: gzip` header, the compressor filter checks if the response is eligible for compression and compresses it before sending it back. The `Content-Encoding: gzip` header is added to the compressed response.

Envoy supports multiple compression algorithms:

- gzip - the most widely supported
- brotli - better compression ratios, newer browser support
- zstd - fastest compression/decompression speed

## Enabling gzip Compression

To enable gzip compression in Istio, you add the compressor filter via EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gzip-compression
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
          name: envoy.filters.http.compressor
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.compressor.v3.Compressor
            response_direction_config:
              common_config:
                min_content_length: 1024
                enabled:
                  default_value: true
                  runtime_key: response_compressor_enabled
                content_type:
                  - "text/html"
                  - "text/css"
                  - "text/plain"
                  - "text/javascript"
                  - "application/javascript"
                  - "application/json"
                  - "application/xml"
                  - "application/xhtml+xml"
                  - "image/svg+xml"
                  - "application/wasm"
            compressor_library:
              name: text_optimized
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.compression.gzip.compressor.v3.Gzip
                memory_level: 5
                window_bits: 15
                compression_level: BEST_SPEED
                compression_strategy: DEFAULT_STRATEGY
```

This is a solid configuration for most use cases. The key settings are:

### min_content_length

```yaml
min_content_length: 1024
```

Responses smaller than this (in bytes) will not be compressed. Compressing tiny responses wastes CPU without meaningful bandwidth savings. 1024 bytes is a reasonable minimum.

### content_type

```yaml
content_type:
  - "text/html"
  - "text/css"
  - "application/json"
```

Only responses with these Content-Type headers will be compressed. You generally want to compress text-based formats (HTML, CSS, JSON, JavaScript, XML) and skip binary formats (images, video, already-compressed files) because they do not compress well and waste CPU.

### Gzip Compression Settings

```yaml
compressor_library:
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.compression.gzip.compressor.v3.Gzip
    memory_level: 5
    window_bits: 15
    compression_level: BEST_SPEED
    compression_strategy: DEFAULT_STRATEGY
```

- `memory_level` - how much memory to use for compression (1-9). Higher values use more memory but are faster. Default is 5.
- `window_bits` - the window size for compression (9-15). Larger windows give better compression ratios but use more memory. 15 is the maximum.
- `compression_level` - the compression level. Options:
  - `BEST_SPEED` - fastest compression, lower ratio (recommended for most cases)
  - `COMPRESSION_LEVEL_1` through `COMPRESSION_LEVEL_9` - specific levels
  - `DEFAULT_COMPRESSION` - zlib default (level 6)
  - `BEST_COMPRESSION` - best ratio, slowest speed
- `compression_strategy` - the compression strategy. `DEFAULT_STRATEGY` works well for general content. `FILTERED` is good for data with specific patterns. `HUFFMAN_ONLY` and `RLE` are for special use cases.

## Applying Compression to All Sidecars

To enable compression mesh-wide (not just at the gateway):

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: sidecar-compression
  namespace: istio-system
spec:
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
          name: envoy.filters.http.compressor
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.compressor.v3.Compressor
            response_direction_config:
              common_config:
                min_content_length: 512
                content_type:
                  - "application/json"
                  - "text/plain"
            compressor_library:
              name: text_optimized
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.compression.gzip.compressor.v3.Gzip
                compression_level: BEST_SPEED
```

Note: mesh-wide compression without a `workloadSelector` applies to all sidecars. For service-to-service communication within the mesh, compression might not be worth the CPU cost since traffic stays on the cluster network. Consider applying it only at the gateway or for specific high-bandwidth services.

## Enabling Brotli Compression

Brotli typically achieves 15-20% better compression than gzip for text content:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: brotli-compression
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
          name: envoy.filters.http.compressor
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.compressor.v3.Compressor
            response_direction_config:
              common_config:
                min_content_length: 1024
                content_type:
                  - "text/html"
                  - "text/css"
                  - "application/javascript"
                  - "application/json"
            compressor_library:
              name: brotli
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.compression.brotli.compressor.v3.Brotli
                quality: 4
                window_bits: 22
                input_block_bits: 24
                disable_literal_context_modeling: false
```

Brotli settings:

- `quality` - compression quality (0-11). Higher is better compression but slower. 4 is a good balance for dynamic content.
- `window_bits` - sliding window size (10-24). Larger values improve compression of repetitive content.

## Enabling Both gzip and Brotli

You can have both compression algorithms active. Envoy will choose based on the client's `Accept-Encoding` header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: multi-compression
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
          name: envoy.filters.http.compressor.gzip
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.compressor.v3.Compressor
            response_direction_config:
              common_config:
                min_content_length: 1024
                content_type:
                  - "text/html"
                  - "text/css"
                  - "application/javascript"
                  - "application/json"
            compressor_library:
              name: gzip
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.compression.gzip.compressor.v3.Gzip
                compression_level: BEST_SPEED
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
          name: envoy.filters.http.compressor.brotli
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.compressor.v3.Compressor
            response_direction_config:
              common_config:
                min_content_length: 1024
                content_type:
                  - "text/html"
                  - "text/css"
                  - "application/javascript"
                  - "application/json"
            compressor_library:
              name: brotli
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.compression.brotli.compressor.v3.Brotli
                quality: 4
```

## Disabling Compression for Specific Routes

If you enable compression globally but want to skip it for certain routes:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: disable-compression-route
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
            route:
              name: specific-route
      patch:
        operation: MERGE
        value:
          typed_per_filter_config:
            envoy.filters.http.compressor:
              "@type": type.googleapis.com/envoy.extensions.filters.http.compressor.v3.CompressorPerRoute
              disabled: true
```

## Testing Compression

Verify compression is working:

```bash
# Request with gzip support
curl -H "Accept-Encoding: gzip" -o /dev/null -w "Size: %{size_download}\n" -s http://app.example.com/

# Compare with uncompressed
curl -o /dev/null -w "Size: %{size_download}\n" -s http://app.example.com/

# Check response headers
curl -H "Accept-Encoding: gzip" -I http://app.example.com/
# Should include: Content-Encoding: gzip

# Check Envoy stats
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/stats | grep compressor
```

## Performance Impact

Compression uses CPU cycles. For CPU-bound services, test the impact before enabling it. For most web services, the bandwidth savings far outweigh the CPU cost. The `BEST_SPEED` compression level is a good default because it gives most of the compression benefit with minimal CPU overhead.

Compression in Istio is a proxy-level concern, which means your application code stays clean and every service benefits automatically. Start with gzip at the gateway, measure the bandwidth savings, and expand to more services as needed.
