# Validation Summary: How to Create Error Analysis: A Practical Guide to Finding Root Causes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry JavaScript/TypeScript API
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry semantic conventions
- Prometheus and PromQL alerting
- Distributed tracing and error analysis patterns

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript Span API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry trace exceptions specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry Collector tail sampling processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry peer attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/peer/
- OpenTelemetry service resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- Prometheus alerting and recording rules docs: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus PromQL basics and offset modifier docs: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus PromQL operators docs: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The trace query for errors originating in `database-service` also filtered for `span.parentSpanId: null`, which would only match root spans and could exclude the downstream service where the error actually originated. Removed the root-span filter.
- The retry storm detector used the deprecated OpenTelemetry `peer.service` attribute. Updated it to `service.peer.name`, the current replacement named by the OpenTelemetry semantic conventions.
- The partial deployment detector computed error rates from `totalByVersion` without ever populating that map, resulting in invalid divisions. Updated the function to accept all spans, populate totals by `service.version`, and compare rates across all observed versions.
- The middleware example used the deprecated `http.status_code` semantic convention. Updated it to the stable `http.response.status_code` attribute.

## Review Notes
The Prometheus metric names such as `span_errors_total` and `span_total` are presented as application or pipeline-specific examples rather than standard OpenTelemetry metric names. Teams adopting the examples should map them to the metrics emitted by their tracing backend or span-to-metrics pipeline.
