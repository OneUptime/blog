# Validation Summary: How to Use OpenTelemetry Feature Flags to Correlate A/B Test Variants

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector span metrics connector
- OpenTelemetry semantic conventions for feature flags
- OpenFeature JavaScript/Node.js SDK
- OpenFeature Python SDK
- OpenFeature OpenTelemetry hooks
- flagd
- Prometheus / PromQL
- Docker

## Sources Consulted
- flagd schema reference: https://flagd.dev/reference/schema/
- flagd fractional operation reference: https://flagd.dev/reference/custom-operations/fractional-operation/
- flagd installation and quick start documentation: https://flagd.dev/installation/ and https://flagd.dev/quick-start/
- flagd Node.js provider documentation: https://flagd.dev/providers/nodejs/
- flagd Python provider documentation: https://flagd.dev/providers/python/
- OpenFeature Evaluation API documentation: https://openfeature.dev/docs/reference/concepts/evaluation-api/
- OpenFeature hooks documentation: https://openfeature.dev/docs/reference/concepts/hooks/
- OpenFeature JavaScript OpenTelemetry hooks README: https://github.com/open-feature/js-sdk-contrib/tree/main/libs/hooks/open-telemetry
- OpenFeature Python OpenTelemetry hook documentation: https://pypi.org/project/openfeature-hooks-opentelemetry/
- OpenTelemetry feature flag semantic conventions: https://opentelemetry.io/docs/specs/semconv/feature-flags/feature-flags-logs/
- OpenTelemetry Collector span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md

## Issues Found
- The JavaScript example used `TracingHook`, but the current OpenFeature JavaScript OpenTelemetry hooks package exposes `SpanEventHook`, `SpanHook`, `EventHook`, and `MetricsHook`. Updated the import and registration to use `SpanEventHook`.
- The post claimed the OpenFeature tracing hook automatically adds feature flag data as span attributes. Current JavaScript and Python hook documentation says the tracing/span-event hooks add feature flag evaluation span events when an active span exists. Updated the explanation and semantic convention attribute names.
- The post relied on `feature_flag.*` span attributes for spanmetrics dimensions. Since those hook-created values are events, not checkout span attributes, updated the examples to set `checkout.flag_variant` explicitly on the checkout span and use that as the spanmetrics dimension.
- The JavaScript and Python examples used basic string evaluation, which returns the flag value such as `classic`, not the symbolic variant key such as `control`. Updated both examples to use detailed evaluation, record the `variant` field for metrics, and route on the returned `value`.
- The Python example passed a plain dictionary as `evaluation_context`. The Python SDK documents `EvaluationContext`, so the snippet now constructs `EvaluationContext(targeting_key=user_id)`.
- The Collector configuration used the deprecated `spanmetrics` component name. Updated it to `span_metrics`.
- The PromQL examples queried `feature_flag_key` and `feature_flag_variant` labels that would not exist on checkout span-derived metrics after the corrected instrumentation. Updated queries and the comparison script to use `checkout_flag_variant`.
- The comparison script could divide by zero if no control series existed. Added a positive-control-latency guard.

## Review Notes
The flagd JSON schema URL, fractional targeting structure, flagd Docker startup pattern, and flagd provider host/port settings were consistent with current documentation. The Prometheus metric names in the post assume the span metrics connector is configured with an empty namespace so the generated Prometheus series are `duration_milliseconds_bucket` and `calls_total`; the corrected Collector snippet now shows that setting explicitly.
