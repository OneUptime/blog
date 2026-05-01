# How to Configure Envoy Proxy with IPv6 Listeners

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Envoy Proxy, Service Mesh, Reverse Proxy, Kubernetes

Description: Configure Envoy Proxy with IPv6 listeners, dual-stack clusters, and proper IPv6 address handling in xDS configuration for service mesh and reverse proxy use cases.

## Introduction

Envoy Proxy is the data plane for Istio and many custom service mesh implementations. It supports IPv6 through IPv6 listener addresses, dual-stack cluster endpoints, and IPv6-aware health checks. This guide covers static Bootstrap configuration for IPv6 and Envoy as a standalone reverse proxy.

## Static Bootstrap Configuration

```yaml
# envoy-ipv6.yaml - Static Envoy config with IPv6

admin:
  address:
    socket_address:
      address: "::1"        # Admin API on IPv6 loopback
      port_value: 9901

static_resources:
  listeners:
    # IPv6 listener for HTTP traffic
    - name: listener_ipv6
      address:
        socket_address:
          address: "::"     # All IPv6 interfaces
          port_value: 8080
          ipv4_compat: true  # Accept IPv4-mapped connections too
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: app
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: app_cluster
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

    # IPv6-only TLS listener
    - name: listener_ipv6_tls
      address:
        socket_address:
          address: "::"
          port_value: 8443
      filter_chains:
        - transport_socket:
            name: envoy.transport_sockets.tls
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
              common_tls_context:
                tls_certificates:
                  - certificate_chain:
                      filename: /etc/envoy/certs/cert.pem
                    private_key:
                      filename: /etc/envoy/certs/key.pem
          filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_https
                route_config:
                  name: secure_route
                  virtual_hosts:
                    - name: secure_app
                      domains: ["app.example.com"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: app_cluster
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    # IPv6 backend cluster
    - name: app_cluster
      type: STATIC
      connect_timeout: 5s
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: app_cluster
        endpoints:
          - lb_endpoints:
              # IPv6 backend endpoints
              - endpoint:
                  address:
                    socket_address:
                      address: "2001:db8::10"
                      port_value: 8080
              - endpoint:
                  address:
                    socket_address:
                      address: "2001:db8::11"
                      port_value: 8080

    # DNS cluster that resolves AAAA records
    - name: dns_cluster
      type: STRICT_DNS
      dns_lookup_family: V6_ONLY   # Only resolve AAAA
      connect_timeout: 5s
      load_assignment:
        cluster_name: dns_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: backend.internal
                      port_value: 8080
```

## Dual-Stack Cluster

```yaml
# Dual-stack cluster: resolve both IPv6 and IPv4 addresses

clusters:
  - name: dual_stack_cluster
    type: STRICT_DNS
    dns_lookup_family: ALL   # Return AAAA and A records; enables Happy Eyeballs
    connect_timeout: 5s
    load_assignment:
      cluster_name: dual_stack_cluster
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: app.example.com
                    port_value: 8080
```

## Health Checks over IPv6

```yaml
# Active health check over IPv6
clusters:
  - name: app_cluster
    type: STATIC
    health_checks:
      - timeout: 5s
        interval: 10s
        unhealthy_threshold: 3
        healthy_threshold: 2
        http_health_check:
          path: /health
    load_assignment:
      cluster_name: app_cluster
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: "2001:db8::10"
                    port_value: 8080
                health_check_config:
                  port_value: 8080
```

## IPv6 in Istio / Service Mesh

When using Envoy as the Istio sidecar, dual-stack IPv6 support is enabled in Istio's install configuration:

```yaml
# IstioOperator dual-stack configuration
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio
  namespace: istio-system
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_DUAL_STACK: "true"
  values:
    pilot:
      env:
        ISTIO_DUAL_STACK: "true"
      ipFamilyPolicy: RequireDualStack
```

## Conclusion

Envoy IPv6 configuration uses `address: "::"` for listener socket addresses and specifies IPv6 addresses directly in cluster endpoint configurations. The `ipv4_compat: true` flag on listeners allows the same socket to accept both IPv4-mapped and native IPv6 connections. For DNS-based dual-stack clusters, set `dns_lookup_family: ALL` to return both AAAA and A records and let Envoy use Happy Eyeballs for upstream connections. In Kubernetes service mesh deployments, ensure the cluster's pod networking supports dual-stack or IPv6 and enable Istio's documented `ISTIO_DUAL_STACK` settings during installation.
