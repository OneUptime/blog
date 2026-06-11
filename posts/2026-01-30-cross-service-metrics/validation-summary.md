# Validation Summary: How to Build Cross-Service Metrics

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry Collector
- Prometheus and PromQL
- Istio Telemetry API
- Linkerd proxy metrics
- TypeScript/Node.js
- Express middleware
- Service mesh observability
- W3C Trace Context

## Sources Consulted
- OpenTelemetry JavaScript SDK for Node.js documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JS SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript API span interface: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/span.ts
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API metrics customization task: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Linkerd proxy metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Linkerd exporting metrics documentation: https://linkerd.io/2-edge/tasks/exporting-metrics/
- Prometheus metric and label naming guidance: https://prometheus.io/docs/practices/naming/
- Prometheus instrumentation guidance: https://prometheus.io/docs/practices/instrumentation/
- W3C Trace Context recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The post recommended putting trace IDs in metric labels. This is technically unsafe for Prometheus-style metrics because trace IDs are high-cardinality values. I changed the guidance to propagate trace IDs and use traces or exemplars for correlation instead of ordinary metric labels.
- The trace aggregation example imported `Span` from `@opentelemetry/api` and accessed fields such as `startTime`, `endTime`, `attributes`, `status`, and `name`. The public OpenTelemetry JS `Span` API does not expose exported span data fields. I replaced it with a `CollectedSpan` interface representing span data received by an aggregator and fixed duration calculations to use milliseconds converted to seconds.
- The Express middleware example used deprecated `SemanticAttributes` constants and untyped header values directly as span attributes. I updated it to use current `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION` constants and normalize header values before setting attributes.
- The dependency tracking wrapper imported unused `context` and `Registry` symbols. I removed them so the example remains clean under typical TypeScript lint settings.
- The Linkerd metric names were listed as `linkerd_request_total` and `linkerd_response_latency_ms`, but Linkerd proxy metrics are exposed as `request_total` and `response_latency_ms`. I corrected the table.
- The Istio Telemetry resource used `telemetry.istio.io/v1alpha1`. Current Istio examples and API reference use `telemetry.istio.io/v1`, so I updated the YAML.
- The OpenTelemetry Node setup used the old generic `@opentelemetry/exporter-otlp-http` package for traces, `new Resource(...)`, deprecated `SEMRESATTRS_*` constants, and the deprecated single `metricReader` option. I updated it to current trace and metrics exporter packages, `resourceFromAttributes`, current `ATTR_*` semantic convention constants, and `metricReaders`.
- The custom OpenTelemetry histogram was named `cross_service_request_duration` with unit `ms`, while the PromQL examples queried Prometheus-style duration series. I changed the instrument to `cross_service_request_duration_seconds`, recorded seconds, and updated the PromQL examples to match.
- The async flow example used an invalid expression to get the current span and a magic numeric trace flag. I changed it to `trace.getSpan(context.active())` and `TraceFlags.SAMPLED`.

## Review Notes
- The code snippets are illustrative and still omit production concerns such as timeout enforcement, retry classification, metric cardinality budgets, and collector deployment details.
- I performed a lightweight TypeScript import check against current npm versions of the OpenTelemetry packages used in the corrected snippets.
