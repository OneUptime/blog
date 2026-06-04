# Validation Summary: How to configure Envoy health checks for backend endpoints

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Envoy active health checking
- Envoy HTTP, TCP, and gRPC health checks
- Envoy outlier detection
- Envoy health check event logging
- Envoy Prometheus metrics

## Sources Consulted
- Envoy HealthCheck v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- Envoy health checking architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking
- Envoy OutlierDetection v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Envoy outlier detection architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy health check file event sink API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/health_check/event_sinks/file/v3/file.proto
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy admin statistics Prometheus endpoint reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy stats tag extraction reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/metrics/v3/stats.proto.html

## Issues Found
- Fixed the HTTP `expected_statuses` range from `end: 299` to `end: 300` because Envoy uses half-open `Int64Range` semantics.
- Clarified that HTTP responses outside `expected_statuses` and `retriable_statuses` mark a host unhealthy immediately, so `unhealthy_threshold` does not apply to every HTTP failure.
- Fixed the TCP health check payloads from plain strings to hex-encoded payload text, as Envoy `Payload.text` expects hex.
- Replaced deprecated `event_log_path` usage with the current `event_logger` file sink extension configuration.
- Corrected `interval_jitter` semantics: Envoy adds random jitter up to the configured duration, so `10s` with `2s` jitter produces `10-12s`, not `8-12s`.
- Corrected `no_traffic_interval` wording to describe clusters that have not yet routed traffic, rather than individual hosts receiving no traffic.
- Replaced the invalid `health_checker` field with the supported HTTP `service_name_matcher` option for health check identity validation.
- Corrected TLS health check wording and snippet to reflect that health checks use the cluster transport socket and can override health-check TLS options.
- Updated Prometheus alert annotations to use Envoy's default extracted cluster label name, `envoy_cluster_name`.

## Review Notes
The post is now technically accurate for current Envoy v3 configuration. The examples are partial snippets, so a reader still needs to place them in a complete Envoy bootstrap or xDS resource before validating them with `envoy --mode validate`.
