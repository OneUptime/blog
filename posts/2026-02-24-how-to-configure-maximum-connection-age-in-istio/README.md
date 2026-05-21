# How to Configure Maximum Connection Age in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Connection Age, Load Balancing, Envoy, gRPC

Description: How to configure maximum connection age in Istio to improve load balancing for HTTP/2 and gRPC services and prevent stale connections.

---

Long-lived connections are a common problem with HTTP/2 and gRPC. A single HTTP/2 connection can multiplex hundreds of concurrent streams, which means all those requests can stay on the same established network path for a long time. When you scale up, new pods may receive little traffic until clients or proxies create new connections. Maximum connection age helps by forcing connections to be recycled periodically.

## The Core Problem

Picture this: you have a gRPC service with 3 replicas. Your client opens one HTTP/2 connection to the service. Without an L7 proxy doing request-level balancing, all requests can flow through that single connection to a single backend pod. You scale up to 6 replicas because of increased load, but the 3 new pods receive little or no traffic until new connections are created.

This happens because HTTP/2 connection multiplexing is a client-side decision. The client sees one healthy connection and keeps using it. Kubernetes Service load balancing is connection-oriented, not per-request. Istio's Envoy sidecars can load balance HTTP and gRPC at request level, but upstream HTTP/2 connection pools can still keep connections around for a long time.

## Setting Maximum Requests Per Connection

One direct way to limit connection reuse in Istio is through `maxRequestsPerConnection` in a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-service-dr
spec:
  host: grpc-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 1000
        h2UpgradePolicy: DEFAULT
```

After 1000 requests on an upstream connection, Envoy drains that connection and creates a new one when more requests need to be sent. The new connection goes through load balancing again and might land on a different backend pod.

The right number depends on your traffic patterns. Too low and you waste time on connection setup. Too high and you defeat the purpose. For most services, something between 100 and 10,000 works well.

## Using HTTP Idle Timeout

The `idleTimeout` closes connections that have been idle for a specified duration:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service-dr
spec:
  host: api-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        idleTimeout: 300s
```

This is different from max requests - it closes connections based on inactivity rather than request count. It's useful for cleaning up connections that are kept alive but rarely used.

## Envoy's Connection Max Age via EnvoyFilter

For more precise control over downstream connection age, you can use an EnvoyFilter to set Envoy's HTTP connection manager `max_connection_duration` directly. This closes downstream HTTP connections after a fixed amount of time regardless of how many requests have been sent:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: max-connection-duration
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
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
          name: envoy.filters.network.http_connection_manager
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            common_http_protocol_options:
              max_connection_duration: 600s
```

This tells Envoy to close any inbound HTTP connection after 600 seconds (10 minutes). For HTTP/2, Envoy sends a GOAWAY frame, giving clients time to finish in-flight requests before the connection is torn down.

For outbound upstream connections, use `maxConnectionDuration` in the DestinationRule connection pool:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: outbound-max-connection-duration
spec:
  host: grpc-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnectionDuration: 600s
```

## The GOAWAY Frame

When Envoy closes an HTTP/2 connection due to max age, it doesn't just drop it. It sends a GOAWAY frame that tells the client:

1. Stop sending new requests on this connection
2. Finish any in-flight requests
3. Open a new connection for future requests

This makes the transition smooth. Well-behaved HTTP/2 and gRPC clients handle GOAWAY by opening a new connection for new streams. Retries still depend on the client's retry policy and whether the RPC is safe to retry.

## Configuring for gRPC Specifically

gRPC is the most common use case for connection age limits because gRPC uses persistent HTTP/2 connections by default. Here's a complete configuration for a gRPC service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-service-complete
spec:
  host: grpc-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
        maxConnectionDuration: 600s
        tcpKeepalive:
          time: 300s
          interval: 30s
          probes: 3
      http:
        h2UpgradePolicy: DEFAULT
        http2MaxRequests: 1000
        maxRequestsPerConnection: 5000
        idleTimeout: 600s
    loadBalancer:
      simple: LEAST_REQUEST
```

Combined with a LEAST_REQUEST load balancer, this ensures:
- Connections are recycled after 10 minutes or 5000 requests
- Idle connections are closed after 10 minutes
- New connections are directed to the least loaded backends
- TCP keep-alive detects dead connections

## Adding Random Jitter

If many clients all recycle their connections at the same time, you can get a thundering herd effect. Adding jitter to the connection duration helps spread out reconnections.

Unfortunately, Istio doesn't have a built-in jitter setting for connection age. You can work around this by using slightly different maxRequestsPerConnection values for different services, or by adding jitter at the application level:

```yaml
# Different values for different deployments

# Deployment A
connectionPool:
  http:
    maxRequestsPerConnection: 950

# Deployment B
connectionPool:
  http:
    maxRequestsPerConnection: 1050
```

## Monitoring Connection Age

Track connection durations to verify your settings are working:

```bash
# Check average connection duration
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_cx_length_ms

# Check active connections
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_cx_active

# Check how many connections were closed
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_cx_destroy
```

In Prometheus:

```promql
# 95th percentile connection lifetime
histogram_quantile(0.95,
  sum by (le) (rate(envoy_cluster_upstream_cx_length_ms_bucket[5m])))

# Connection creation rate (should increase with lower max age)
rate(envoy_cluster_upstream_cx_total[5m])
```

A healthy setup shows a steady connection creation rate that matches your expected recycling frequency. If you set `maxRequestsPerConnection: 1000` and a single upstream connection is carrying 100 RPS, that connection should be recycled roughly every 10 seconds.

## Impact on Latency

Recycling connections has a small cost. Each new connection requires a TCP handshake (and TLS handshake if mTLS is enabled). In Istio with mTLS, a new connection takes a few milliseconds.

For most services, this overhead is negligible compared to the benefit of better load distribution. But for latency-sensitive services doing thousands of requests per second, test the impact before setting aggressive connection age limits.

```bash
# Measure connection setup time
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_cx_connect_ms
```

If connection setup times are high (>10ms), you might want less aggressive recycling. If they're under 2ms (typical for in-cluster mTLS), you can recycle more frequently without noticing.

The right connection age depends on your specific workload. Start with something reasonable like 1000-5000 requests per connection, monitor your load distribution, and adjust from there.
