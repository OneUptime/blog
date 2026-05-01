# How to Configure an Envoy Listener to Bind to a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, IPv4, Listeners, Proxy, Service Mesh, XDS

Description: Configure an Envoy proxy listener to accept connections on a specific IPv4 address and port using static bootstrap configuration.

## Introduction

Envoy's listener configuration defines the entry points for incoming traffic. Binding a listener to a specific IPv4 address rather than the wildcard ensures only connections on the intended interface are accepted-useful in multi-homed environments and Kubernetes sidecars.

## Static Bootstrap Configuration

Envoy uses YAML configuration files. Here is a complete listener bound to a specific IPv4 address:

```yaml
# /etc/envoy/envoy.yaml

static_resources:
  listeners:
    - name: main_listener
      # Bind to specific IPv4 address and port
      address:
        socket_address:
          protocol: TCP
          address: 203.0.113.10   # Example IPv4; replace with an address assigned to the host (use 0.0.0.0 for all)
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
                    - name: local_service
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: backend_cluster
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: backend_cluster
      connect_timeout: 5s
      type: STATIC
      load_assignment:
        cluster_name: backend_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 192.168.1.10
                      port_value: 8080
              - endpoint:
                  address:
                    socket_address:
                      address: 192.168.1.11
                      port_value: 8080

admin:
  address:
    socket_address:
      address: 127.0.0.1    # Admin only on localhost
      port_value: 9901
```

## Multiple Listeners on Different IPv4 Addresses

```yaml
static_resources:
  listeners:
    # Add matching cluster definitions under static_resources.clusters
    # Public listener
    - name: public_listener
      address:
        socket_address:
          address: 203.0.113.10  # Replace with an IPv4 assigned to the public interface
          port_value: 80
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: public_http
                route_config:
                  name: public_route
                  virtual_hosts:
                    - name: public
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route: { cluster: public_backend }
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

    # Internal admin listener
    - name: admin_listener
      address:
        socket_address:
          address: 10.0.0.1    # Replace with an IPv4 assigned to the internal interface
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: admin_http
                route_config:
                  name: admin_route
                  virtual_hosts:
                    - name: admin
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route: { cluster: admin_backend }
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Starting and Verifying Envoy

```bash
# Validate configuration

envoy --mode validate -c /etc/envoy/envoy.yaml

# Start Envoy
envoy -c /etc/envoy/envoy.yaml

# Or via Docker with host networking (Linux, or Docker Desktop 4.34+ with host networking enabled)
docker run -d --name envoy \
  --network host \
  -v /etc/envoy/envoy.yaml:/etc/envoy/envoy.yaml:ro \
  envoyproxy/envoy:v1.38-latest \
  -c /etc/envoy/envoy.yaml

# Verify listener is bound
sudo ss -tlnp | grep ':8080'

# Check Envoy admin API
curl -s http://127.0.0.1:9901/listeners?format=json
# Expected: listener_statuses includes main_listener with local_address 203.0.113.10:8080
```

## Conclusion

Envoy listeners bind to IPv4 addresses via the `socket_address` block with an explicit `address` field. Use `0.0.0.0` for all interfaces or a specific IPv4 address to restrict to one interface. The admin API at `127.0.0.1:9901` provides introspection into active listeners and their configuration without restarting Envoy.
