# How to Handle Rate Limiting for WebSocket Connections in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebSocket, Rate Limiting, Envoy, Real-Time

Description: How to properly configure rate limiting for WebSocket connections in Istio including connection limits, message throttling, and upgrade handling.

---

WebSocket connections are fundamentally different from regular HTTP requests. A single WebSocket connection can live for hours and carry thousands of messages, while an HTTP request is typically short-lived. This means traditional request-based rate limiting does not directly apply. You need to think about rate limiting at the connection level (how many WebSocket connections a client can open) and at the message level (how much data can flow over those connections).

## WebSocket Support in Istio

Istio supports WebSocket connections through Envoy. When a client sends an HTTP Upgrade request for WebSocket, Envoy handles the upgrade and maintains the long-lived connection. You need to make sure your VirtualService and Gateway are configured to allow WebSocket traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: ws-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "ws.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-service
  namespace: default
spec:
  hosts:
  - "ws.example.com"
  gateways:
  - ws-gateway
  http:
  - match:
    - uri:
        prefix: /ws
    route:
    - destination:
        host: websocket-service
        port:
          number: 8080
    timeout: 0s
```

Setting `timeout: 0s` is important for WebSocket connections because the default timeout would kill long-lived connections.

## Connection-Level Rate Limiting

The most important rate limiting for WebSockets is limiting the number of concurrent connections. Use circuit breaking through DestinationRules:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ws-connection-limits
  namespace: default
spec:
  host: websocket-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
```

`maxConnections: 1000` limits total concurrent TCP connections to the WebSocket service. Since each WebSocket client uses one TCP connection, this effectively limits concurrent WebSocket clients. `http1MaxPendingRequests: 100` limits how many connection upgrade requests can queue up.

## Per-Client Connection Limiting

To limit the number of WebSocket connections per client IP, use a combination of the rate limit service and connection tracking:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: websocket
    descriptors:
    - key: remote_address
      rate_limit:
        unit: minute
        requests_per_unit: 5
```

This limits each client IP to 5 WebSocket upgrade requests per minute. Since the upgrade is a single HTTP request, this is effectively a connection establishment rate limit.

Configure the EnvoyFilter to check rate limits on upgrade requests:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ws-ratelimit-filter
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
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: websocket
          failure_mode_deny: false
          timeout: 0.5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
  - applyTo: CLUSTER
    match:
      context: GATEWAY
    patch:
      operation: ADD
      value:
        name: rate_limit_cluster
        type: STRICT_DNS
        connect_timeout: 0.5s
        lb_policy: ROUND_ROBIN
        protocol_selection: USE_CONFIGURED_PROTOCOL
        http2_protocol_options: {}
        load_assignment:
          cluster_name: rate_limit_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit.rate-limit.svc.cluster.local
                    port_value: 8081
---
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ws-ratelimit-actions
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: VIRTUAL_HOST
    match:
      context: GATEWAY
      routeConfiguration:
        vhost:
          name: ""
          route:
            action: ANY
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - remote_address: {}
```

## Connection Duration Limits

Long-lived WebSocket connections can hold resources indefinitely. Set maximum connection durations using Envoy's connection management:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ws-connection-duration
  namespace: default
spec:
  workloadSelector:
    labels:
      app: websocket-service
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
          stream_idle_timeout: 3600s
          request_timeout: 0s
```

The `stream_idle_timeout: 3600s` closes WebSocket connections that have been idle (no messages in either direction) for one hour. The `request_timeout: 0s` disables the request timeout so active WebSocket connections are not interrupted.

## Bandwidth Throttling

While Envoy does not have per-connection bandwidth throttling built into the HTTP filter chain for WebSocket frames specifically, you can use connection-level rate limiting to control overall throughput.

For bandwidth control, use the network-level rate limit filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ws-bandwidth-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: websocket-service
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
        name: envoy.filters.network.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.local_ratelimit.v3.LocalRateLimit
          stat_prefix: ws_network_rate_limit
          token_bucket:
            max_tokens: 1048576
            tokens_per_fill: 524288
            fill_interval: 1s
```

This limits the network-level throughput at the byte level. The token bucket is configured in bytes, giving you approximately 512KB per second per connection.

## Monitoring WebSocket Rate Limiting

Track WebSocket-specific metrics:

```bash
# Connection count
kubectl exec deploy/websocket-service -c istio-proxy -- curl -s localhost:15000/stats | grep downstream_cx_active

# Rate limit stats
kubectl exec deploy/istio-ingressgateway -n istio-system -c istio-proxy -- curl -s localhost:15000/stats | grep "ratelimit.*websocket"
```

Use Prometheus to track concurrent WebSocket connections over time:

```promql
sum(envoy_cluster_upstream_cx_active{cluster_name="outbound|8080||websocket-service.default.svc.cluster.local"})
```

## Handling WebSocket Reconnection Storms

When a backend service restarts, all WebSocket clients disconnect and immediately try to reconnect. This creates a "thundering herd" problem. Use the connection rate limit (5 connections per minute per IP) to smooth this out. Clients should implement exponential backoff:

```javascript
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.retryDelay = 1000;
    this.maxRetryDelay = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.retryDelay = 1000;
    };
    this.ws.onclose = () => {
      const jitter = Math.random() * 1000;
      setTimeout(() => this.connect(), this.retryDelay + jitter);
      this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay);
    };
  }
}
```

The jitter is important. Without it, all clients retry at the same intervals and create repeated spikes.

## Testing WebSocket Rate Limits

Use a WebSocket testing tool like wscat:

```bash
# Install wscat
npm install -g wscat

# Open multiple connections rapidly
for i in $(seq 1 10); do
  wscat -c ws://ws.example.com/ws &
done
```

You should see the first 5 connections succeed and the rest get rejected with 429 responses (based on the 5 per minute per IP limit).

## Summary

Rate limiting WebSocket connections in Istio requires thinking about connections rather than requests. Use DestinationRule circuit breaking for overall connection limits, the global rate limit service with remote_address descriptors for per-client connection establishment limits, and idle timeouts for cleaning up stale connections. WebSocket reconnection storms are a real production concern, so combine server-side rate limiting with client-side exponential backoff and jitter for the most resilient setup.
