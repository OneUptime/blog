# Validation Summary: How to Configure gRPC with Envoy Proxy for IPv4 Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- gRPC
- HTTP/2
- Docker Compose
- IPv4 and DNS-based service discovery
- gRPC health checking

## Sources Consulted
- Envoy gRPC statistics filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_stats_filter.html
- Envoy gRPC statistics filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/grpc_stats/v3/config.proto
- Envoy cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy upstream HTTP protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy service discovery docs: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy health check API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- Envoy retries and transient failures FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/load_balancing/transient_failures.html
- Envoy installation and Docker image docs: https://www.envoyproxy.io/docs/envoy/latest/start/install.html
- Envoy Docker usage docs: https://www.envoyproxy.io/docs/envoy/latest/start/docker.html
- Docker port publishing docs: https://docs.docker.com/engine/network/port-publishing/
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- AWS App Mesh overview: https://docs.aws.amazon.com/app-mesh/latest/userguide/what-is-app-mesh.html

## Issues Found
- The post used the deprecated cluster-level `http2_protocol_options` field. I replaced it with `typed_extension_protocol_options` using `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`, which is the current Envoy v3 API pattern for explicit upstream HTTP/2 configuration.
- The `grpc_stats` filter example claimed per-method metrics, but the config did not enable them. I added `stats_for_all_methods: true` so the documented `cluster.greeter_cluster.grpc.helloworld.Greeter.SayHello.*` metrics can actually be emitted.
- The cluster was configured as `STRICT_DNS` while pointing at literal IPv4 addresses. Envoy documents `STRICT_DNS` for hostnames, not direct IP endpoints, so I changed the backends to DNS names and added `dns_lookup_family: V4_ONLY` to keep the example explicitly IPv4-oriented.
- The Docker Compose example did not match the Envoy config. The original Compose file defined only one `greeter` service, while the Envoy cluster expected two backends for load balancing. I changed the Compose snippet to `greeter1` and `greeter2` so it matches the Envoy config.
- The Docker Compose snippet used `envoyproxy/envoy:v1.28-latest`, which is not the current stable image line in the official docs. I updated it to `envoyproxy/envoy:v1.37-latest`.
- The admin interface was bound to `127.0.0.1` inside Envoy while the post instructed readers to access it from the host through a published container port. That binding would prevent the host-side `curl` example from working, so I changed the admin listener to `0.0.0.0` and limited the published ports to `127.0.0.1` on the host.
- The retry example omitted `unavailable`, even though Envoy documents it as a supported gRPC retry condition and maps HTTP 502/503/504 to gRPC `UNAVAILABLE`. I added `unavailable` to make the retry example more correct for real gRPC upstream failures.
- The introductory and concluding explanations were updated to reflect the current API names and to describe circuit breakers more precisely as upstream connection/request controls rather than RPC-level behavior.

## Review Notes
- `stats_for_all_methods: true` increases metric cardinality. Envoy's docs warn that this is appropriate only for trusted clients; in higher-cardinality or less trusted environments, `individual_method_stats_allowlist` may be safer.
- The route-level `timeout: 10s` is reasonable for a unary Greeter-style example, but streaming gRPC methods usually need a different timeout strategy.
- AWS App Mesh is still an Envoy-based service mesh as of April 30, 2026, but AWS documents that support ends on September 30, 2026.
- Local runtime validation with Docker was not possible in this workspace because the `docker` CLI was not installed, so the review was completed against official documentation rather than by starting Envoy locally.
