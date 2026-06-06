# Validation Summary: How to Implement Cardinality Limits to Prevent Metric Explosions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Metrics API and SDK
- OpenTelemetry Python
- OpenTelemetry Go
- OpenTelemetry Java
- OpenTelemetry Collector
- OpenTelemetry Collector transform, batch, and cardinality guardian processors
- Prometheus alerting rules
- Python metric cardinality tracking patterns

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python metrics View documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Go metric SDK package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Java SDK metrics Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-metrics/1.52.0/index-all.html
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector metricstransform processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor
- OpenTelemetry Collector cardinality guardian processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/cardinalityguardianprocessor

## Issues Found
- The first Python example referenced `status_code` without accepting it as a function parameter. Added `status_code` to `handle_request`.
- The Python View example used an undefined `Counter` and undefined `reader`, and imported unused aggregation classes from the wrong place for the current SDK docs. Added the SDK `Counter`, `ConsoleMetricExporter`, and `PeriodicExportingMetricReader` imports and initialized a reader.
- The Go example imported both API and SDK metric packages under the same name, imported an unused package, used an invalid `attribute.NewSet(...).Filter` pattern for attribute allow-listing, and referenced an undefined reader. Aliased the API and SDK metric packages, removed the unused import, used `attribute.NewAllowKeysFilter`, created a manual reader, and added the current SDK cardinality limit option.
- The Java example treated the View attribute filter input as an object with `getKey()`, but current Java SDK docs expose `setAttributeFilter(Predicate<String>)`. Updated the lambda to operate on the key string and added the current View cardinality limit API.
- The SDK View examples said high-cardinality attributes were simply dropped. Added notes that View-filtered attributes are removed from the metric stream identity but may still appear on exemplars unless exemplar sampling is disabled or customized.
- The advanced Collector example claimed transform/filter processors could estimate and enforce unique cardinality counts using synthetic attributes. That is not how those processors work. Replaced it with documented cardinality guardian configuration plus transform rules for route normalization and aggregation after attribute changes.

## Review Notes
The cardinality guardian processor is marked development stability, so its configuration may change between Collector releases. The post now uses documented current configuration, but production users should pin and test the Collector distribution/version they deploy.
