# Validation Summary: How to Set Up Envoy Logical DNS Clusters for IPv4 Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- DNS service discovery
- IPv4 and DNS lookup policy configuration
- YAML configuration
- TLS upstream configuration
- Envoy admin interface and cluster statistics

## Sources Consulted
- Envoy service discovery overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy endpoint API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint_components.proto
- Envoy admin interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy static configuration quick start: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/configuration-static

## Issues Found
- The post stated that `LOGICAL_DNS` resolves the hostname "at connection time." Envoy's documentation describes `LOGICAL_DNS` as using asynchronous DNS refresh, then using the first returned IP when a new connection is needed. I corrected the description, comparison table, inline comments, and key takeaways to match that behavior.
- The comparison table implied that DNS TTLs are always respected. Envoy only uses record TTLs for refresh timing when `respect_dns_ttl` is enabled, so I corrected that claim.
- The post treated `V4_PREFERRED` as if it guarantees IPv4. In current Envoy docs, `V4_PREFERRED` prefers IPv4 and falls back to IPv6 if no IPv4 records are returned, while `V4_ONLY` requires IPv4. I clarified that distinction in the takeaways.
- The monitoring section used `grep logical_dns` on `/stats`, which would not reliably surface the cluster's DNS discovery counters, and described `/config_dump` as cluster status output. I changed the commands to use the cluster's `update_*` stats and `/clusters?format=json`, which matches Envoy's admin documentation.
- The full listener example proxied to a named external upstream but did not rewrite the upstream `Host` header. I added `host_rewrite_literal`, matching Envoy's own static-configuration example for routing to a specific external hostname.

## Review Notes
- The post's `type: LOGICAL_DNS` and `dns_lookup_family` examples remain valid and are still shown in Envoy's current quick-start documentation, even though parts of the broader DNS cluster configuration surface are being evolved through the `cluster_type` extension path.
