# How to Configure Envoy Strict DNS Clusters with IPv4 Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Strict DNS, IPv4, Cluster, Service Discovery, Dynamic

Description: Configure Envoy STRICT_DNS clusters to continuously resolve hostnames to IPv4 endpoint addresses, automatically updating the load balancing pool when DNS records change.

## Introduction

`STRICT_DNS` clusters in Envoy continuously resolve DNS names and use all returned IPv4 A records as endpoints. When DNS changes, Envoy updates its endpoint list on the next DNS refresh, making it ideal for services that scale in and out.

## STRICT_DNS vs LOGICAL_DNS

| Feature | STRICT_DNS | LOGICAL_DNS |
|---|---|---|
| Uses all A records | Yes | No (uses the first returned IP for new connections) |
| Endpoint count | Matches DNS record count | Does not expand to one endpoint per DNS record |
| Use case | Multi-instance backends | Single resolved endpoint |

## Basic STRICT_DNS Configuration

```yaml
# /etc/envoy/envoy.yaml

static_resources:
  clusters:
    - name: web_service
      connect_timeout: 5s
      # Strict DNS semantics: each returned address becomes its own endpoint
      cluster_type:
        name: envoy.clusters.dns
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
          dns_lookup_family: V4_ONLY   # Only A records (IPv4)
          all_addresses_in_single_endpoint: false
          dns_refresh_rate: 10s
      lb_policy: ROUND_ROBIN

      load_assignment:
        cluster_name: web_service
        endpoints:
          - lb_endpoints:
              # All A records for this hostname become endpoints
              - endpoint:
                  address:
                    socket_address:
                      address: web.service.internal
                      port_value: 8080
```

## Multiple Hostname Endpoints

Combine multiple hostnames in one cluster:

```yaml
clusters:
  - name: multi_region_service
    cluster_type:
      name: envoy.clusters.dns
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
        dns_lookup_family: V4_ONLY
        all_addresses_in_single_endpoint: false
    lb_policy: ROUND_ROBIN

    load_assignment:
      cluster_name: multi_region_service
      endpoints:
        # Group 1: US-East backends
        - locality:
            region: us-east-1
          lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: us-east.service.internal
                    port_value: 8080
        # Group 2: US-West backends
        - locality:
            region: us-west-2
          lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: us-west.service.internal
                    port_value: 8080
```

## STRICT_DNS with Health Checks

Active health checking eliminates unhealthy endpoints automatically:

```yaml
clusters:
  - name: healthy_dns_service
    cluster_type:
      name: envoy.clusters.dns
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
        dns_lookup_family: V4_ONLY
        all_addresses_in_single_endpoint: false
        dns_refresh_rate: 5s
    lb_policy: ROUND_ROBIN

    # HTTP health check all resolved endpoints
    health_checks:
      - timeout: 3s
        interval: 10s
        unhealthy_threshold: 2
        healthy_threshold: 1
        http_health_check:
          path: /ready
          expected_statuses:
            - start: 200
              end: 201

    load_assignment:
      cluster_name: healthy_dns_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: service.k8s.local
                    port_value: 8080
```

## Watching DNS Changes

```bash
# Start Envoy and watch endpoint changes

envoy -c /etc/envoy/envoy.yaml --log-level debug 2>&1 | \
  grep -Ei 'DNS|endpoint|strict_dns'

# If the bootstrap enables the admin interface on 127.0.0.1:9901,
# check current endpoints via the admin API
curl http://127.0.0.1:9901/clusters | grep web_service

# Simulate DNS update: update the DNS A record
# Envoy will detect the change on the next configured DNS refresh
```

## Conclusion

Envoy `STRICT_DNS` clusters provide dynamic IPv4 endpoint discovery directly from DNS A records. Combined with `dns_lookup_family: V4_ONLY`, all endpoints are guaranteed to be IPv4. Use `dns_refresh_rate` to control how quickly Envoy reacts to DNS changes and add health checks to automatically exclude unhealthy instances from the resolved set.
