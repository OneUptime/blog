# Validation Summary: How to Configure Apache Traffic Server OpenTelemetry Tracing Plugin

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Apache Traffic Server
- Apache Traffic Server OpenTelemetry Tracer plugin
- OpenTelemetry Collector
- OTLP HTTP trace export
- B3 trace propagation

## Sources Consulted
- Apache Traffic Server 9.2 OpenTelemetry Tracer Plugin documentation: https://docs.trafficserver.apache.org/en/9.2.x/admin-guide/plugins/otel_tracer.en.html
- Apache Traffic Server latest OpenTelemetry Tracer Plugin documentation: https://docs.trafficserver.apache.org/admin-guide/plugins/otel_tracer.en.html
- Apache Traffic Server 9.2 plugin documentation: https://docs.trafficserver.apache.org/en/9.2.x/admin-guide/plugins/index.en.html
- Apache Traffic Server traffic_ctl documentation: https://docs.trafficserver.apache.org/en/latest/appendices/command-line/traffic_ctl.en.html
- Apache Traffic Server otel_tracer source: https://github.com/apache/trafficserver/blob/master/plugins/experimental/otel_tracer/otel_tracer.cc
- Apache Traffic Server otel_tracer common source: https://github.com/apache/trafficserver/blob/master/plugins/experimental/otel_tracer/tracer_common.h
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The post described a YAML configuration file for `otel_tracer`. The official ATS plugin is configured with `plugin.config` command-line options (`-u`, `-s`, `-r`, and in newer ATS versions `-q`, `-d`, `-b`), so the example was replaced with supported plugin arguments.
- The post configured OTLP gRPC on port 4317. The ATS plugin uses the OTLP HTTP exporter, so the Collector receiver example was changed to an OTLP HTTP endpoint on port 4318 and the plugin URL was changed to `/v1/traces`.
- The post claimed the plugin creates separate spans for ATS phases such as cache lookup and origin fetch. The plugin creates one server span for the transaction, so the phase examples were revised to describe transaction-level spans.
- The post listed cache and origin span attributes that the stock plugin does not emit. The attribute list was replaced with attributes present in the plugin source, including `http.method`, `http.url`, `http.route`, `http.host`, `http.user_agent`, `http.scheme`, `net.host.port`, and `http.status_code`.
- The post claimed the plugin injects W3C `traceparent` and `tracestate` headers. The official docs and source show B3 propagation, so the propagation section was corrected to B3 headers.
- The Collector filter processor example used an older `spans.exclude` shape. It was updated to the documented OTTL `traces.span` syntax.
- The verification command `traffic_ctl plugin msg otel_tracer status` implied the plugin has a status message handler. The ATS command sends lifecycle messages only to plugins that implement the hook, and `otel_tracer` does not document such a status message, so the example was replaced with `traffic_ctl server status`.

## Review Notes
The plugin is experimental in the ATS documentation. Cache hit ratio should still be tracked with ATS metrics or access logs unless a deployment adds custom instrumentation that emits cache attributes into spans.
