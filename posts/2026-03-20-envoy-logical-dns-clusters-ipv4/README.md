# How to Set Up Envoy Logical DNS Clusters for IPv4 Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, DNS, IPv4, Logical DNS, Cluster, Service Mesh, Configuration

Description: Learn how to configure Envoy LOGICAL_DNS clusters to resolve IPv4 service addresses at connect time for services with frequently changing IPs.

---

Envoy supports several cluster discovery types. `LOGICAL_DNS` uses asynchronous DNS refresh like `STRICT_DNS`, but treats the result as a single logical host and uses the first returned IP address when a new connection needs to be initiated. That makes it suitable for services like CDNs or external APIs where DNS answers change over time.

## STRICT_DNS vs LOGICAL_DNS

| Feature | STRICT_DNS | LOGICAL_DNS |
|---------|-----------|-------------|
| Resolution timing | Periodic background refresh | Periodic background refresh; new connections use the first returned IP |
| Multiple A records | Creates one endpoint per IP | Uses the first returned IP for new connections |
| Best for | Services where all returned IPs should be load balanced | External services, CDNs |
| DNS TTL respected | Only if `respect_dns_ttl` is enabled | Only if `respect_dns_ttl` is enabled |

## Configuring a LOGICAL_DNS Cluster

```yaml
# envoy-config.yaml

static_resources:
  clusters:
    - name: external_api
      # LOGICAL_DNS: keep one logical host; new connections use the first IP from the latest DNS result
      type: LOGICAL_DNS
      dns_lookup_family: V4_PREFERRED   # Prefer IPv4, fall back to IPv6 if needed
      connect_timeout: 5s
      load_assignment:
        cluster_name: external_api
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      # Hostname - refreshed asynchronously; new connections use the latest first returned IP
                      address: api.external-service.com
                      port_value: 443
      # TLS configuration for HTTPS to the external service
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
          sni: api.external-service.com
```

## When to Use LOGICAL_DNS

Use `LOGICAL_DNS` when:
- The upstream is reached through a hostname, especially when DNS answers can change over time.
- You want new connections to use the latest first returned address without draining existing connections.
- You don't want Envoy to treat every IP from round-robin DNS as a separate load-balanced host.

## Combining LOGICAL_DNS with Health Checks

```yaml
clusters:
  - name: payment_service
    type: LOGICAL_DNS
    dns_lookup_family: V4_ONLY
    connect_timeout: 3s
    health_checks:
      - timeout: 2s
        interval: 10s
        unhealthy_threshold: 3
        healthy_threshold: 1
        http_health_check:
          path: /health
    load_assignment:
      cluster_name: payment_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: payments.internal
                    port_value: 8080
```

## Monitoring DNS Resolution

```bash
# View active upstream hosts in the cluster
curl -s http://localhost:9901/clusters | grep external_api

# Check service-discovery update stats for the cluster
curl -s http://localhost:9901/stats | grep 'cluster.external_api.*update_'

# Dump the full cluster status as JSON
curl -s 'http://localhost:9901/clusters?format=json&filter=^external_api$' | python3 -m json.tool
```

## Full Listener + LOGICAL_DNS Example

```yaml
static_resources:
  listeners:
    - name: proxy_listener
      address:
        socket_address: { address: 0.0.0.0, port_value: 8080 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: proxy
                route_config:
                  virtual_hosts:
                    - name: api_route
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route:
                            cluster: external_api
                            host_rewrite_literal: api.service.com
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: external_api
      type: LOGICAL_DNS
      dns_lookup_family: V4_PREFERRED
      connect_timeout: 5s
      load_assignment:
        cluster_name: external_api
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: api.service.com
                      port_value: 80

admin:
  address:
    socket_address: { address: 127.0.0.1, port_value: 9901 }
```

## Key Takeaways

- `LOGICAL_DNS` refreshes DNS asynchronously and uses the first returned IP for new connections, making it useful for external services whose DNS answers change over time.
- Set `dns_lookup_family: V4_ONLY` to require IPv4, or `V4_PREFERRED` to prefer IPv4 and fall back to IPv6.
- Unlike `STRICT_DNS`, `LOGICAL_DNS` treats the DNS result as a single logical host instead of balancing across all returned IPs.
- Monitor discovery via `/clusters` and the cluster's `update_*` stats in the Envoy admin API.
