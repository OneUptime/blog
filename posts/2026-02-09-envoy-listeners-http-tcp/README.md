# How to configure Envoy listeners for HTTP and TCP traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Networking, Proxy

Description: Learn how to configure Envoy listeners to handle HTTP and TCP traffic with filters, connection management, and protocol-specific settings.

---

Envoy listeners are the foundation of how Envoy receives and processes traffic. Each listener binds to a specific address and port, accepting connections and applying a chain of filters to process the traffic. Understanding how to configure listeners properly is essential for building robust proxy configurations. This guide covers both HTTP and TCP listeners, showing you how to handle different protocols and traffic patterns.

## Understanding Envoy Listeners

A listener represents a named network location where Envoy accepts connections. Each listener consists of:

- An address (IP and port) to bind to
- One or more filter chains that process connections
- Optional connection-level settings like buffer sizes and timeouts
- Protocol-specific configuration for HTTP, TCP, or other protocols

Listeners are the entry point for all traffic into Envoy. They determine what happens to connections before routing them to upstream clusters.

## Basic HTTP Listener Configuration

An HTTP listener uses the HTTP Connection Manager filter to handle HTTP/1.1, HTTP/2, and WebSocket traffic:

```yaml
static_resources:
  listeners:
  - name: http_listener
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
```

The `codec_type: AUTO` setting allows Envoy to automatically detect and handle both HTTP/1.1 and HTTP/2 connections.

## HTTP/2 Configuration

Enable explicit HTTP/2 support with additional settings:

```yaml
listeners:
- name: http2_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 8080
  filter_chains:
  - filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: ingress_http2
        codec_type: HTTP2
        http2_protocol_options:
          max_concurrent_streams: 100
          initial_stream_window_size: 65536
          initial_connection_window_size: 1048576
        route_config:
          name: local_route
          virtual_hosts:
          - name: backend
            domains: ["*"]
            routes:
            - match:
                prefix: "/"
              route:
                cluster: grpc_service
        http_filters:
        - name: envoy.filters.http.router
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

This configuration optimizes HTTP/2 settings for gRPC traffic, adjusting stream and connection window sizes.

## TCP Listener Configuration

TCP listeners forward raw TCP connections without HTTP processing:

```yaml
listeners:
- name: tcp_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 5432
  filter_chains:
  - filters:
    - name: envoy.filters.network.tcp_proxy
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
        stat_prefix: tcp_postgres
        cluster: postgres_cluster
```

This simple TCP proxy forwards all connections on port 5432 to a PostgreSQL cluster without inspecting or modifying the traffic.

## Multiple Filter Chains with SNI Matching

Use multiple filter chains to route traffic based on SNI (Server Name Indication):

```yaml
listeners:
- name: tls_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 443
  listener_filters:
  - name: envoy.filters.listener.tls_inspector
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.listener.tls_inspector.v3.TlsInspector
  filter_chains:
  - filter_chain_match:
      server_names: ["api.example.com"]
    filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: api_https
        route_config:
          name: api_route
          virtual_hosts:
          - name: api
            domains: ["api.example.com"]
            routes:
            - match:
                prefix: "/"
              route:
                cluster: api_service
        http_filters:
        - name: envoy.filters.http.router
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
        common_tls_context:
          tls_certificates:
          - certificate_chain:
              filename: "/etc/envoy/certs/api.crt"
            private_key:
              filename: "/etc/envoy/certs/api.key"

  - filter_chain_match:
      server_names: ["web.example.com"]
    filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: web_https
        route_config:
          name: web_route
          virtual_hosts:
          - name: web
            domains: ["web.example.com"]
            routes:
            - match:
                prefix: "/"
              route:
                cluster: web_service
        http_filters:
        - name: envoy.filters.http.router
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
        common_tls_context:
          tls_certificates:
          - certificate_chain:
              filename: "/etc/envoy/certs/web.crt"
            private_key:
              filename: "/etc/envoy/certs/web.key"
```

The `tls_inspector` listener filter examines the TLS handshake to extract the SNI value, which is then used to select the appropriate filter chain.

## Connection Management Settings

Configure connection-level timeouts and limits:

```yaml
listeners:
- name: http_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 8080
  per_connection_buffer_limit_bytes: 1048576
  filter_chains:
  - filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: ingress_http
        common_http_protocol_options:
          idle_timeout: 300s
          max_connection_duration: 3600s
          max_headers_count: 100
          max_stream_duration: 0s
        http_protocol_options:
          accept_http_10: true
          default_host_for_http_10: "backend.local"
        stream_idle_timeout: 300s
        request_timeout: 300s
        drain_timeout: 5s
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
```

These settings control:
- `idle_timeout`: Close connections idle for this duration
- `max_connection_duration`: Maximum time a connection can stay open
- `request_timeout`: Maximum time to complete a single request
- `drain_timeout`: Time to wait for connections to close during shutdown

## Transparent Proxying with Original Destination

Use the original destination filter for transparent proxying:

```yaml
listeners:
- name: transparent_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 15001
  transparent: true
  use_original_dst: true
  filter_chains:
  - filters:
    - name: envoy.filters.network.tcp_proxy
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
        stat_prefix: transparent_tcp
        cluster: passthrough_cluster

clusters:
- name: passthrough_cluster
  connect_timeout: 5s
  type: ORIGINAL_DST
  lb_policy: CLUSTER_PROVIDED
```

This configuration intercepts traffic transparently and forwards it to the original destination without requiring explicit routing rules.

## Proxy Protocol Support

Handle proxy protocol headers from upstream load balancers:

```yaml
listeners:
- name: proxy_protocol_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 8080
  listener_filters:
  - name: envoy.filters.listener.proxy_protocol
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
  filter_chains:
  - filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: ingress_http
        use_remote_address: true
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
```

The `use_remote_address: true` setting ensures Envoy uses the client IP from the proxy protocol header.

## Mixed HTTP and TCP Listener

Handle both HTTP and generic TCP traffic on the same port using protocol detection:

```yaml
listeners:
- name: mixed_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 8080
  listener_filters:
  - name: envoy.filters.listener.http_inspector
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.listener.http_inspector.v3.HttpInspector
  filter_chains:
  - filter_chain_match:
      application_protocols: ["http/1.1", "h2c"]
    filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: http_traffic
        route_config:
          name: http_route
          virtual_hosts:
          - name: http_backend
            domains: ["*"]
            routes:
            - match:
                prefix: "/"
              route:
                cluster: http_service
        http_filters:
        - name: envoy.filters.http.router
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  - filters:
    - name: envoy.filters.network.tcp_proxy
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
        stat_prefix: tcp_traffic
        cluster: tcp_service
```

The `http_inspector` listener filter examines the first few bytes of data to determine if the connection is HTTP or raw TCP.

## Listener Connection Balancing

Configure connection balancing for better load distribution:

```yaml
listeners:
- name: balanced_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 8080
  connection_balance_config:
    exact_balance: {}
  filter_chains:
  - filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: balanced_http
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
```

The `exact_balance` setting distributes new connections evenly across worker threads.

## Monitoring Listener Metrics

Track these key listener metrics:

```promql
# Total connections accepted
envoy_listener_downstream_cx_total

# Active connections
envoy_listener_downstream_cx_active

# Connection errors
envoy_listener_downstream_cx_transport_socket_connect_timeout

# Bytes received and sent
envoy_listener_downstream_cx_rx_bytes_total
envoy_listener_downstream_cx_tx_bytes_total
```

Create alerts for listener issues:

```yaml
groups:
- name: envoy_listener_alerts
  rules:
  - alert: EnvoyListenerConnectionErrors
    expr: rate(envoy_listener_downstream_cx_transport_socket_connect_timeout[5m]) > 0.01
    annotations:
      summary: "Listener {{ $labels.listener_address }} has connection errors"

  - alert: EnvoyListenerHighConnectionRate
    expr: rate(envoy_listener_downstream_cx_total[5m]) > 1000
    annotations:
      summary: "Listener {{ $labels.listener_address }} has high connection rate"
```

## Debugging Listener Configuration

Use the admin interface to debug listener configuration:

```bash
# Get listener configuration
curl http://localhost:9901/config_dump | jq '.configs[1]'

# Get listener statistics
curl http://localhost:9901/stats | grep listener

# Check listener details
curl http://localhost:9901/listeners
```

Enable debug logging for listeners:

```yaml
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
  access_log:
  - name: envoy.access_loggers.file
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.access_loggers.file.v3.FileAccessLog
      path: /dev/stdout
```

## Conclusion

Envoy listeners provide flexible configuration for handling both HTTP and TCP traffic. Use HTTP Connection Manager for application-layer routing and protocol features, and TCP proxy for simple connection forwarding. Combine multiple filter chains with protocol detection and SNI matching to handle diverse traffic patterns on a single port. Configure connection management settings to optimize resource usage and implement appropriate timeouts. Monitor listener metrics to track connection behavior and diagnose issues quickly.
