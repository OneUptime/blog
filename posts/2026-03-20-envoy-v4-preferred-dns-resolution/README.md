# How to Use V4_PREFERRED DNS Resolution Policy in Envoy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, DNS, IPv4, IPv6, Configuration, Service Mesh, Networking

Description: Learn how to configure Envoy's V4_PREFERRED DNS lookup family to ensure upstream clusters resolve to IPv4 addresses on dual-stack networks.

---

On dual-stack networks, DNS lookups can return both A (IPv4) and AAAA (IPv6) records for the same hostname. Envoy's `dns_lookup_family` setting controls which address family is preferred or required for upstream resolution.

## DNS Lookup Family Options

| Value | Behavior |
|-------|----------|
| `AUTO` | Look up IPv6 first, then fall back to IPv4 |
| `V4_ONLY` | Only use A records (IPv4) |
| `V6_ONLY` | Only use AAAA records (IPv6) |
| `V4_PREFERRED` | Prefer A records; fall back to AAAA if no A records exist |
| `ALL` | Return all addresses (both A and AAAA); enables Happy Eyeballs |

## Setting V4_PREFERRED on a Cluster

For current Envoy APIs, configure `dns_lookup_family` in the cluster's `cluster_type` using `envoy.extensions.clusters.dns.v3.DnsCluster`.

```yaml
# envoy-config.yaml

static_resources:
  clusters:
    - name: my_backend
      connect_timeout: 5s
      cluster_type:
        name: envoy.clusters.dns
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
          dns_lookup_family: V4_PREFERRED   # Prefer IPv4; fall back to IPv6 if needed
          all_addresses_in_single_endpoint: false   # Strict DNS semantics
      load_assignment:
        cluster_name: my_backend
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: backend.internal  # Hostname to resolve
                      port_value: 8080
```

## V4_ONLY for Strictly IPv4 Backends

When your backend is IPv4-only and you want resolution to fail if no A records are returned:

```yaml
clusters:
  - name: ipv4_only_service
    connect_timeout: 5s
    cluster_type:
      name: envoy.clusters.dns
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
        dns_lookup_family: V4_ONLY
        all_addresses_in_single_endpoint: false
    load_assignment:
      cluster_name: ipv4_only_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: legacy-app.internal
                    port_value: 3000
```

## Minimal Full Envoy Config with V4_PREFERRED

```yaml
# envoy-config.yaml
static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 10000
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: local_service
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route: { cluster: my_backend }
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: my_backend
      connect_timeout: 5s
      cluster_type:
        name: envoy.clusters.dns
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster
          dns_lookup_family: V4_PREFERRED
          all_addresses_in_single_endpoint: false
      load_assignment:
        cluster_name: my_backend
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: backend.internal
                      port_value: 8080

admin:
  address:
    socket_address:
      address: 127.0.0.1
      port_value: 9901
```

## Verifying Resolution

```bash
# Check the current cluster endpoints and their resolved IP addresses
curl -s http://localhost:9901/clusters | grep my_backend

# View DNS-driven cluster update stats
curl -s http://localhost:9901/stats | grep 'cluster\.my_backend\..*update_'
```

## Key Takeaways

- Set `dns_lookup_family: V4_PREFERRED` in the cluster's `DnsCluster` config to prefer IPv4 on dual-stack DNS.
- Use `V4_ONLY` when the backend is guaranteed to be IPv4-only.
- `STRICT_DNS` clusters re-resolve the hostname periodically; monitor the admin endpoint for the current resolved addresses.
- Check `curl localhost:9901/clusters` to verify which IP addresses Envoy is using.
