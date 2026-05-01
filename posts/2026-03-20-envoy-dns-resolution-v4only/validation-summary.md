# Validation Summary: How to Set Envoy DNS Resolution to V4_ONLY Mode

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- Envoy DNS cluster configuration
- DNS A and AAAA record resolution
- IPv4 and IPv6 networking

## Sources Consulted
- Envoy cluster configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy DNS cluster configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/clusters/dns/v3/dns_cluster.proto
- Envoy service discovery overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy endpoint proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint_components.proto
- Envoy admin interface docs: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy quick start networking note: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/run-envoy
- Envoy dynamic forward proxy DNS cache proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/common/dynamic_forward_proxy/v3/dns_cache.proto

## Issues Found
- The original cluster snippets used `type: STRICT_DNS` together with top-level `dns_lookup_family` and `dns_refresh_rate` fields. Current Envoy docs mark those cluster-level DNS fields as deprecated for strict and logical DNS clusters, so I updated the examples to use `cluster_type` with `envoy.extensions.clusters.dns.v3.DnsCluster`.
- The `dns_min_refresh_rate` example was incorrect for this kind of cluster. That field belongs to the dynamic forward proxy DNS cache configuration, not the standard DNS cluster configuration shown in the post, so I removed it from the example.
- The `AUTO` and `V4_PREFERRED` behavior descriptions were imprecise. I corrected them to match Envoy’s documented fallback semantics: each tries one IP family first and only falls back if that lookup returns no addresses.
- The IPv6 verification command did not actually verify the absence of IPv6 endpoints. I replaced it with an admin `format=json` query plus a grep that surfaces colon-containing IP address fields, so no output correctly indicates no IPv6-resolved endpoints for that cluster.

## Review Notes
The post is now technically correct against the current Envoy v3 API documentation reviewed on 2026-05-01. Envoy still documents strict-DNS and logical-DNS behavior conceptually, but the current preferred API surface for DNS-specific settings is the `cluster_type` extension configuration rather than the deprecated cluster-level DNS fields.
