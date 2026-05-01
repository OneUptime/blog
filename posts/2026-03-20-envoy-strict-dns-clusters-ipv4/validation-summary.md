# Validation Summary: How to Configure Envoy Strict DNS Clusters with IPv4 Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- DNS-based service discovery
- Envoy cluster configuration
- YAML configuration
- HTTP active health checks
- Envoy admin interface and CLI

## Sources Consulted
- Envoy service discovery overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy cluster configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy DNS cluster configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/clusters/dns/v3/dns_cluster.proto
- Envoy endpoint configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint_components.proto
- Envoy health check proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- Envoy administration interface docs: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy command line options: https://www.envoyproxy.io/docs/envoy/latest/operations/cli.html

## Issues Found
- The original examples used `type: STRICT_DNS` together with top-level `dns_lookup_family` and `dns_refresh_rate`. Envoy’s current cluster API marks those DNS-related top-level fields as deprecated for strict/logical DNS clusters in favor of the `cluster_type` extension point with `envoy.extensions.clusters.dns.v3.DnsCluster`. I updated all YAML examples to the current `cluster_type` and `typed_config` form while preserving strict DNS semantics with `all_addresses_in_single_endpoint: false`.
- The introduction said Envoy updates endpoints "immediately" when DNS changes. Envoy documents strict DNS as asynchronously and eventually consistently refreshed. I changed the wording to say updates happen on the next DNS refresh.
- The basic config comment claimed `dns_refresh_rate` "Respect[s] DNS TTL for refresh timing." That is incorrect unless `respect_dns_ttl` is enabled. I removed that claim and kept the example as an explicit fixed refresh interval.
- The health check example used `expected_statuses` with `start: 200` and `end: 200`. Envoy documents these ranges as half-open, so that range matches nothing. I corrected it to `start: 200` and `end: 201` to match HTTP 200 only.
- The admin API example implied `/clusters` would always be available on `127.0.0.1:9901`, but Envoy only exposes that when the bootstrap config enables the admin interface. I qualified the command comment accordingly.
- The `STRICT_DNS` vs `LOGICAL_DNS` table overstated `LOGICAL_DNS` behavior as "Always 1" endpoint and "one at a time." I updated the wording to match Envoy’s documented behavior: it uses the first returned IP for new connections and does not expand every DNS record into separate endpoints.

## Review Notes
- Reviewed against Envoy latest official documentation as of 2026-05-01.
- The `envoy` binary was not installed in this workspace, so CLI verification was done against the official Envoy command-line documentation rather than local `envoy --help` output.
- The updated YAML examples were sanity-checked for YAML parsing after the edits.
