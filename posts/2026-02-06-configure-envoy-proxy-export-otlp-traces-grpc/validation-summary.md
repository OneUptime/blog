# Validation Summary: How to Configure Envoy Proxy to Export OTLP Traces via gRPC

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Envoy Proxy
- OpenTelemetry
- OTLP over gRPC
- OpenTelemetry Collector
- HTTP/2 upstream clusters
- Distributed tracing and sampling

## Sources Consulted
- Envoy OpenTelemetry tracer API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Envoy HTTP connection manager tracing API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy tracing architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing.html
- Envoy OpenTelemetry resource detector documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/tracers/opentelemetry/resource_detectors/v3/environment_resource_detector.proto
- Envoy upstream HTTP protocol options documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry context propagation documentation: https://opentelemetry.io/docs/concepts/context-propagation/

## Issues Found
- The post said the Envoy OpenTelemetry tracing provider has been stable since Envoy 1.26. Envoy's current API documentation still marks `envoy.tracers.opentelemetry` as work-in-progress and not intended for production use, so the prerequisite and provider description were corrected.
- The post said tracing configuration lives in bootstrap config and the HTTP connection manager. The shown configuration correctly places the provider in the HTTP connection manager and references a Collector cluster, so the explanation was corrected.
- The resource attributes section referred to a `resource_attributes` field. Envoy's OpenTelemetry config uses `resource_detectors`, including the environment resource detector for `OTEL_RESOURCE_ATTRIBUTES`, so the wording was corrected.
- The context propagation section claimed `custom_tags` configure propagation headers. `custom_tags` add span tags; they do not control propagation. The example was replaced with the valid HTTP connection manager `no_context_propagation` setting and wording was adjusted to note that extra propagation formats are tracer-specific.
- The sampling section claimed Envoy respects the W3C `traceparent` sampling flag for client-driven sampling. Envoy's documented client tracing controls are `x-client-trace-id`, `x-envoy-force-trace`, random sampling, and provider samplers, so that claim was corrected.
- The common issues section implied the gRPC `timeout` setting controls how long Envoy waits before dropping trace data from a full trace buffer. Envoy documents `max_cache_size` as the OpenTelemetry span cache limit, so that explanation was corrected.

## Review Notes
The main Envoy cluster configuration uses the current `typed_extension_protocol_options` pattern for HTTP/2 upstream protocol selection, which is appropriate for an OTLP/gRPC Collector cluster. The Collector example uses the current `debug` exporter name; older Collector versions before v0.86.0 used `logging`.
