# How to Configure Envoy Connection Pooling for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Performance, Connection Pooling, HTTP, TCP

Description: Learn how to optimize Envoy connection pooling settings for HTTP/1.1, HTTP/2, and TCP connections to improve performance, reduce latency, and manage backend resources efficiently.

---

Connection pooling is one of the most critical performance optimizations in Envoy. Instead of creating a new TCP connection for every request, Envoy maintains pools of persistent connections to upstream services. This eliminates the overhead of TCP handshakes, TLS negotiation, and slow-start congestion control, dramatically reducing latency and improving throughput.

Properly configured connection pools balance several competing concerns: minimizing latency by keeping connections ready, managing memory and file descriptor usage, protecting backends from connection storms, and handling connection lifecycle events like timeouts and failures. The optimal configuration depends on your traffic patterns, backend capacity, and performance requirements.

## Understanding Envoy Connection Pools

Envoy maintains separate connection pools for each upstream cluster, with different characteristics for HTTP/1.1, HTTP/2, and TCP protocols. HTTP/1.1 pools manage multiple connections since each can only handle one request at a time. HTTP/2 pools typically use fewer connections because each supports multiplexing many requests. TCP pools handle raw TCP connections for non-HTTP protocols.

Each connection pool has limits on maximum connections, pending requests, and request timeouts. When a pool reaches its limits, Envoy either queues requests or immediately fails them depending on your configuration. Understanding these limits and how they interact is essential for tuning connection pools effectively.

## Basic Connection Pool Configuration

Let's start with a basic HTTP/1.1 connection pool configuration:

```yaml
# envoy-connection-pool.yaml
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          codec_type: AUTO
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: backend_service
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: backend_service
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: backend_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend
                port_value: 8000
    # HTTP/1.1 connection pool settings
    circuit_breakers:
      thresholds:
      - priority: DEFAULT
        max_connections: 1024
        max_pending_requests: 1024
        max_requests: 1024
        max_retries: 3
    # Connection timeout
    connect_timeout: 1s
    # Common HTTP protocol options
    common_http_protocol_options:
      idle_timeout: 300s
      max_connection_duration: 600s
      max_headers_count: 100
      max_stream_duration: 300s
      headers_with_underscores_action: REJECT_REQUEST
    # HTTP/1.1 specific options
    http_protocol_options:
      accept_http_10: false
      default_host_for_http_10: "backend"
      header_key_format:
        proper_case_words: {}

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

This configuration sets reasonable defaults: 1024 maximum connections, connection timeout of 1 second, and idle timeout of 5 minutes.

## HTTP/2 Connection Pooling

HTTP/2 connection pooling differs significantly because of request multiplexing. You typically need fewer connections:

```yaml
clusters:
- name: backend_http2
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: backend_http2
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend-h2
              port_value: 8443
  # Explicit HTTP/2 configuration
  typed_extension_protocol_options:
    envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
      "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
      explicit_http_config:
        http2_protocol_options:
          # Maximum concurrent streams per connection
          max_concurrent_streams: 100
          # Initial stream window size
          initial_stream_window_size: 65536
          # Initial connection window size
          initial_connection_window_size: 1048576
          # Allow metadata
          allow_metadata: true
          # Maximum frame size
          max_outbound_frames: 10000
          max_outbound_control_frames: 1000
          max_consecutive_inbound_frames_with_empty_payload: 1
          max_inbound_priority_frames_per_stream: 100
          max_inbound_window_update_frames_per_data_frame_sent: 10
          stream_error_on_invalid_http_messaging: true
  # Circuit breakers for HTTP/2
  circuit_breakers:
    thresholds:
    - priority: DEFAULT
      # Fewer connections needed with multiplexing
      max_connections: 100
      # But more concurrent requests
      max_requests: 10000
      max_pending_requests: 1000
      max_retries: 3
  # Connection settings
  connect_timeout: 2s
  common_http_protocol_options:
    idle_timeout: 300s
    max_connection_duration: 3600s
  # TLS for HTTP/2
  transport_socket:
    name: envoy.transport_sockets.tls
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
      common_tls_context:
        alpn_protocols: ["h2"]
```

The key difference is `max_concurrent_streams: 100`, which allows up to 100 requests per connection. This means you can handle 10,000 concurrent requests with just 100 connections.

## Advanced Connection Pool Tuning

For high-traffic scenarios, fine-tune pool behavior based on traffic patterns:

```yaml
clusters:
- name: high_traffic_backend
  type: STRICT_DNS
  lb_policy: LEAST_REQUEST
  # Least request load balancing works well with connection pooling
  least_request_lb_config:
    choice_count: 3
    active_request_bias:
      default_value: 1.0
  load_assignment:
    cluster_name: high_traffic_backend
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend-1
              port_value: 8000
      - endpoint:
          address:
            socket_address:
              address: backend-2
              port_value: 8000
      - endpoint:
          address:
            socket_address:
              address: backend-3
              port_value: 8000
  # Aggressive circuit breaker settings
  circuit_breakers:
    thresholds:
    - priority: DEFAULT
      max_connections: 2048
      max_pending_requests: 2048
      max_requests: 4096
      max_retries: 5
    # Track connection pool budget
    per_host_thresholds:
    - max_connections: 512
      max_pending_requests: 512
  # Connection lifecycle management
  connect_timeout: 500ms
  common_http_protocol_options:
    idle_timeout: 120s
    max_connection_duration: 1800s
    max_requests_per_connection: 10000
  # Upstream connection options
  upstream_connection_options:
    # TCP keepalive to detect dead connections
    tcp_keepalive:
      keepalive_probes: 3
      keepalive_time: 60
      keepalive_interval: 10
  # Drain connections on health check failure
  drain_connections_on_host_removal: true
  # Connection buffer limits
  per_connection_buffer_limit_bytes: 32768
```

## Connection Pool Warmup

Pre-establish connections to reduce latency for the first requests:

```yaml
clusters:
- name: warmed_backend
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: warmed_backend
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend
              port_value: 8000
  # Pre-connect to warm the pool
  preconnect_policy:
    # Number of connections to establish per upstream host
    per_upstream_preconnect_ratio: 1.5
    # Only preconnect if predicted concurrent requests exceed this
    predictive_preconnect_ratio: 0.5
  circuit_breakers:
    thresholds:
    - priority: DEFAULT
      max_connections: 1024
  connect_timeout: 1s
  common_http_protocol_options:
    idle_timeout: 300s
```

The preconnect policy establishes connections before they're needed, eliminating cold-start latency.

## Monitoring Connection Pool Health

Track connection pool metrics to identify issues:

```bash
# View connection pool statistics
curl -s http://localhost:9901/stats | grep -E 'upstream_cx|upstream_rq'

# Key metrics:
# cluster.backend.upstream_cx_total: total connections created
# cluster.backend.upstream_cx_active: currently active connections
# cluster.backend.upstream_cx_http1_total: HTTP/1.1 connections
# cluster.backend.upstream_cx_http2_total: HTTP/2 connections
# cluster.backend.upstream_cx_connect_fail: connection failures
# cluster.backend.upstream_cx_overflow: circuit breaker triggered
# cluster.backend.upstream_cx_max_requests: connections closed due to max requests
# cluster.backend.upstream_rq_pending_total: requests waiting for connections
# cluster.backend.upstream_rq_pending_overflow: pending queue full
```

Create Grafana dashboards to visualize pool utilization:

```promql
# Connection pool utilization
envoy_cluster_upstream_cx_active{cluster="backend"}
/
envoy_cluster_circuit_breakers_default_cx_open{cluster="backend"}

# Pending request queue depth
rate(envoy_cluster_upstream_rq_pending_total{cluster="backend"}[5m])

# Connection churn rate
rate(envoy_cluster_upstream_cx_total{cluster="backend"}[5m])
```

## Connection Pool Failures and Circuit Breaking

When connection pools reach limits, Envoy triggers circuit breakers to protect backends:

```yaml
clusters:
- name: protected_backend
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: protected_backend
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend
              port_value: 8000
  # Circuit breaker configuration
  circuit_breakers:
    thresholds:
    - priority: DEFAULT
      max_connections: 512
      max_pending_requests: 512
      max_requests: 1024
      max_retries: 3
      # Track budget for retries
      retry_budget:
        budget_percent:
          value: 20.0
        min_retry_concurrency: 3
    # Different limits for high priority requests
    - priority: HIGH
      max_connections: 1024
      max_pending_requests: 1024
      max_requests: 2048
  # Connection tracking
  track_timeout_budgets: true
  connect_timeout: 1s
```

Handle circuit breaker events in application code:

```python
# Python example handling Envoy circuit breaker responses
import requests

def call_backend_with_fallback(url):
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 503:
            # Circuit breaker triggered
            if 'x-envoy-overloaded' in response.headers:
                return handle_overload()
        return response.json()
    except requests.exceptions.Timeout:
        return handle_timeout()
    except requests.exceptions.ConnectionError:
        return handle_connection_error()

def handle_overload():
    # Return cached data or degraded response
    return {"status": "degraded", "message": "Service overloaded"}
```

## TCP Connection Pooling

For non-HTTP protocols, use TCP proxy with connection pooling:

```yaml
listeners:
- name: tcp_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9000
  filter_chains:
  - filters:
    - name: envoy.filters.network.tcp_proxy
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
        stat_prefix: tcp_backend
        cluster: tcp_backend
        # Idle timeout for TCP connections
        idle_timeout: 600s

clusters:
- name: tcp_backend
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  load_assignment:
    cluster_name: tcp_backend
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: tcp-backend
              port_value: 6379
  # TCP-specific connection settings
  circuit_breakers:
    thresholds:
    - max_connections: 256
  connect_timeout: 2s
  # TCP keepalive
  upstream_connection_options:
    tcp_keepalive:
      keepalive_probes: 3
      keepalive_time: 300
      keepalive_interval: 60
```

## Connection Pool Best Practices

1. **Start with defaults**: Begin with conservative limits and increase based on monitoring
2. **Match protocol**: HTTP/2 needs fewer connections but higher max_requests
3. **Set keepalives**: TCP keepalive prevents silent connection failures
4. **Monitor overflow**: Watch for circuit breaker triggers indicating insufficient capacity
5. **Tune timeouts**: Balance responsiveness with connection stability
6. **Use preconnect**: Warm pools for latency-sensitive services
7. **Limit connection duration**: Prevent connection leaks with max_connection_duration

Properly tuned connection pools dramatically improve Envoy performance while protecting your backends from overload. Start conservative, monitor metrics carefully, and adjust based on actual traffic patterns.
