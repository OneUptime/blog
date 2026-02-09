# How to Configure Envoy HTTP/2 and HTTP/3 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, HTTP2, HTTP3, QUIC, Performance, Protocol

Description: Learn how to enable and configure HTTP/2 and HTTP/3 support in Envoy for improved performance, multiplexing, and reduced latency with modern protocol features.

---

Modern HTTP protocols offer significant performance advantages over HTTP/1.1. HTTP/2 provides request multiplexing, header compression, and server push over a single TCP connection. HTTP/3 builds on HTTP/2's features but uses QUIC over UDP instead of TCP, eliminating head-of-line blocking and reducing connection establishment latency. Envoy supports both protocols with extensive configuration options.

Enabling HTTP/2 and HTTP/3 in Envoy requires careful consideration of TLS configuration, protocol negotiation through ALPN (Application-Layer Protocol Negotiation), connection management, and client compatibility. The performance benefits are substantial, but you need to tune settings appropriately for your traffic patterns and ensure clients can fall back gracefully to HTTP/1.1 when needed.

## Configuring HTTP/2 Support

Let's start by enabling HTTP/2 for both downstream (client connections) and upstream (backend connections):

```yaml
# envoy-http2-config.yaml
static_resources:
  listeners:
  - name: https_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 443
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_https
          codec_type: AUTO  # Auto-detect HTTP/1.1 or HTTP/2
          # HTTP/2 protocol options
          http2_protocol_options:
            # Maximum concurrent streams
            max_concurrent_streams: 100
            # Initial stream window size (flow control)
            initial_stream_window_size: 65536  # 64KB
            # Initial connection window size
            initial_connection_window_size: 1048576  # 1MB
            # Allow HTTP/2 metadata frames
            allow_metadata: true
            # Stream error on invalid HTTP headers
            stream_error_on_invalid_http_message: true
            # Maximum frame size
            max_outbound_frames: 10000
            max_outbound_control_frames: 1000
            max_consecutive_inbound_frames_with_empty_payload: 1
            max_inbound_priority_frames_per_stream: 100
            max_inbound_window_update_frames_per_data_frame_sent: 10
          route_config:
            name: local_route
            virtual_hosts:
            - name: backend
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: http2_backend
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
      # TLS configuration with ALPN for HTTP/2
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
          common_tls_context:
            # ALPN protocols (h2 = HTTP/2, http/1.1 = HTTP/1.1)
            alpn_protocols:
            - "h2"
            - "http/1.1"
            tls_certificates:
            - certificate_chain:
                filename: "/etc/envoy/certs/server-cert.pem"
              private_key:
                filename: "/etc/envoy/certs/server-key.pem"
            tls_params:
              tls_minimum_protocol_version: TLSv1_2
              tls_maximum_protocol_version: TLSv1_3
              cipher_suites:
              - "ECDHE-ECDSA-AES128-GCM-SHA256"
              - "ECDHE-RSA-AES128-GCM-SHA256"
              - "ECDHE-ECDSA-AES256-GCM-SHA384"
              - "ECDHE-RSA-AES256-GCM-SHA384"

  clusters:
  - name: http2_backend
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: http2_backend
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend
                port_value: 8443
    # Enable HTTP/2 for upstream connections
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        explicit_http_config:
          http2_protocol_options:
            max_concurrent_streams: 100
            initial_stream_window_size: 65536
            initial_connection_window_size: 1048576
            allow_metadata: false
    # TLS with ALPN for upstream
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
        common_tls_context:
          alpn_protocols:
          - "h2"
          - "http/1.1"
    connect_timeout: 1s
    common_http_protocol_options:
      idle_timeout: 300s

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

The key settings are `http2_protocol_options` for protocol tuning and ALPN protocols in TLS configuration for protocol negotiation.

## Advanced HTTP/2 Configuration

Fine-tune HTTP/2 for high-throughput scenarios:

```yaml
http2_protocol_options:
  # Aggressive settings for high throughput
  max_concurrent_streams: 250
  initial_stream_window_size: 262144  # 256KB
  initial_connection_window_size: 16777216  # 16MB

  # HPACK header compression settings
  hpack_table_size: 4096

  # Allow connect method (for WebSocket over HTTP/2)
  allow_connect: true

  # Allow HTTP/2 metadata
  allow_metadata: true

  # Override stream error behavior
  override_stream_error_on_invalid_http_message: true
  stream_error_on_invalid_http_message: false

  # Connection-level settings
  max_outbound_frames: 50000
  max_outbound_control_frames: 5000
  max_consecutive_inbound_frames_with_empty_payload: 1

  # Priority handling
  max_inbound_priority_frames_per_stream: 100

  # Window update handling
  max_inbound_window_update_frames_per_data_frame_sent: 10

  # Custom settings frame parameters
  custom_settings_parameters:
  - identifier: 0x4
    value: 65536  # SETTINGS_INITIAL_WINDOW_SIZE
```

## Configuring HTTP/3 (QUIC) Support

HTTP/3 requires QUIC configuration on UDP sockets:

```yaml
static_resources:
  listeners:
  # HTTP/3 listener on UDP
  - name: http3_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 443
        protocol: UDP
    # UDP listener config for QUIC
    udp_listener_config:
      quic_options: {}
      downstream_socket_config:
        max_rx_datagram_size: 1500
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http3
          codec_type: HTTP3
          # HTTP/3 protocol options
          http3_protocol_options:
            quic_protocol_options:
              max_concurrent_streams: 100
              initial_stream_window_size: 65536
              initial_connection_window_size: 1048576
            # Allow extended CONNECT for WebTransport
            allow_extended_connect: true
            # Override stream error behavior
            override_stream_error_on_invalid_http_message: false
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
                # Add Alt-Svc header for HTTP/3 discovery
                response_headers_to_add:
                - header:
                    key: "Alt-Svc"
                    value: 'h3=":443"; ma=86400'
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
      # QUIC TLS configuration
      transport_socket:
        name: envoy.transport_sockets.quic
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.quic.v3.QuicDownstreamTransport
          downstream_tls_context:
            common_tls_context:
              alpn_protocols:
              - "h3"
              tls_certificates:
              - certificate_chain:
                  filename: "/etc/envoy/certs/server-cert.pem"
                private_key:
                  filename: "/etc/envoy/certs/server-key.pem"
              tls_params:
                tls_minimum_protocol_version: TLSv1_3
                tls_maximum_protocol_version: TLSv1_3

  # Fallback TCP listener for HTTP/1.1 and HTTP/2
  - name: https_fallback_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 443
        protocol: TCP
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_https
          codec_type: AUTO
          http2_protocol_options:
            max_concurrent_streams: 100
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
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
          common_tls_context:
            alpn_protocols:
            - "h2"
            - "http/1.1"
            tls_certificates:
            - certificate_chain:
                filename: "/etc/envoy/certs/server-cert.pem"
              private_key:
                filename: "/etc/envoy/certs/server-key.pem"

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
    connect_timeout: 1s
```

Note that HTTP/3 requires TLS 1.3 and runs on UDP port 443 alongside TCP for fallback.

## Protocol Selection and Negotiation

Handle multiple protocol versions gracefully:

```yaml
listeners:
- name: multi_protocol_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 443
  filter_chains:
  - filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: ingress_multi
        # Auto-detect protocol based on ALPN
        codec_type: AUTO
        # Support all HTTP versions
        http2_protocol_options:
          max_concurrent_streams: 100
        http3_protocol_options:
          quic_protocol_options:
            max_concurrent_streams: 100
        # Generate Alt-Svc header for HTTP/3 advertisement
        route_config:
          name: local_route
          virtual_hosts:
          - name: backend
            domains: ["*"]
            response_headers_to_add:
            # Tell clients HTTP/3 is available
            - header:
                key: "Alt-Svc"
                value: 'h3=":443"; ma=86400, h2=":443"; ma=86400'
            routes:
            - match:
                prefix: "/"
              route:
                cluster: backend_service
        http_filters:
        - name: envoy.filters.http.router
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
        common_tls_context:
          # Negotiate protocol via ALPN
          alpn_protocols:
          - "h2"
          - "http/1.1"
          tls_certificates:
          - certificate_chain:
              filename: "/etc/envoy/certs/server-cert.pem"
            private_key:
              filename: "/etc/envoy/certs/server-key.pem"
```

## Monitoring HTTP/2 and HTTP/3

Track protocol usage and performance:

```bash
# View HTTP/2 statistics
curl -s http://localhost:9901/stats | grep http2

# Key HTTP/2 metrics:
# http.ingress_https.downstream_cx_http2_total: HTTP/2 connections
# http.ingress_https.downstream_rq_http2_total: HTTP/2 requests
# http.ingress_https.http2.streams_active: active streams
# http.ingress_https.http2.pending_send_bytes: pending send buffer

# View HTTP/3 statistics
curl -s http://localhost:9901/stats | grep http3

# Key HTTP/3 metrics:
# http.ingress_http3.downstream_cx_http3_total: HTTP/3 connections
# http.ingress_http3.downstream_rq_http3_total: HTTP/3 requests
# listener.0.0.0.0_443.http3.packets_received: QUIC packets received
```

Create Prometheus queries for protocol distribution:

```promql
# Protocol usage percentage
sum(rate(envoy_http_downstream_rq_http2_total[5m]))
/
sum(rate(envoy_http_downstream_rq_completed[5m]))

sum(rate(envoy_http_downstream_rq_http3_total[5m]))
/
sum(rate(envoy_http_downstream_rq_completed[5m]))
```

## Testing HTTP/2 and HTTP/3

Test protocol support with curl and HTTP/3-capable clients:

```bash
# Test HTTP/2
curl -v --http2 https://localhost:443/

# Test HTTP/2 prior knowledge (no TLS)
curl -v --http2-prior-knowledge http://localhost:8080/

# Check ALPN negotiation
openssl s_client -alpn h2,http/1.1 -connect localhost:443

# Test HTTP/3 (requires curl with HTTP/3 support)
curl --http3 https://localhost:443/

# Check Alt-Svc header
curl -I https://localhost:443/
```

Load test with h2load:

```bash
# Install h2load (part of nghttp2)
apt-get install nghttp2-client

# Load test HTTP/2
h2load -n 10000 -c 100 -m 10 https://localhost:443/

# Compare with HTTP/1.1
h2load -n 10000 -c 100 -m 1 --h1 https://localhost:443/
```

## Performance Tuning

Optimize for different workload patterns:

```yaml
# High concurrency configuration
http2_protocol_options:
  max_concurrent_streams: 500
  initial_stream_window_size: 524288  # 512KB
  initial_connection_window_size: 33554432  # 32MB

# Low latency configuration
http2_protocol_options:
  max_concurrent_streams: 100
  initial_stream_window_size: 65536  # 64KB
  initial_connection_window_size: 1048576  # 1MB

# Memory constrained configuration
http2_protocol_options:
  max_concurrent_streams: 50
  initial_stream_window_size: 32768  # 32KB
  initial_connection_window_size: 524288  # 512KB
```

## Best Practices

1. **Enable HTTP/2 for both downstream and upstream**: Maximize performance benefits
2. **Set appropriate window sizes**: Balance throughput and memory usage
3. **Limit max_concurrent_streams**: Prevent resource exhaustion
4. **Use TLS 1.2+**: Required for HTTP/2, TLS 1.3 for HTTP/3
5. **Configure ALPN correctly**: Ensures proper protocol negotiation
6. **Monitor protocol adoption**: Track which clients use which protocols
7. **Test fallback paths**: Ensure HTTP/1.1 clients still work
8. **Tune for your workload**: Adjust settings based on request patterns

HTTP/2 and HTTP/3 support in Envoy provides significant performance improvements for modern applications. Proper configuration ensures clients can take advantage of these protocols while maintaining compatibility with older clients.
