# Validation Summary: How to Configure Envoy Proxy OpenTelemetry Tracing with the

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Envoy Proxy
- Envoy OpenTelemetry tracer extension
- OpenTelemetry Protocol (OTLP) over gRPC
- OpenTelemetry Collector
- Docker Compose
- W3C Trace Context propagation
- B3 trace propagation

## Sources Consulted
- Envoy OpenTelemetry tracer API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Envoy tracing architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing.html
- Envoy Zipkin tracer API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/zipkin.proto
- Envoy HTTP connection manager tracing statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry OTLP exporter endpoint configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- Envoy issue confirming OpenTelemetry tracer propagation scope: https://github.com/envoyproxy/envoy/issues/27384

## Issues Found
- The post said the OpenTelemetry tracer generates spans for every request. Envoy tracing is sampling-dependent, so I changed this to sampled requests in the introduction, span explanation, and summary.
- The post described `envoy.tracers.opentelemetry` as replacing older Zipkin and Jaeger integrations. Envoy's official API documentation currently marks the OpenTelemetry tracer as work-in-progress and not intended for production use, so I replaced that claim with the documented caveat.
- The Envoy config exposed port `9901` in Docker Compose and later queried `/stats`, but the Envoy bootstrap did not configure the admin listener. I added an `admin` block listening on `0.0.0.0:9901`.
- The route `decorator` comment said it enabled tracing on the route. In Envoy, the decorator customizes the tracing operation name; tracing is configured on the HTTP connection manager. I corrected the comment and key-pieces list.
- The Docker Compose snippet used the obsolete top-level `version` field. I removed it after `docker compose config` reported the deprecation warning.
- The B3 propagation section repeated the OpenTelemetry tracer config but did not configure B3. Envoy documents B3 + W3C dual propagation as `trace_context_option: USE_B3_WITH_W3C_PROPAGATION` on the Zipkin tracer, not on the OpenTelemetry OTLP gRPC exporter. I replaced the snippet with a note explaining that limitation.
- The span attributes section stated that every request has the listed attributes and that `response_flags` is always present. I changed the language to sampled requests and "can include" / "when present" to avoid overstating implementation-specific span metadata.

## Review Notes
Validated the corrected Envoy configuration with `envoyproxy/envoy:v1.29-latest --mode validate`, validated the Collector configuration with `otel/opentelemetry-collector-contrib:latest validate`, and rendered the Docker Compose file with `docker compose config`. Envoy validation emitted a warning that `internal_address_config` should be configured explicitly because the default trust behavior for RFC1918 addresses is changing in a future release; this is a future-hardening note, not a current correctness failure for the example.
