# How to Configure Connection Rate Limiting in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Connection Limiting, Rate Limiting, Envoy, Kubernetes, Security

Description: How to limit the rate of new TCP connections in Istio to protect services from connection floods and resource exhaustion.

---

Connection rate limiting is a different beast from HTTP request rate limiting. While request rate limiting controls how many requests flow over existing connections, connection rate limiting controls how fast new TCP connections can be established. This is important because each new connection consumes resources on both the proxy and your application - file descriptors, memory for connection state, TLS handshake CPU. A connection flood can exhaust these resources even if the actual request rate is reasonable.

## Why Connection Rate Limiting Matters

Consider a scenario where an attacker opens thousands of connections per second to your service. Even if they send only one request per connection, the connection setup cost alone can overwhelm your system. HTTP/1.1 clients that do not reuse connections, poorly configured load balancers, or deliberate slowloris-style attacks all create this pattern.

Connection rate limiting caps how many new connections per second your service accepts. Once the limit is reached, new connection attempts are rejected at the TCP level before any HTTP processing happens.

## Setting Connection Limits with DestinationRule

Istio provides connection pool settings through DestinationRule, which is the simplest way to control connections:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: connection-limits
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 100
```

The `maxConnections` field limits the total number of concurrent TCP connections to the upstream service. This is not exactly rate limiting (it is a concurrency limit), but it prevents connection exhaustion.

The `maxRequestsPerConnection` field forces connection cycling after a certain number of requests, which helps distribute load more evenly.

## Per-Source Connection Limits

To limit connections from specific sources, use DestinationRule with subsets:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: per-source-connection-limits
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
  subsets:
  - name: limited
    labels:
      version: v1
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 50
```

## Using EnvoyFilter for Connection Rate Limiting

For true connection rate limiting (limiting the rate of new connections, not just the total), you need EnvoyFilter. Envoy's connection limit filter provides this capability:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: connection-rate-limit
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
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.network.connection_limit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.connection_limit.v3.ConnectionLimit
          stat_prefix: connection_limiter
          max_connections: 500
          delay: 1s
```

This limits each listener to 500 concurrent connections. New connections beyond this limit are delayed by 1 second before being closed, which helps avoid thundering herd problems.

## Listener-Level Connection Limits

You can also set connection limits at the listener level, which applies before any filter chain processing:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: listener-connection-limit
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
        per_connection_buffer_limit_bytes: 32768
        connection_balance_config:
          exact_balance: {}
```

The `per_connection_buffer_limit_bytes` controls how much memory each connection can use for buffering. The `connection_balance_config` ensures connections are distributed evenly across worker threads.

## Circuit Breakers for Connection Protection

Circuit breakers in Istio provide another layer of connection protection. When too many connections fail, the circuit breaker trips and prevents new connections from being established:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: circuit-breaker-connections
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 3s
      http:
        maxRequestsPerConnection: 50
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

This configuration:
- Limits to 200 concurrent connections
- Sets a 3-second connection timeout
- Forces connection recycling after 50 requests
- Ejects endpoints that return 5 consecutive 5xx errors

## Gateway Connection Limits

For the ingress gateway, connection limits protect the entry point to your mesh:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-connection-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: LISTENER
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        per_connection_buffer_limit_bytes: 65536
  - applyTo: NETWORK_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.network.connection_limit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.connection_limit.v3.ConnectionLimit
          stat_prefix: gateway_connection_limiter
          max_connections: 10000
          delay: 500ms
```

## Tuning HTTP/2 Connection Settings

HTTP/2 multiplexes many requests over a single connection, so connection limits work differently. You can control HTTP/2 specific parameters:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: http2-tuning
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
          http2_protocol_options:
            max_concurrent_streams: 100
            initial_stream_window_size: 65536
            initial_connection_window_size: 1048576
```

`max_concurrent_streams` limits how many concurrent HTTP/2 streams a single connection can have. This prevents a single connection from monopolizing resources.

## Monitoring Connection Metrics

Track connection-related metrics to understand your connection patterns:

```bash
kubectl exec my-service-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "downstream_cx"
```

Key metrics:

```
downstream_cx_active: 45
downstream_cx_total: 12345
downstream_cx_destroy: 12300
downstream_cx_overflow: 0
downstream_cx_protocol_error: 2
```

Also check upstream connection stats:

```bash
kubectl exec my-service-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_cx"
```

For Prometheus queries:

```promql
# Active connections to a service
sum(envoy_cluster_upstream_cx_active{cluster_name="outbound|8080||my-service.default.svc.cluster.local"})

# Connection overflow rate
rate(envoy_cluster_upstream_cx_overflow{cluster_name="outbound|8080||my-service.default.svc.cluster.local"}[5m])
```

## Testing Connection Limits

Use a tool that opens many concurrent connections:

```bash
# Install hey for HTTP load testing
# Send requests with limited connection reuse
hey -n 1000 -c 300 http://my-service.default:8080/api/test
```

If you set `maxConnections: 200`, you should see connection overflow errors when trying to open more than 200 concurrent connections.

Check the overflow counter:

```bash
kubectl exec my-service-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep cx_overflow
```

## Best Practices

1. **Start with DestinationRule** - The `connectionPool` settings cover most needs without the complexity of EnvoyFilter.

2. **Monitor before limiting** - Understand your current connection patterns before setting limits. Check peak concurrent connections and average connection duration.

3. **Set timeouts** - Connection timeouts prevent half-open connections from consuming capacity. Always set `connectTimeout`.

4. **Use circuit breakers together** - Combine connection limits with outlier detection for comprehensive protection.

5. **Account for HTTP/2** - If your services use HTTP/2 or gRPC, focus on stream limits rather than connection limits since many requests share one connection.

## Summary

Connection rate limiting in Istio protects your services from connection floods and resource exhaustion. Start with DestinationRule's `connectionPool` settings for basic concurrency limits, and use EnvoyFilter's connection limit filter when you need more precise control. Combine connection limits with circuit breakers and outlier detection for comprehensive protection. Always monitor your connection metrics to set appropriate limits based on actual traffic patterns.
