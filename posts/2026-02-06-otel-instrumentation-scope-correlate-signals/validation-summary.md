# Validation Summary: How to Use Instrumentation Scope to Group and Correlate Telemetry by Library

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry instrumentation scope
- OpenTelemetry Python tracing, metrics, and logs APIs
- OTLP telemetry data model
- OpenTelemetry Java instrumentation
- OpenTelemetry Collector filter and transform processors
- OpenTelemetry SDK declarative metric views
- Prometheus/PromQL
- Grafana Tempo TraceQL

## Sources Consulted
- OpenTelemetry instrumentation scope concept docs: https://opentelemetry.io/docs/concepts/instrumentation-scope/
- OpenTelemetry instrumentation scope specification: https://opentelemetry.io/docs/specs/otel/common/instrumentation-scope/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python logs API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/_logs.html
- OpenTelemetry Java instrumentation supported libraries: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry Collector filter processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector OTTL instrumentation scope context docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlscope/README.md
- OpenTelemetry declarative SDK configuration docs: https://opentelemetry.io/docs/specs/otel/configuration/sdk/
- OpenTelemetry declarative metric provider schema: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema/meter_provider.yaml
- OpenTelemetry Collector spanmetrics connector docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Grafana Tempo TraceQL query docs: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/

## Issues Found
- The Python example used `logging.getLogger()` as though it created OpenTelemetry loggers with name and version scope. Updated it to use `opentelemetry._logs.get_logger()` for OpenTelemetry loggers and clarified how bridged Python standard logging records the logger name as the scope name.
- The Python examples used `version=` keyword arguments in places where the documented OpenTelemetry Python global trace/log APIs use positional instrumentation library version parameters. Updated examples to pass the version positionally.
- The OTLP example described strict protocol JSON while using simplified field/value shapes. Reworded it as a simplified OTLP-shaped data model example and changed `resource_spans` / `scope_spans` to protobuf JSON-style `resourceSpans` / `scopeSpans`.
- The Collector filter example used an older `traces.span` configuration shape and `instrumentation_scope.name` paths. Updated it to the current `trace_conditions` style and the documented OTTL `scope.name` path.
- The Collector transform example used `instrumentation_scope.name` and `instrumentation_scope.version`, which are not the current documented OTTL paths. Updated them to `scope.name` and `scope.version`.
- The PromQL examples assumed instrumentation scope labels were automatically present on span metrics and used outdated/non-current spanmetrics metric names. Reworded the setup requirement and updated the examples to use copied scope attributes as dimensions with current-style `traces_span_metrics_*` metric names.
- The TraceQL example used `{ scope.name = ... }` and an unscoped `duration` comparison, which are not current Tempo TraceQL syntax for instrumentation scope and span duration. Updated it to `{ instrumentation:name = ... && span:duration > ... }`.

## Review Notes
The Java instrumentation scope names shown are consistent with the OpenTelemetry Java instrumentation library names. The exact scope version values depend on the Java agent/instrumentation release in use, so examples should be treated as release-specific.
