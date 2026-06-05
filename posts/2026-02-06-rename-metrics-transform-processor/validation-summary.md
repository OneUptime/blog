# Validation Summary: How to Rename Metric Names and Labels Using the Metrics Transform Processor

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- Metrics Transform Processor (`metricstransform`)
- Prometheus receiver configuration
- OTLP exporter configuration
- OpenTelemetry metric semantic conventions

## Sources Consulted
- OpenTelemetry Collector Contrib Metrics Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector Contrib Metrics Transform Processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/config.go
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry semantic conventions for Go runtime metrics: https://opentelemetry.io/docs/specs/semconv/runtime/go-metrics/
- OpenTelemetry semantic conventions for OS process metrics: https://opentelemetry.io/docs/specs/semconv/system/process-metrics/

## Issues Found
- The post described `delete_label_value` as removing a label and omitted the required `label_value` field. Updated the section to explain that this action deletes data points for a specific label value and added `label_value: "localhost:8080"`.
- The combine example used two separate strict transforms and omitted the combine aggregation configuration. Replaced it with a single regexp-based `combine` transform that uses a named capture group for the `result` label and includes `aggregation_type: sum`.
- The "Combining and Splitting Metrics" heading implied a splitting example that was not present. Renamed it to "Combining Metrics".
- The Prometheus-to-OTel example claimed to convert Go Prometheus metrics to OpenTelemetry semantic conventions but used outdated/non-current `process.runtime.go.*` names. Updated the wording to describe dotted names, changed representative target names to current Go runtime semantic convention names where applicable, and moved the remaining bulk regex target into a custom `go.memstats.*` namespace.

## Review Notes
The `metricstransform` processor is beta in OpenTelemetry Collector Contrib. The OpenTelemetry Go runtime semantic conventions are currently marked Development, so future convention names may still change.
