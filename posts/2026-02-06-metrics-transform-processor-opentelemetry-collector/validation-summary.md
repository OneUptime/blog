# Validation Summary: How to Configure the Metrics Transform Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib metrics transform processor
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector attributes processor
- YAML Collector configuration
- Prometheus metrics

## Sources Consulted
- OpenTelemetry Collector Contrib metrics transform processor README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor
- OpenTelemetry Collector Contrib metrics transform processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/config.go
- OpenTelemetry Collector Contrib v0.153.0 release notes: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.153.0
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- The processor type used `metricstransform`, which is now deprecated in favor of `metrics_transform`. Updated all configuration snippets and pipeline references.
- Several examples used a nonexistent `rename_label` operation. Replaced it with `update_label` and `new_label`, which is the documented way to rename metric labels.
- The post described `delete_label_value` as removing label keys and showed invalid examples without `label_value`. Updated the section to explain that it deletes data points matching a label value and added required `label_value` fields.
- The label value mapping examples used regex patterns in `value_actions`, but `value_actions` matches exact values. Replaced regex mappings with exact value examples.
- The metric type conversion section claimed `toggle_scalar_data_type` converts gauges to cumulative sums. Corrected it to describe int64/double scalar data point toggling and clarified that temporality conversion belongs in the cumulative-to-delta processor.
- Regex rename examples referenced `$${1}` without capture groups in some places. Added the missing capture groups.
- The production and cardinality examples attempted to remove sensitive or high-cardinality labels using `delete_label_value`. Reworked those examples to use `aggregate_labels` where labels are aggregated away and the attributes processor for sensitive attribute deletion.
- The unit conversion section incorrectly said metrics transform does not support mathematical operations. Updated it to use the documented `experimental_scale_value` operation for scalar unit conversion.
- The supported aggregation type list omitted `count` and `median`, and lacked the histogram limitation. Added those details.

## Review Notes
The metrics transform processor is beta for metrics and available in the contrib and Kubernetes Collector distributions. The checked release notes list `metricstransform` as renamed to `metrics_transform`, so new examples should use `metrics_transform`.
