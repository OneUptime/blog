# Validation Summary: How to Set Up Envoy Health Checks for IPv4 Cluster Members

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- Envoy active health checking
- YAML configuration
- HTTP health checks
- TCP health checks
- gRPC health checks
- Envoy admin interface and stats

## Sources Consulted
- Envoy health checking overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking
- Envoy `config.core.v3.HealthCheck` API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto.html
- Envoy endpoint and `HealthCheckConfig` API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint_components.proto
- Envoy cluster health check docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_hc
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy admin interface reference for `/clusters` and `/stats`: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/

## Issues Found
- The HTTP `expected_statuses` range used `end: 299`, but Envoy ranges use half-open semantics, so that excluded HTTP 299. I changed it to `end: 300` to correctly cover 200-299.
- The gRPC example said an empty `service_name` checks "all services." In the standard gRPC health protocol, the empty string represents overall server health. I corrected the comment to match that behavior.
- The monitoring section documented `healthy` as `/healthy`, but Envoy’s plain-text `/clusters` output uses `health_flags::healthy` for a healthy host. I corrected that flag value.
- The monitoring section described `/pending_active_hc` as "health check in progress," but Envoy documents it as a host awaiting its first active health check. I corrected that description.
- The monitoring section listed `cluster.web_cluster.health_check.degraded`, which is not a documented cluster health-check stat. I replaced the stats command and metric list with documented cluster health-check counters and membership gauges.

## Review Notes
- The gRPC example already uses the current `typed_extension_protocol_options` pattern, which is the modern replacement for deprecated cluster-level HTTP protocol fields.
- Envoy also provides a dedicated Redis custom health checker, but the post’s TCP `PING`/`PONG` example remains technically valid for demonstrating protocol-specific TCP health checks.
