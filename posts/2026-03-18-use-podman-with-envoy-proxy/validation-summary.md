# Validation Summary: How to Use Podman with Envoy Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Envoy Proxy
- Compose-style multi-container deployment
- Envoy v3 configuration
- Reverse proxying
- Load balancing
- Circuit breaking
- Rate limiting
- Prometheus
- PromQL

## Sources Consulted
- Podman `run` reference: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `compose` reference: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Podman `network create` reference: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `pod create` reference: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Compose Specification, services: https://compose-spec.github.io/compose-spec/05-services.html
- Compose Deploy Specification: https://compose-spec.github.io/compose-spec/deploy.html
- Envoy version history: https://www.envoyproxy.io/docs/envoy/latest/version_history/version_history
- Envoy service discovery overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy supported load balancers: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers.html
- Envoy HTTP local rate limit filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy router filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy access logging: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy HTTP connection manager v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy route components v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy HTTP connection manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The post used `envoyproxy/envoy:v1.29-latest` throughout. Envoy now lists `v1.29` as archived, so I updated the examples to `envoyproxy/envoy:v1.37.2`, which is in the current supported stable line as of May 7, 2026.
- The standalone `podman run` example assumed the upstream names `api` and `web` would resolve automatically, but it did not place Envoy on a shared Podman network with those backends. I added `podman network create app-net`, added `--network app-net` to the run command, and clarified that the backend containers must be on the same DNS-enabled network with matching names or aliases.
- The compose example used `deploy.replicas` for `api` and `web`. The Compose spec documents `deploy` as optional, and Podman documents `podman compose` as a thin wrapper around an external compose provider, so those replica counts are not a reliable portable example. I removed the `deploy` replica blocks.
- The compose bind mount for `envoy.yaml` omitted the SELinux relabel option even though the Podman `run` example used it. I changed the volume to `:ro,Z` so the compose example matches the Podman bind-mount pattern used elsewhere in the post.
- The ring-hash example implied that setting `lb_policy: RING_HASH` alone was sufficient for consistent hashing. Envoy documents that hash-based load balancing is only effective when routing specifies a value to hash on, so I added that clarification.
- The access logging snippet presented `access_log` as if it were top-level alongside `http_filters`. Envoy documents access logging as part of the HTTP connection manager configuration, and the HCM v3 API includes `access_log` on that object. I rewrote the snippet as a valid HCM `typed_config` fragment.

## Review Notes
- The primary reverse-proxy Envoy configuration was validated locally with `envoyproxy/envoy:v1.37.2` using `--mode validate`; the updated snippet parsed successfully.
- Podman is not installed in the review workspace, so Podman-specific commands were checked against the official Podman and Compose documentation rather than executed locally.
- The remaining Envoy snippets are intentionally partial examples rather than full standalone configs, but after the fixes above they are consistent with the current Envoy v3 API and documentation.
