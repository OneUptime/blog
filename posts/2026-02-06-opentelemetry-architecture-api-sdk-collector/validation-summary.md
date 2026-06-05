# Validation Summary: How to Understand OpenTelemetry Architecture: API, SDK,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry API
- OpenTelemetry SDK for JavaScript/Node.js
- OpenTelemetry Collector
- OTLP over HTTP and gRPC
- Collector YAML configuration
- Docker
- Jaeger
- OneUptime

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Collector exporter component documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry Collector logging-to-debug exporter migration notice: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry JS addSpanProcessor migration issue: https://github.com/open-telemetry/opentelemetry-js-contrib/issues/2645
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Node.js SDK example used `new Resource(...)`, which is no longer exported by current `@opentelemetry/resources` packages. Changed it to `resourceFromAttributes(...)`.
- The resource attributes example used older semantic convention names. Changed it to current `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME` constants.
- The manual span processor example used `provider.addSpanProcessor(processor)`, which was removed in OpenTelemetry JS SDK 2.x. Changed it to pass `spanProcessors: [processor]` to the `NodeTracerProvider` constructor.
- The API example used numeric span status codes. Changed it to `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- Collector examples used the removed `logging` exporter. Changed them to the current `debug` exporter.
- Collector examples used a `jaeger` exporter with port `14250`, which is not listed in the current Collector exporter set. Changed the examples to use an `otlp/jaeger` exporter pointed at a Jaeger OTLP endpoint on port `4317`.
- The OneUptime OTLP HTTP examples omitted the JSON content type where `encoding: json` is used. Added `Content-Type: application/json` and added `encoding: json` to the shorter dual-export example.
- The Collector configuration explanation said there were three sections, but the config also requires a `service` section to wire pipelines. Updated the explanation.
- The Collector buffering explanation implied loss prevention without qualification. Updated it to state that buffering reduces data loss within configured queue limits.

## Review Notes
The Docker command and OTLP port references match the OpenTelemetry documentation. The recommendation to use a Collector in production is consistent with OpenTelemetry JavaScript exporter guidance, though exact Collector deployment mode should still be chosen based on scale, failure domains, and operational requirements.
