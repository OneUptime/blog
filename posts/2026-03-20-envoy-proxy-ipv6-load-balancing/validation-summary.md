# Validation Summary: How to Configure Envoy Proxy for IPv6 Load Balancing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- IPv6
- IPv4/IPv6 dual-stack networking
- Envoy listeners
- Envoy clusters
- Envoy EDS/xDS
- DNS-based service discovery
- HTTP health checks

## Sources Consulted
- Envoy API v3 `SocketAddress` reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/address.proto.html
- Envoy API v3 `Cluster` reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy API v3 `Endpoint` reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint_components.proto
- Envoy service discovery overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy DNS cluster extension reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/clusters/dns/v3/dns_cluster.proto
- Envoy static configuration quick start: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/configuration-static
- Envoy dynamic control plane quick start: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/configuration-dynamic-control-plane
- Envoy CLI reference: https://www.envoyproxy.io/docs/envoy/latest/operations/cli.html
- Local CLI help checked in this environment: `ss --help`, `curl --help all`

## Issues Found
- The IPv6 backend cluster used `type: STRICT_DNS` with literal IP addresses. Envoy’s endpoint and service discovery docs specify that `STATIC`/`EDS` clusters use direct IPs, while `STRICT_DNS`/`LOGICAL_DNS` clusters use hostnames resolved via DNS. I changed the cluster type to `STATIC`.
- Several sample IPv6 addresses were invalid (`2001:db8::server1`, `2001:db8::server2`). I replaced them with valid IPv6 documentation addresses (`2001:db8::1`, `2001:db8::2`).
- The dual-stack listener example referenced `*filter_chains_ref` without defining the YAML anchor, so the snippet was not valid YAML as written. I defined the anchor in the snippet and made the IPv6 listener explicitly `ipv4_compat: false` so the separate IPv4 and IPv6 listeners can coexist on the same port.
- The DNS discovery example used the cluster-level `dns_lookup_family` field on a strict DNS cluster, which Envoy now documents as deprecated in favor of the DNS cluster extension. I updated the snippet to use `cluster_type` with `envoy.extensions.clusters.dns.v3.DnsCluster`.
- The DNS discovery example listed `V6_PREFERRED` as a valid enum value. Current Envoy docs say `V6_PREFERRED` is not an available enum yet; `AUTO` is the current IPv6-first legacy value, and the valid values are `AUTO`, `V4_ONLY`, `V6_ONLY`, `V4_PREFERRED`, and `ALL`. I corrected the options list and removed the invalid enum usage.
- The EDS example set `dns_lookup_family: V6_PREFERRED`, but Envoy documents that DNS lookup family settings are ignored for cluster types other than `STRICT_DNS` and `LOGICAL_DNS`. I removed that field and clarified that the control plane should provide IPv6 endpoints in EDS responses.
- The admin `/clusters` command implied the admin listener was always present, but Envoy requires an explicit admin configuration. I updated the command comment to state that an admin listener is required.
- The EDS snippet referenced `xds_cluster` without indicating it must exist elsewhere in bootstrap configuration. I added that note to prevent the snippet from being read as self-contained.

## Review Notes
- The post remains valid as a guide after these corrections.
- `envoy -c envoy.yaml` was verified against Envoy’s CLI docs, but the `envoy` binary is not installed in this environment, so I could not confirm it via local `envoy --help`.
