# Validation Summary: How to Monitor Consul Service Mesh with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HashiCorp Consul
- Consul service mesh / Connect
- Envoy sidecar proxies
- OpenTelemetry Collector
- Prometheus scraping and service discovery
- OneUptime OTLP ingestion

## Sources Consulted
- HashiCorp Consul agent telemetry documentation: https://developer.hashicorp.com/consul/docs/monitor/telemetry/agent
- HashiCorp Consul telemetry configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/telemetry
- HashiCorp Consul agent metrics API: https://developer.hashicorp.com/consul/api-docs/agent
- HashiCorp Consul agent telemetry metrics reference: https://developer.hashicorp.com/consul/docs/reference/agent/telemetry
- HashiCorp Consul Connect Envoy command reference: https://developer.hashicorp.com/consul/commands/connect/envoy
- HashiCorp Consul sidecar proxy defaults: https://developer.hashicorp.com/consul/docs/connect/proxy/sidecar
- HashiCorp Consul catalog API filtering reference: https://developer.hashicorp.com/consul/api-docs/catalog
- Envoy admin interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Prometheus receiver guidance: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/#prometheus-receiver
- Prometheus configuration and Consul service discovery reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#consul_sd_config
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- The introduction incorrectly said the collector combines Consul metrics with traces from Envoy and referred to Envoy's OpenTelemetry integration. Changed this to Envoy Prometheus metrics, matching the configuration shown in the post.
- The diagram used incorrect scrape paths for Consul and Envoy. Updated them to `/v1/agent/metrics` and `/stats/prometheus`.
- The example Consul metrics included non-documented or incorrect names such as `consul_raft_leader`, `consul_raft_peers`, `consul_catalog_service_count`, and `consul_health_service_checks_critical`. Replaced them with documented Prometheus-form names such as `consul_server_isLeader`, `consul_members_servers`, `consul_state_services`, and `consul_autopilot_healthy`.
- The OneUptime exporter configuration used an outdated endpoint and bearer authorization style. Updated it to the documented `otlphttp` exporter endpoint, JSON encoding, and `x-oneuptime-token` header.
- The Consul metrics sections referenced inaccurate health-check and RPC metric names. Updated the text to use documented Autopilot, state, server RPC, and client RPC metrics.
- The DNS section referenced undocumented stable DNS aggregate metrics. Reworded it to explain that DNS-prefixed metrics may exist in some deployments, but current documented agent telemetry focuses on client API/RPC metrics.
- The Envoy 5xx alert compared an error counter rate directly to `0.05`, which measured errors per second rather than a 5% error ratio. Changed it to divide 5xx request rate by total request rate and use Envoy's documented Prometheus response-code-class label.
- The dynamic Consul service discovery example assumed `connect-proxy` was a Consul tag. Changed it to use the catalog `ServiceKind == "connect-proxy"` filter.
- The Envoy admin port note omitted the default localhost binding behavior. Added the caveat that remote scraping requires changing `-admin-bind` or running the collector in the same network namespace.

## Review Notes
The post remains a high-level monitoring guide rather than a complete production deployment. In a real environment, users may also need ACL tokens, TLS settings, collector target allocation or sharding, and more precise OneUptime alert syntax depending on how alerts are defined in their account.
