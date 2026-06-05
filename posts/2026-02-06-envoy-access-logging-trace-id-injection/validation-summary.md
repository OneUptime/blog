# Validation Summary: How to Configure Envoy Proxy Access Logging with OpenTelemetry Trace ID

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Envoy Proxy
- Envoy access logs
- Envoy OpenTelemetry tracer
- Envoy OpenTelemetry access logger
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector stanza operators
- W3C Trace Context

## Sources Consulted
- Envoy access log format rules and command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy OpenTelemetry tracer API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Envoy OpenTelemetry access logger API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/access_loggers/open_telemetry/v3/logs_service.proto
- Envoy OpenTelemetry access logger implementation: https://github.com/envoyproxy/envoy/blob/main/source/extensions/access_loggers/open_telemetry/access_log_impl.cc
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver
- OpenTelemetry Collector regex_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector trace_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/trace_parser.md
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The Envoy file access log example used `trace_id: "%REQ(TRACEPARENT)%"`, which logs the incoming `traceparent` header rather than Envoy's access-log trace ID field. Changed the example to use `trace_id: "%TRACE_ID%"` and added a separate `traceparent: "%REQ(TRACEPARENT)%"` field.
- The Collector regex parser parsed from `attributes.trace_id`, which was misleading once the log has both Envoy's trace ID and the W3C `traceparent` header. Changed it to parse from `attributes.traceparent` and write extracted `trace_id`, `span_id`, and `trace_flags` attributes.
- The OpenTelemetry access logger example used `common_config` with `transport_api_version`. Current Envoy documentation prefers top-level `grpc_service` or `http_service`, and `log_name` is also available at the top level. Updated the snippet to use top-level `log_name` and `grpc_service`.
- The example JSON log showed the full `traceparent` value under `trace_id`. Updated it so `trace_id` contains only the 32-character trace ID and `traceparent` contains the W3C header value.

## Review Notes
The Envoy OpenTelemetry tracer documentation still marks the extension as work-in-progress and not intended for production use. The OpenTelemetry access logger source confirms it sets OTLP log trace context from the active span when available.
