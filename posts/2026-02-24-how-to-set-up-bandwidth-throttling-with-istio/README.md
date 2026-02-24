# How to Set Up Bandwidth Throttling with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Bandwidth, Throttling, Envoy, Traffic Management, Kubernetes

Description: How to configure bandwidth throttling in Istio to control data transfer rates and prevent network saturation in your service mesh.

---

Bandwidth throttling is different from request rate limiting. Rate limiting controls how many requests per second a client can make. Bandwidth throttling controls how much data per second can flow through a connection. You need bandwidth throttling when large responses (file downloads, data exports, streaming) risk saturating your network or starving other services.

## Understanding Bandwidth Control in Envoy

Envoy provides bandwidth limiting through its bandwidth limit filter. This filter controls the rate at which data flows through the proxy on a per-connection or per-request basis. It uses a token bucket algorithm similar to rate limiting, but instead of counting requests, it counts bytes.

The bandwidth limit filter can apply to both request bodies (uploads) and response bodies (downloads). You configure it through an EnvoyFilter resource in Istio.

## Basic Bandwidth Throttling Setup

Here is a configuration that limits each connection to 1 MB/s for both uploads and downloads:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: bandwidth-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: file-service
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
        name: envoy.filters.http.bandwidth_limit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.bandwidth_limit.v3.BandwidthLimit
          stat_prefix: bandwidth_limiter
          enable_mode: REQUEST_AND_RESPONSE
          limit_kbps: 1024
          fill_interval: 50ms
```

The key fields:

- `enable_mode` - Controls what gets throttled: `REQUEST` (uploads only), `RESPONSE` (downloads only), or `REQUEST_AND_RESPONSE` (both)
- `limit_kbps` - The bandwidth limit in kilobits per second (1024 kbps = roughly 1 MB/s)
- `fill_interval` - How frequently the token bucket refills. Smaller intervals give smoother throughput

## Throttling Only Downloads

If you only care about limiting download speeds (which is the common case for file servers):

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: download-throttle
  namespace: default
spec:
  workloadSelector:
    labels:
      app: file-service
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
        name: envoy.filters.http.bandwidth_limit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.bandwidth_limit.v3.BandwidthLimit
          stat_prefix: download_limiter
          enable_mode: RESPONSE
          limit_kbps: 5120
          fill_interval: 50ms
```

This limits response data to roughly 5 MB/s per connection.

## Throttling Uploads

For services that accept large file uploads and you want to prevent clients from flooding the network:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: upload-throttle
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
        name: envoy.filters.http.bandwidth_limit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.bandwidth_limit.v3.BandwidthLimit
          stat_prefix: upload_limiter
          enable_mode: REQUEST
          limit_kbps: 2048
          fill_interval: 50ms
```

## Per-Route Bandwidth Limits

Different endpoints might need different bandwidth limits. A video streaming endpoint needs higher bandwidth than a document download endpoint. You can configure per-route overrides:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: per-route-bandwidth
  namespace: default
spec:
  workloadSelector:
    labels:
      app: content-service
  configPatches:
  # Base filter with default limits
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
        name: envoy.filters.http.bandwidth_limit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.bandwidth_limit.v3.BandwidthLimit
          stat_prefix: bandwidth_limiter
          enable_mode: RESPONSE
          limit_kbps: 1024
          fill_interval: 50ms
  # Higher limit for video streaming route
  - applyTo: HTTP_ROUTE
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          route:
            name: "video-stream"
    patch:
      operation: MERGE
      value:
        typed_per_filter_config:
          envoy.filters.http.bandwidth_limit:
            "@type": type.googleapis.com/envoy.extensions.filters.http.bandwidth_limit.v3.BandwidthLimit
            stat_prefix: video_bandwidth_limiter
            enable_mode: RESPONSE
            limit_kbps: 10240
            fill_interval: 50ms
```

## Using Connection Limits as an Alternative

If the bandwidth limit filter does not fit your needs, you can also use Envoy's connection-level buffer limits to indirectly control bandwidth. This works by limiting the amount of data buffered per connection:

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
    patch:
      operation: MERGE
      value:
        per_connection_buffer_limit_bytes: 32768
```

This limits each connection's buffer to 32KB. It does not directly control bandwidth, but it prevents any single connection from consuming too much memory and provides backpressure.

## Applying at the Ingress Gateway

For public-facing services, apply bandwidth limits at the ingress gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-bandwidth-limit
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
        name: envoy.filters.http.bandwidth_limit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.bandwidth_limit.v3.BandwidthLimit
          stat_prefix: gateway_bandwidth_limiter
          enable_mode: RESPONSE
          limit_kbps: 8192
          fill_interval: 50ms
```

## Monitoring Bandwidth Usage

The bandwidth limit filter exposes stats that you can scrape with Prometheus:

```bash
kubectl exec my-service-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep bandwidth_limiter
```

You will see metrics like:

```
bandwidth_limiter.request_enabled: 1000
bandwidth_limiter.response_enabled: 1000
bandwidth_limiter.request_enforced: 500
bandwidth_limiter.response_enforced: 800
```

For more detailed bandwidth monitoring, Istio's standard telemetry tracks bytes sent and received:

```promql
sum(rate(istio_tcp_sent_bytes_total{
  destination_service_name="file-service"
}[5m])) by (pod)
```

## Testing Bandwidth Limits

Test with a large file download:

```bash
# Download a file and measure the speed
time curl -o /dev/null http://file-service.default:8080/large-file.zip

# Or use curl's built-in speed display
curl -o /dev/null -w "Speed: %{speed_download} bytes/sec\n" \
  http://file-service.default:8080/large-file.zip
```

Compare this with the expected speed. If you set `limit_kbps: 1024`, the download speed should be approximately 128 KB/s (1024 kilobits = 128 kilobytes).

## Combining with Request Rate Limiting

Bandwidth throttling and request rate limiting serve different purposes and work well together:

- Rate limiting prevents too many requests
- Bandwidth throttling prevents too much data per request

For a file service, you might want both:

```yaml
# Rate limit: max 100 download requests per minute
# Bandwidth limit: max 5 MB/s per download
```

This prevents both request floods and bandwidth saturation.

## Practical Considerations

Keep these things in mind:

- Bandwidth limits are per-connection in Envoy. A client opening multiple connections effectively multiplies their bandwidth.
- The `fill_interval` affects burstiness. Smaller intervals give smoother throughput but slightly more overhead.
- Very low bandwidth limits can cause timeouts if the client or server has aggressive timeout settings.
- gRPC streaming and WebSocket connections are long-lived, so bandwidth limits are especially relevant for these.

## Summary

Bandwidth throttling in Istio controls data transfer rates through Envoy's bandwidth limit filter. Configure it through EnvoyFilter resources, choosing between request throttling, response throttling, or both. Use per-route overrides to apply different limits to different endpoints. Combine bandwidth throttling with request rate limiting for comprehensive traffic control. Monitor throughput metrics to verify your limits are working and adjust them based on your network capacity and service requirements.
