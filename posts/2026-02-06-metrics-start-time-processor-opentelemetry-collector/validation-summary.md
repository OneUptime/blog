# Validation Summary: How to Use the Metrics Start Time Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib processors
- Metric Start Time processor
- Filter processor
- Metrics Transform processor
- Resource processor
- Batch processor
- Prometheus receiver
- OTLP exporter
- OpenTelemetry metrics data model

## Sources Consulted
- OpenTelemetry Collector Contrib Metric Start Time processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstarttimeprocessor/README.md
- OpenTelemetry Collector Contrib Metric Start Time processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstarttimeprocessor/config.go
- OpenTelemetry Collector Contrib Metric Start Time processor factory source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstarttimeprocessor/factory.go
- OpenTelemetry Collector Contrib Metric Start Time processor metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstarttimeprocessor/metadata.yaml
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry metrics data model specification: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry Collector Filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Metrics Transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post used `metricsstarttime` throughout. The current processor type is `metric_start_time`; `metricstarttime` is only a deprecated alias. Updated all examples to use `metric_start_time`.
- The post claimed the processor preserves correct start times across collector restarts and supports state persistence. The official config has no `state_file` or `save_interval`; state is in memory and controlled with `gc_interval`. Updated the state persistence section and related examples.
- The post used unsupported `include` and `exclude` settings on the Metric Start Time processor. Replaced those examples with the current Filter processor `metric_conditions` syntax before `metric_start_time`.
- The post used unsupported `detect_resets` and `reset_threshold` settings. Replaced that section with the documented strategies: `true_reset_point`, `subtract_initial_point`, and `start_time_metric`.
- The production and multi-collector examples included unsupported Metric Start Time processor fields. Updated them to use supported `strategy`, `gc_interval`, and `start_time_metric_regex` fields.
- The monitoring example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated it to the current `readers` / `pull` / `prometheus` configuration.
- The post listed processor-specific internal metrics such as reset detections and state saves, which are not documented for this processor. Replaced that list with documented Collector internal pipeline metrics.
- The post used `metricstransform`; the current Metrics Transform processor type is `metrics_transform`, with `metricstransform` as a deprecated alias. Updated the production example.

## Review Notes
The processor is beta for metrics and included in the contrib distribution. The post now describes the supported behavior as of the current OpenTelemetry Collector Contrib documentation, but users should still check their collector distribution because component availability can vary by distribution.
