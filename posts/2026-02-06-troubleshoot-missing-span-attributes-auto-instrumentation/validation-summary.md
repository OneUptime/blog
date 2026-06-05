# Validation Summary: How to Troubleshoot Missing Span Attributes When Auto-Instrumentation Drops

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript API diagnostic logging
- OpenTelemetry Collector processors and debug exporter
- OpenTelemetry Operator Instrumentation custom resource
- Kubernetes `kubectl` and `jq`

## Sources Consulted
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry common specification concepts for attribute limits: https://opentelemetry.io/docs/specs/otel/common/
- OpenTelemetry Python SDK `SpanLimits` and span behavior documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector troubleshooting and debug exporter documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Operator automatic instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry JavaScript Node.js troubleshooting documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript API `DiagLogLevel` documentation: https://open-telemetry.github.io/opentelemetry-js/enums/_opentelemetry_api._opentelemetry_api.DiagLogLevel.html

## Issues Found
- The first Python `SpanLimits` example imported only `TracerProvider` but called `trace.SpanLimits`, which would fail because `SpanLimits` is in `opentelemetry.sdk.trace`. Changed the import to `from opentelemetry.sdk.trace import TracerProvider, SpanLimits`.
- The Python span limit examples used the generic `max_attributes` field when the post was specifically discussing span attribute limits. Changed the examples to `max_span_attributes` and `max_span_attribute_length` to match the span-specific SDK configuration and `OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT`.
- The post said over-limit attributes are "extras" that get dropped. Changed this to "some attributes can be dropped" because SDK behavior is limit-based and readers should not assume only newly added custom attributes are affected.
- The post said setting attributes after span end is silently ignored. Changed this to note that the Python SDK ignores it while logging a warning instead of throwing.
- The Kubernetes command used `jsonpath='{.spec.containers[0].env[*]}' | jq .`, which does not produce valid JSON for `jq`. Replaced it with `kubectl get pod ... -o json | jq '.spec.containers[0].env[] | select(.name | test("ATTR|LIMIT"; "i"))'`.
- The debugging section implied SDK debug logging shows all attributes and drop decisions. Narrowed this to SDK warnings and initialization problems, with the Collector debug exporter as the raw payload check.
- The best practices section recommended `otelcol_processor_dropped_spans` for attribute-related drops. Changed it to checking raw span output for dropped attribute count, while treating Collector drop metrics as processor-level span drop signals.

## Review Notes
The Collector filter processor example uses the legacy include/exclude style, which is still documented by component references, while current OpenTelemetry docs increasingly show OTTL examples. A future update could mention OTTL filter syntax, but the existing example remains technically valid as a troubleshooting illustration.
