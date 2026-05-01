# Validation Summary: How to Configure Envoy Service Mesh with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- IPv6 networking
- xDS / EDS
- DNS-based service discovery
- TLS / mTLS
- Docker

## Sources Consulted
- Envoy `SocketAddress` v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/address.proto
- Envoy `Cluster` v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy service discovery overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy health checking overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking.html
- Envoy xDS transport protocol: https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol.html
- Envoy discovery API (`DiscoveryResponse`): https://www.envoyproxy.io/docs/envoy/latest/api-v3/service/discovery/v3/discovery.proto.html
- Envoy admin interface docs: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/admin.html
- Envoy Docker image docs: https://www.envoyproxy.io/docs/envoy/latest/start/docker
- Envoy version history: https://www.envoyproxy.io/docs/envoy/latest/version_history/version_history
- AWS App Mesh docs: https://docs.aws.amazon.com/app-mesh/latest/userguide/what-is-app-mesh.html

## Issues Found
- The EDS example used invalid IPv6 literals (`2001:db8::backend1` and `2001:db8::backend2`). I replaced them with valid documentation-prefix IPv6 addresses (`2001:db8::10` and `2001:db8::11`).
- The EDS response example omitted top-level `type_url` and `nonce`, which are part of a real `DiscoveryResponse`. I added both fields so the snippet matches the documented xDS response shape.
- The static DNS example suggested `AUTO` for dual-stack behavior. Envoy documents `AUTO` as IPv6-first with IPv4 fallback, while `ALL` returns both families and enables Happy Eyeballs. I corrected the inline comment and tightened the option descriptions.
- The Docker command pinned `envoyproxy/envoy:v1.28.0`, which is an archived release. Envoy’s version history shows `v1.37.2` as the latest supported stable release on April 10, 2026, so I updated the example to `envoyproxy/envoy:v1.37.2`.
- The admin verification command grepped for `ipv6`, which would not match the cluster name shown in the main example. I changed it to `backend_service` and clarified that the admin `curl` commands apply to the local run because the example admin listener binds to `::1`.

## Review Notes
- Envoy’s current docs mark DNS-related `Cluster` fields on `STRICT_DNS` and `LOGICAL_DNS` clusters as deprecated in favor of `cluster_type` with `envoy.clusters.dns` / `DnsCluster`. The post’s examples remain valid and are still consistent with Envoy documentation, but a future refresh could migrate them to the newer extension-based form.
- Envoy’s Docker and networking docs note that IPv6 behavior can vary on non-Linux Docker hosts. The example is reasonable, but readers testing Docker-based IPv6 outside Linux may need host-specific adjustments.
- AWS App Mesh is still a valid example as of May 1, 2026, but AWS has published an end-of-support notice for September 30, 2026.
