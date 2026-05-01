# How to Configure Envoy Proxy for IPv6 Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, IPv6, Load Balancing, Proxy, Service Mesh, Cloud Native

Description: A guide to configuring Envoy Proxy to listen on IPv6 addresses and load balance traffic to IPv6 and IPv4 backend clusters.

Envoy Proxy supports IPv6 for both listeners (accepting connections) and clusters (connecting to backends). This guide covers configuring Envoy for IPv6 load balancing using the static bootstrap configuration.

## Basic IPv6 Listener

```yaml
# envoy.yaml

static_resources:
  listeners:
  - name: ipv6_listener
    address:
      socket_address:
        # Listen on all IPv6 interfaces (::); with ipv4_compat enabled,
        # also accept IPv4-mapped IPv6 connections.
        address: "::"
        port_value: 8080
        ipv4_compat: true    # Accept IPv4-mapped IPv6 (::ffff:0:0/96)

    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
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
                  cluster: backend_cluster
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## IPv6 Cluster (Backend Pool)

```yaml
  clusters:
  - name: backend_cluster
    connect_timeout: 5s
    type: STATIC
    lb_policy: ROUND_ROBIN

    load_assignment:
      cluster_name: backend_cluster
      endpoints:
      - lb_endpoints:
        # IPv6 backend endpoint
        - endpoint:
            address:
              socket_address:
                address: "2001:db8::1"
                port_value: 8080
        - endpoint:
            address:
              socket_address:
                address: "2001:db8::2"
                port_value: 8080
```

## Dual-Stack Listener (IPv4 and IPv6)

```yaml
  listeners:
  # IPv4 listener
  - name: ipv4_listener
    address:
      socket_address:
        address: "0.0.0.0"
        port_value: 8080
    filter_chains: &filter_chains_ref
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
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
                  cluster: backend_cluster
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  # IPv6 listener
  - name: ipv6_listener
    address:
      socket_address:
        address: "::"
        port_value: 8080
        ipv4_compat: false
    filter_chains: *filter_chains_ref
```

## DNS-Based IPv6 Cluster Discovery

```yaml
  clusters:
  - name: ipv6_cluster
    connect_timeout: 5s
    lb_policy: ROUND_ROBIN
    cluster_type:
      name: envoy.clusters.dns
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
        dns_lookup_family: V6_ONLY    # Resolve AAAA records only
        all_addresses_in_single_endpoint: false    # STRICT_DNS semantics

    # Options: AUTO (default), V4_ONLY, V6_ONLY, V4_PREFERRED, ALL

    load_assignment:
      cluster_name: ipv6_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                # Hostname - Envoy resolves AAAA records due to V6_ONLY
                address: "backend.internal.example.com"
                port_value: 8080
```

## IPv6 Health Checking

```yaml
  clusters:
  - name: ipv6_cluster
    connect_timeout: 5s
    type: STATIC

    health_checks:
    - timeout: 5s
      interval: 10s
      unhealthy_threshold: 2
      healthy_threshold: 2
      http_health_check:
        path: "/health"

    load_assignment:
      cluster_name: ipv6_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: "2001:db8::1"
                port_value: 80
            health_check_config:
              port_value: 8080    # Health check on different port
```

## xDS API for Dynamic IPv6 Configuration

In production, Envoy typically uses xDS APIs (Istio, Consul) for dynamic configuration. Ensure your control plane provides IPv6 endpoint addresses in its EDS responses:

```yaml
# Dynamic cluster via EDS (Endpoint Discovery Service)

clusters:
- name: dynamic_ipv6
  connect_timeout: 5s
  type: EDS
  eds_cluster_config:
    eds_config:
      resource_api_version: V3
      api_config_source:
        api_type: GRPC
        grpc_services:
        - envoy_grpc:
            cluster_name: xds_cluster    # Management server cluster defined elsewhere
```

## Starting Envoy with IPv6 Config

```bash
# Run Envoy with configuration
envoy -c envoy.yaml

# Verify listener is on IPv6
ss -6 -tlnp | grep 8080

# Test IPv6 load balancing
curl -6 http://[::1]:8080/

# Check Envoy admin for cluster health (requires an admin listener)
curl http://127.0.0.1:9901/clusters | grep -A 5 "backend_cluster"
```

Envoy's native IPv6 support in both listeners and cluster configurations makes it well-suited for cloud-native environments where IPv6 is the preferred networking protocol.
