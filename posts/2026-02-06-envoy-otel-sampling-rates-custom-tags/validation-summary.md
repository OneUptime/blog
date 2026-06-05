# Validation Summary: How to Tune Envoy OpenTelemetry Sampling Rates, Max Tag Length, and Custom Tags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy HTTP connection manager tracing
- Envoy OpenTelemetry tracer
- Envoy route-level tracing configuration
- Envoy custom tracing tags
- OpenTelemetry Collector tail sampling processor
- W3C Trace Context

## Sources Consulted
- Envoy HTTP connection manager tracing proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy route tracing proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy custom tag proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/tracing/v3/custom_tag.proto
- Envoy OpenTelemetry tracer proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto
- Envoy HTTP connection manager tracing statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- OpenTelemetry Collector tail sampling processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Envoy OpenTelemetry tracer source for current stats names and traceparent sampled handling: https://github.com/envoyproxy/envoy/tree/main/source/extensions/tracers/opentelemetry

## Issues Found
- The post described Envoy OpenTelemetry tracing as production-ready without qualification. Envoy's official OpenTelemetry tracer documentation currently marks the extension as work-in-progress and not intended for production use, so I added that caveat to the introduction.
- The per-route sampling examples used `overall_sampling` as if it directly set each route's sampling rate. Envoy documents `overall_sampling` as an upper limit after client-directed, forced, and random sampling decisions. I changed those examples to `random_sampling`, which matches the stated route-specific percentages.
- The monitoring section listed `tracing.opentelemetry.timer` as a time-spent metric. Envoy's OpenTelemetry tracer source defines `timer_flushed`, `spans_sent`, and `spans_dropped`; the HCM docs separately define request tracing decision counters. I replaced the incorrect metric with `tracing.opentelemetry.timer_flushed` and added `tracing.opentelemetry.spans_dropped`.

## Review Notes
The snippets are partial Envoy configuration fragments rather than complete bootstrap files, which is acceptable for a focused tuning guide. The custom tag shapes, `max_path_tag_length`, OpenTelemetry Collector tail sampling policy names, W3C `traceparent` sampled flag explanation, and `cluster.<name>.upstream_rq_time` reference match the checked documentation.
