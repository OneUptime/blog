# How to Set Envoy DNS Resolution to V4_ONLY Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, DNS, IPv4, V4_ONLY, Service Mesh, Networking

Description: Configure Envoy to resolve hostnames to IPv4 addresses only using the V4_ONLY dns_lookup_family setting, preventing IPv6 resolution on IPv4-only networks.

## Introduction

By default, Envoy uses `AUTO` DNS resolution, which queries IPv6 first and falls back to IPv4 only if no IPv6 addresses are returned. Setting `dns_lookup_family: V4_ONLY` forces hostname resolution to use only IPv4 (A record) results, essential for IPv4-only backend networks.

## Setting V4_ONLY on a Cluster

```yaml
# /etc/envoy/envoy.yaml

static_resources:
  clusters:
    - name: backend_service
      connect_timeout: 5s
      cluster_type:
        name: envoy.clusters.dns
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
          # STRICT_DNS semantics: each resolved IP becomes its own host
          all_addresses_in_single_endpoint: false
          # V4_ONLY: only resolve A records, ignore AAAA
          dns_lookup_family: V4_ONLY

      lb_policy: ROUND_ROBIN

      load_assignment:
        cluster_name: backend_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      # Hostname resolved to IPv4 only
                      address: api.service.internal
                      port_value: 8080
```

## DNS Lookup Families Compared

| Setting | Behavior |
|---|---|
| `AUTO` | Try IPv6 first, fall back to IPv4 only if no IPv6 addresses are returned |
| `V4_ONLY` | Only resolve A records (IPv4) |
| `V6_ONLY` | Only resolve AAAA records (IPv6) |
| `V4_PREFERRED` | Try IPv4 first, fall back to IPv6 only if no IPv4 addresses are returned |

## Applying V4_ONLY Across Multiple Clusters

```yaml
static_resources:
  clusters:
    - name: user_service
      connect_timeout: 5s
      cluster_type:
        name: envoy.clusters.dns
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
          all_addresses_in_single_endpoint: false
          dns_lookup_family: V4_ONLY   # IPv4 only
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: user_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: users.internal.svc
                      port_value: 8080

    - name: order_service
      connect_timeout: 5s
      cluster_type:
        name: envoy.clusters.dns
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
          all_addresses_in_single_endpoint: false
          dns_lookup_family: V4_ONLY   # IPv4 only
      lb_policy: LEAST_REQUEST
      load_assignment:
        cluster_name: order_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: orders.internal.svc
                      port_value: 8080
```

## DNS Refresh Rate

Control how often Envoy re-resolves hostnames:

```yaml
clusters:
  - name: backend_service
    cluster_type:
      name: envoy.clusters.dns
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
        all_addresses_in_single_endpoint: false
        dns_lookup_family: V4_ONLY
        # Re-resolve DNS every 5 seconds
        dns_refresh_rate: 5s
    load_assignment:
      cluster_name: backend_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: dynamic-service.internal
                    port_value: 8080
```

## Verifying DNS Resolution

```bash
# Check which IPs Envoy resolved for a cluster

curl http://127.0.0.1:9901/clusters | grep backend_service

# Sample output shows IPv4 addresses:
# backend_service::192.168.1.10:8080::cx_active::0
# backend_service::192.168.1.11:8080::cx_active::0

# Verify no IPv6 endpoints
curl -s 'http://127.0.0.1:9901/clusters?filter=^backend_service$&format=json' \
  | grep -E '"address": ".*:.*"'

# No output means Envoy did not resolve any IPv6 addresses for this cluster
```

## Conclusion

Setting `dns_lookup_family: V4_ONLY` on Envoy DNS clusters ensures hostname resolution uses IPv4 addresses only, preventing connection failures on IPv4-only backend networks. Use it for hostname-based endpoints with strict-DNS or logical-DNS semantics, and tune `dns_refresh_rate` for appropriate responsiveness to DNS changes in dynamic environments.
