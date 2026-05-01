# Validation Summary: How to Use V4_PREFERRED DNS Resolution Policy in Envoy

## Status
validated

## Post Type
Guide / Configuration tutorial

## Technologies Covered
- Envoy Proxy
- DNS service discovery
- IPv4 / IPv6 networking
- YAML configuration
- Envoy admin interface

## Sources Consulted
- Envoy cluster configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy DNS cluster configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/clusters/dns/v3/dns_cluster.proto
- Envoy DNS lookup family enum docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/clusters/common/dns/v3/dns.proto
- Envoy service discovery overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy admin interface docs: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy cluster statistics docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy connection pooling / Happy Eyeballs docs: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/connection_pooling

## Issues Found
1. Deprecated DNS-family configuration on DNS clusters: the post configured `dns_lookup_family` directly on a `STRICT_DNS` cluster. Current Envoy docs mark that field as deprecated for logical and strict DNS clusters in favor of configuring `envoy.extensions.clusters.dns.v3.DnsCluster` via `cluster_type`. I updated the examples to use `cluster_type: envoy.clusters.dns` with `dns_lookup_family` in `typed_config`, and set `all_addresses_in_single_endpoint: false` to preserve strict DNS semantics.
2. Incorrect explanation of `V4_ONLY`: the post said `V4_ONLY` was useful when you want to "fail fast if DNS returns AAAA." `V4_ONLY` restricts resolution to IPv4 and fails when no IPv4 addresses are returned. I corrected that explanation.
3. Verification command was too broad: `curl .../stats | grep dns` does not specifically validate DNS-backed cluster resolution and may miss the relevant counters. I changed it to match the documented `cluster.<name>.update_*` stats.
4. Minor accuracy clarifications: I changed a few lines that overstated behavior, including the description's "ensure IPv4" wording, the introductory DNS sentence, the `AUTO` description, and the `ALL` description to reflect Envoy's documented behavior more precisely.

## Review Notes
- The `/clusters` admin endpoint is an appropriate way to inspect discovered upstream hosts and resolved addresses for DNS-backed clusters.
- `AUTO` is currently a legacy Envoy enum name with IPv6-first fallback behavior; the docs state it will be deprecated in favor of `V6_PREFERRED` in a future major API version.
- No additional technical issues found after these fixes.
