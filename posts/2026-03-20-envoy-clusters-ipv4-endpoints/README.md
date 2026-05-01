# How to Configure Envoy Clusters with IPv4 Upstream Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Cluster, IPv4, Endpoint, Load Balancing, Upstream

Description: Configure Envoy clusters to define IPv4 upstream endpoints with load balancing, health checks, and connection pool settings for HTTP and TCP traffic.

## Introduction

In Envoy, a "cluster" defines a group of upstream servers (endpoints) that receive proxied requests. In this guide, each upstream endpoint is either an IPv4 address:port pair or a hostname that resolves to IPv4 addresses. Clusters control load balancing policy, health checking, TLS settings, and connection pool behavior.

## Static Cluster with IPv4 Endpoints

```yaml
# /etc/envoy/envoy.yaml

static_resources:
  clusters:
    - name: my_service
      # connect_timeout: max time to establish TCP connection
      connect_timeout: 5s

      # STATIC: use hardcoded IPv4 endpoints
      type: STATIC

      # Load balancing policy
      lb_policy: ROUND_ROBIN

      load_assignment:
        cluster_name: my_service
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
              - endpoint:
                  address:
                    socket_address:
                      address: 192.168.1.12
                      port_value: 8080
```

## Cluster with HTTP/2 and Connection Pooling

```yaml
clusters:
  - name: grpc_service
    connect_timeout: 5s
    type: STATIC
    lb_policy: LEAST_REQUEST

    # HTTP/2 protocol for gRPC backends
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        explicit_http_config:
          http2_protocol_options: {}

    # Upstream connection/request limits
    circuit_breakers:
      thresholds:
        - priority: DEFAULT
          max_connections: 1024
          max_pending_requests: 1024
          max_requests: 1024
          max_retries: 3

    load_assignment:
      cluster_name: grpc_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: 192.168.2.10
                    port_value: 9090
```

## DNS-Based Cluster (Strict DNS Semantics)

Resolve hostnames to IPv4 addresses at runtime:

```yaml
clusters:
  - name: dynamic_service
    connect_timeout: 5s

    cluster_type:
      name: envoy.clusters.dns
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
        # Resolve only IPv4 addresses
        dns_lookup_family: V4_ONLY
        # false = each resolved address becomes its own host (STRICT_DNS behavior)
        all_addresses_in_single_endpoint: false

    lb_policy: ROUND_ROBIN

    load_assignment:
      cluster_name: dynamic_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: my-service.internal   # Resolved to IPv4 addresses
                    port_value: 8080
```

## Active Health Checking

```yaml
clusters:
  - name: healthy_service
    connect_timeout: 5s
    type: STATIC
    lb_policy: ROUND_ROBIN

    # HTTP health checks
    health_checks:
      - timeout: 5s
        interval: 10s
        unhealthy_threshold: 3
        healthy_threshold: 2      # After becoming unhealthy, require 2 successes to recover
        http_health_check:
          path: /health
          expected_statuses:
            - start: 200
              end: 300

    load_assignment:
      cluster_name: healthy_service
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
```

## Verifying Cluster State

```bash
# View cluster endpoint health via Envoy admin API

curl http://127.0.0.1:9901/clusters

# Get detailed cluster stats
curl http://127.0.0.1:9901/stats?filter=cluster.my_service

# Check endpoint health status
curl http://127.0.0.1:9901/clusters | grep -E "my_service.*health_flags"

# List all configured clusters
curl http://127.0.0.1:9901/config_dump | jq '.configs[] | select(.["@type"] | contains("ClustersConfigDump"))'
```

## Conclusion

Envoy clusters define IPv4 upstream endpoints with precise control over load balancing, health checking, and connection behavior. Use `STATIC` type for known IPs, and a DNS cluster with strict-DNS semantics for hostname-based discovery with `V4_ONLY` resolution. Configure `circuit_breakers` for upstream connection and request limits. The admin API at `/clusters` provides real-time visibility into endpoint health and traffic statistics.
