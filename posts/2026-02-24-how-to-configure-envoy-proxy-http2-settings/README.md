# How to Configure Envoy Proxy HTTP/2 Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, HTTP2, Performance, Kubernetes

Description: A hands-on guide to configuring HTTP/2 settings in Envoy proxy through Istio, including max concurrent streams, window sizes, and connection management for optimal performance.

---

HTTP/2 is commonly used for service-to-service communication within an Istio mesh, especially for gRPC services or when HTTP/2 upgrade is enabled. Envoy handles the HTTP/2 negotiation and multiplexing transparently, but the default settings aren't always ideal for every workload. If you're running high-throughput services, streaming workloads, or gRPC services, tuning HTTP/2 parameters can make a noticeable difference.

## How HTTP/2 Works in Istio

When two services communicate within the mesh, Envoy sidecars on both sides can establish an HTTP/2 connection between them. The original request from your application (which might be HTTP/1.1) can be upgraded to HTTP/2 between the sidecars when HTTP/2 upgrade is enabled. On the receiving end, Envoy can either keep it as HTTP/2 or downgrade it back to HTTP/1.1, depending on your application's protocol support.

This means HTTP/2 settings affect the sidecar-to-sidecar communication, even if your application only speaks HTTP/1.1.

You can check what protocol Envoy is using for a specific cluster:

```bash
istioctl proxy-config cluster <pod-name> -n <namespace> -o json | python3 -m json.tool | grep -A 5 "protocolSelection"
```

## Controlling HTTP/2 Upgrade Behavior

Istio can use HTTP/2 for communication between sidecars when the protocol is detected as HTTP/2 or when HTTP/2 upgrade is enabled. You can control HTTP/1.1-to-HTTP/2 upgrade behavior through a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: force-h2
  namespace: production
spec:
  host: grpc-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
```

The `h2UpgradePolicy` options are:

- **DEFAULT** - Use the mesh-wide default
- **DO_NOT_UPGRADE** - Keep HTTP/1.1 connections as-is
- **UPGRADE** - Upgrade HTTP/1.1 connections to HTTP/2

For gRPC services, make sure the Kubernetes Service port is explicitly named `grpc` or `http2` (or uses `appProtocol: grpc`/`http2`) since gRPC requires HTTP/2. The `UPGRADE` policy is useful when an HTTP/1.1 client connection should be upgraded to HTTP/2 for the destination.

## Configuring Max Concurrent Streams

HTTP/2 multiplexes multiple requests over a single connection. The max concurrent streams setting controls how many requests can be in-flight on a single connection simultaneously. The current Envoy default is 1,024, while Istio's DestinationRule default for this field is 2,147,483,647 unless you configure it.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: h2-settings
  namespace: production
spec:
  host: api-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 1000
        maxConcurrentStreams: 100
```

The `http2MaxRequests` field in the DestinationRule controls the maximum number of concurrent requests to the destination across all connections. This is different from per-connection max concurrent streams.

The `maxConcurrentStreams` field controls the maximum number of concurrent streams allowed for a peer on one HTTP/2 connection. If you need lower-level settings that are not exposed by DestinationRule, you can use an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: h2-max-streams
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-service
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
      cluster:
        service: api-service.production.svc.cluster.local
    patch:
      operation: MERGE
      value:
        typed_extension_protocol_options:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            '@type': type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicit_http_config:
              http2_protocol_options:
                max_concurrent_streams: 100
```

Setting max concurrent streams to 100 means each HTTP/2 connection can carry up to 100 concurrent requests. If more are needed, Envoy may queue requests or open additional connections, depending on circuit breaker limits.

## Configuring Flow Control Window Sizes

HTTP/2 flow control uses window sizes to prevent fast senders from overwhelming slow receivers. There are two levels:

- **Stream window** - Controls flow control per stream (per request/response)
- **Connection window** - Controls flow control for the entire connection

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: h2-window-sizes
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
        typed_extension_protocol_options:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            '@type': type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicit_http_config:
              http2_protocol_options:
                initial_stream_window_size: 1048576
                initial_connection_window_size: 2097152
```

The HTTP/2 spec initial stream window size is 65,535 bytes (64 KiB), but current Envoy defaults are larger: 16 MiB for the stream window and 24 MiB for the connection window. If your mesh or proxy version is using smaller windows, increasing to 1 MiB (1,048,576 bytes) allows more data to be in-flight, improving throughput.

The connection window size should be larger than the stream window size, typically 2-4x. This allows multiple streams to transfer data simultaneously without exhausting the connection-level window.

## Configuring Connection Keep-Alive (PING frames)

HTTP/2 supports PING frames for keep-alive. These are useful for detecting dead connections early and keeping connections alive through NAT gateways and load balancers:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: h2-keepalive
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
      cluster:
        service: backend.production.svc.cluster.local
    patch:
      operation: MERGE
      value:
        typed_extension_protocol_options:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            '@type': type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicit_http_config:
              http2_protocol_options:
                connection_keepalive:
                  interval: 30s
                  timeout: 5s
```

This sends a PING frame every 30 seconds and waits up to 5 seconds for a response. If no response comes, the connection is closed.

## Header Table Size

HTTP/2 uses HPACK compression for headers. The header table size controls how much memory is used for the compression state:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: h2-header-table
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-service
  configPatches:
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
    patch:
      operation: MERGE
      value:
        typed_extension_protocol_options:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            '@type': type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicit_http_config:
              http2_protocol_options:
                hpack_table_size: 8192
```

The default is 4,096 bytes. Increasing it can improve compression efficiency for services with many unique headers, but each connection uses more memory.

## Configuring Inbound HTTP/2 Settings

The examples above configure outbound (client-side) HTTP/2 settings. For inbound (server-side) settings, change the match context:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: inbound-h2-settings
  namespace: production
spec:
  workloadSelector:
    labels:
      app: grpc-service
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
          '@type': type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          http2_protocol_options:
            max_concurrent_streams: 100
            initial_stream_window_size: 1048576
            initial_connection_window_size: 2097152
```

## Verifying HTTP/2 Configuration

Check what HTTP/2 settings Envoy is using:

```bash
# Check cluster-level settings

istioctl proxy-config cluster <pod-name> -n <namespace> --fqdn api-service.production.svc.cluster.local -o json

# Check via Envoy admin
kubectl exec -it <pod-name> -c istio-proxy -- curl -s localhost:15000/config_dump?resource=dynamic_active_clusters
```

Monitor HTTP/2 specific metrics:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep http2
```

Key metrics:
- `http2.streams_active` or `cluster.<cluster>.http2.streams_active` - Active HTTP/2 streams
- `http2.pending_send_bytes` or `cluster.<cluster>.http2.pending_send_bytes` - Bytes waiting to be sent (indicates flow control pressure)
- `http2.header_overflow` or `cluster.<cluster>.http2.header_overflow` - Header overflows

## Practical Recommendations

For gRPC services, check the configured initial stream and connection window sizes before changing them. gRPC messages can be large, and a 64 KiB window creates unnecessary round trips, but current Envoy defaults are already larger than 1 MiB.

For services with many concurrent requests, set max concurrent streams to a reasonable number (100-200) rather than leaving it unlimited. This prevents a single connection from becoming a bottleneck and encourages Envoy to open multiple connections for better load distribution.

For services behind external load balancers, enable HTTP/2 keep-alive PING frames with an interval shorter than the load balancer's idle timeout. This keeps connections alive and detects failures faster.

Getting HTTP/2 settings right can significantly improve throughput and latency in your service mesh. Start by monitoring the default behavior, identify bottlenecks, and then tune the specific settings that matter for your workloads.
