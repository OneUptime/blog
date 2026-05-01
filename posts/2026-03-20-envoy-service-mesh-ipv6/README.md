# How to Configure Envoy Service Mesh with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, IPv6, Service Mesh, XDS, Proxy, Networking

Description: A guide to configuring Envoy proxy in a service mesh for IPv6 traffic, including listener configuration, cluster DNS resolution, and EDS with IPv6 endpoints.

Envoy Proxy is the data plane for many service meshes (Istio, Consul Connect, AWS App Mesh). Properly configured, Envoy handles IPv6 traffic natively. This guide covers static and dynamic (xDS) Envoy configurations for IPv6.

## Static Envoy Configuration with IPv6 Listener

```yaml
# envoy-ipv6.yaml - static configuration

static_resources:
  listeners:
    - name: listener_ipv6
      # Listen on all IPv6 addresses (also accepts IPv4 via IPv4-mapped)
      address:
        socket_address:
          address: "::"
          port_value: 10000
          ipv4_compat: true    # Accept IPv4 connections on IPv6 socket
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                codec_type: AUTO
                stat_prefix: ingress_http
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
      # Use IPv6-only DNS resolution
      dns_lookup_family: V6_ONLY    # or ALL for dual-stack
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: backend_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: backend.default.svc.cluster.local
                      port_value: 8080

admin:
  address:
    socket_address:
      address: "::1"
      port_value: 9901
```

## Static Envoy with Explicit IPv6 Endpoints

```yaml
clusters:
  - name: ipv6_backends
    type: STATIC
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: ipv6_backends
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: "fd00::10"
                    port_value: 8080
            - endpoint:
                address:
                  socket_address:
                    address: "fd00::11"
                    port_value: 8080
            - endpoint:
                address:
                  socket_address:
                    address: "fd00::12"
                    port_value: 8080
```

## Dynamic xDS with IPv6 Endpoints (EDS)

```yaml
# EDS response with IPv6 endpoint addresses

# Sent from xDS management server to Envoy

version_info: "1"
type_url: type.googleapis.com/envoy.config.endpoint.v3.ClusterLoadAssignment
nonce: "1"
resources:
  - "@type": type.googleapis.com/envoy.config.endpoint.v3.ClusterLoadAssignment
    cluster_name: my_service
    endpoints:
      - locality:
          region: us-east-1
          zone: us-east-1a
        lb_endpoints:
          - endpoint:
              address:
                socket_address:
                  address: "2001:db8::10"
                  port_value: 8080
              health_check_config:
                port_value: 8080
          - endpoint:
              address:
                socket_address:
                  address: "2001:db8::11"
                  port_value: 8080
```

## Envoy with TLS over IPv6

```yaml
clusters:
  - name: secure_backend_ipv6
    type: STRICT_DNS
    dns_lookup_family: V6_ONLY
    lb_policy: ROUND_ROBIN
    transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
        sni: backend.example.com
        common_tls_context:
          tls_certificates:
            - certificate_chain:
                filename: /certs/client.crt
              private_key:
                filename: /certs/client.key
          validation_context:
            trusted_ca:
              filename: /certs/ca.crt
    load_assignment:
      cluster_name: secure_backend_ipv6
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: backend.example.com
                    port_value: 443
```

## Health Checking IPv6 Endpoints

```yaml
clusters:
  - name: ipv6_backend
    type: STATIC
    lb_policy: ROUND_ROBIN
    # Active health checking over IPv6
    health_checks:
      - timeout: 1s
        interval: 10s
        unhealthy_threshold: 3
        healthy_threshold: 2
        http_health_check:
          path: "/healthz"
    load_assignment:
      cluster_name: ipv6_backend
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: "fd00::10"
                    port_value: 8080
```

## Running and Verifying Envoy IPv6

```bash
# Run Envoy with IPv6 config
envoy -c /etc/envoy/envoy-ipv6.yaml

# Or in Docker with IPv6
docker run -d \
  --name envoy \
  --sysctl net.ipv6.conf.all.disable_ipv6=0 \
  -p 10000:10000 \
  -v $(pwd)/envoy-ipv6.yaml:/etc/envoy/envoy.yaml \
  envoyproxy/envoy:v1.37.2

# Test IPv6 connectivity through Envoy
curl -6 http://[::1]:10000/

# Check Envoy admin (local run; the admin listener above binds to ::1)
curl http://[::1]:9901/clusters | grep -A 5 "backend_service"

# Check listeners (local run)
curl http://[::1]:9901/listeners

# View stats for IPv6 traffic (local run)
curl http://[::1]:9901/stats | grep "upstream_cx_total"
```

## dns_lookup_family Options

```yaml
# Options for cluster DNS resolution:
# AUTO: Try IPv6 first, fall back to IPv4 (default)
# V4_ONLY: Only resolve IPv4 A records (not AAAA)
# V6_ONLY: Only resolve IPv6 AAAA queries
# V4_PREFERRED: Prefer IPv4 and only use IPv6 if no IPv4 addresses are returned
# ALL: Return both IPv4 and IPv6 addresses and enable Happy Eyeballs

clusters:
  - name: dual_stack_backend
    type: STRICT_DNS
    dns_lookup_family: ALL    # Use both IPv4 and IPv6 endpoints
```

Envoy's IPv6 support is comprehensive - configure listeners to bind to `::` with `ipv4_compat: true` for dual-stack, set `dns_lookup_family` to `V6_ONLY` for IPv6-only upstream DNS or `ALL` for dual-stack resolution, and include IPv6 addresses directly in static or EDS endpoint configurations.
