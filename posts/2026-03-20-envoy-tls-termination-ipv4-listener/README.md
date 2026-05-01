# How to Configure Envoy TLS Termination on an IPv4 Listener

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, TLS, SSL, IPv4, HTTPS, Certificate, Security

Description: Configure Envoy to terminate TLS/HTTPS connections on a specific IPv4 listener, handling certificate management and forwarding decrypted traffic to backend clusters.

## Introduction

Envoy terminates TLS at the listener level using a `DownstreamTlsContext`. After decryption, Envoy forwards plain HTTP to backends, centralizing certificate management and offloading cryptographic work.

## TLS Termination Configuration

```yaml
# /etc/envoy/tls-proxy.yaml

static_resources:
  listeners:
    - name: https_listener
      address:
        socket_address:
          address: 203.0.113.10
          port_value: 443

      filter_chains:
        - # TLS context on the filter chain
          transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
              common_tls_context:
                tls_certificates:
                  - certificate_chain:
                      filename: /etc/envoy/certs/server.crt
                    private_key:
                      filename: /etc/envoy/certs/server.key
                tls_params:
                  tls_minimum_protocol_version: TLSv1_2
                  tls_maximum_protocol_version: TLSv1_3
                  cipher_suites:
                    - ECDHE-ECDSA-AES128-GCM-SHA256
                    - ECDHE-RSA-AES128-GCM-SHA256
                    - ECDHE-ECDSA-AES256-GCM-SHA384
                    - ECDHE-RSA-AES256-GCM-SHA384

          filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: https_ingress
                use_remote_address: true
                route_config:
                  name: https_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route: { cluster: backend_cluster }
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

    # HTTP to HTTPS redirect listener
    - name: http_redirect
      address:
        socket_address: { address: 203.0.113.10, port_value: 80 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: http_redirect
                route_config:
                  name: redirect_route
                  virtual_hosts:
                    - name: redirect
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          redirect:
                            https_redirect: true
                            response_code: MOVED_PERMANENTLY
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: backend_cluster
      type: STATIC
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: backend_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: 192.168.1.10, port_value: 8080 }

admin:
  address:
    socket_address: { address: 127.0.0.1, port_value: 9901 }
```

## SNI-Based Certificate Selection

Multiple certificates using SNI:

```yaml
listener_filters:
  - name: envoy.filters.listener.tls_inspector
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.listener.tls_inspector.v3.TlsInspector

filter_chains:
  - filter_chain_match:
      server_names: ["api.example.com"]
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
        common_tls_context:
          tls_certificates:
            - certificate_chain: { filename: /etc/envoy/certs/api.crt }
              private_key: { filename: /etc/envoy/certs/api.key }
    filters: [...]

  - filter_chain_match:
      server_names: ["app.example.com"]
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
        common_tls_context:
          tls_certificates:
            - certificate_chain: { filename: /etc/envoy/certs/app.crt }
              private_key: { filename: /etc/envoy/certs/app.key }
    filters: [...]
```

## Testing TLS

```bash
# Verify TLS negotiation

openssl s_client -connect 203.0.113.10:443 -servername example.com

# Check TLS version and cipher
curl -v https://example.com/ --resolve example.com:443:203.0.113.10 2>&1 | \
  grep -E "SSL|TLS|cipher"

# View TLS stats in Envoy admin
curl http://127.0.0.1:9901/stats | grep ssl
```

## Conclusion

Envoy TLS termination is configured via `DownstreamTlsContext` in the `transport_socket` field of a filter chain. Use `tls_minimum_protocol_version: TLSv1_2` and modern cipher suites for security. SNI-based certificate selection via `filter_chain_match.server_names` allows hosting multiple HTTPS domains on a single IPv4 address. Automatic certificate rotation without restarting Envoy requires SDS or reloading the relevant listener configuration.
