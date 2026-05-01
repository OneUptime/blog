# Validation Summary: How to Configure Envoy Clusters with IPv4 Upstream Endpoints

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Envoy Proxy clusters
- Envoy v3 xDS/YAML configuration
- HTTP/2 and gRPC upstream configuration
- DNS-based service discovery
- Envoy active health checks
- Envoy admin API, `curl`, and `jq`

## Sources Consulted
- Envoy API v3: Cluster configuration (proto) — https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy API v3: HTTP Protocol Options (proto) — https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy API v3: DNS cluster configuration (proto) — https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/clusters/dns/v3/dns_cluster.proto
- Envoy docs: Service discovery — https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy API v3: Health check (proto) — https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto.html
- Envoy docs: Administration interface — https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy version history 1.33.0 — https://www.envoyproxy.io/docs/envoy/latest/version_history/v1.33/v1.33.0.html

## Issues Found

1. **The DNS example used a deprecated configuration pattern.** The post configured `dns_lookup_family` directly on a `STRICT_DNS` cluster. Envoy’s official docs deprecate DNS-related `Cluster` fields for strict/logical DNS clusters in favor of `cluster_type` with `DnsCluster`. I updated the example to use `cluster_type`, `envoy.clusters.dns`, `type.googleapis.com/envoy.extensions.clusters.dns.v3.DnsCluster`, and `all_addresses_in_single_endpoint: false` to preserve strict-DNS semantics.

2. **The HTTP health-check status range was off by one.** Envoy’s `expected_statuses` uses half-open `Int64Range` semantics, so `start: 200` and `end: 299` excludes `299`. I changed `end` to `300` so the example correctly accepts the full `200-299` range.

3. **A few explanatory comments overstated Envoy behavior.** The introduction implied every endpoint in the post was always a literal IPv4 address, and the health-check threshold comment implied `healthy_threshold` applied universally. I tightened the wording so it matches current Envoy behavior without changing the structure or intent of the article.

## Review Notes
- Envoy still supports legacy strict-DNS style cluster configuration, but for new examples the current documented path is `cluster_type` with `DnsCluster`.
- The `/config_dump` command shown in the post is valid for inspection, but Envoy documents admin dump JSON as an admin/debug surface rather than a stable automation contract.
