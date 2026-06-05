# Validation Summary: How to Configure the Filter Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector filter processor
- OpenTelemetry Transformation Language (OTTL)
- Collector internal telemetry metrics
- Collector debug exporter
- Probabilistic sampling processor

## Sources Consulted
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector OTTL README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md
- OpenTelemetry Collector transforming telemetry docs: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Collector probabilistic sampler README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md

## Issues Found
- The post used the older `traces.span`, `metrics.metric`, `metrics.datapoint`, and `logs.log_record` filter processor configuration style. Current filter processor documentation for v0.146.0 and later documents `trace_conditions`, `metric_conditions`, and `log_conditions`, while marking the older style as deprecated. Updated the examples to the current condition-list format.
- Several OTTL examples used unqualified context paths such as `attributes`, `name`, `status.code`, `value_int`, `severity_text`, and `body`. Updated examples to use explicit paths such as `span.attributes`, `span.name`, `span.status.code`, `datapoint.value_int`, `log.severity_text`, and `log.body`.
- Regex examples used `matches`, which is not the documented OTTL regex form. Replaced these expressions with `IsMatch(...)`.
- Duration examples used a bare `duration` field and nanosecond integers. Updated span duration examples to use `(span.end_time - span.start_time)` with `Duration("...")`, matching the official filter processor examples.
- Troubleshooting and test snippets used the removed/deprecated `logging` exporter. Replaced it with the current `debug` exporter.
- The internal telemetry example used stale dropped/accepted processor metric names and the ignored `service.telemetry.metrics.address` setting. Updated monitoring guidance to use `otelcol_processor_incoming_items` and `otelcol_processor_outgoing_items`, and updated the telemetry endpoint configuration to use a Prometheus pull reader.
- The data type troubleshooting example asserted that HTTP status code attributes should be strings. Changed it to emphasize matching the actual attribute type and show the common numeric status-code comparison.

## Review Notes
The post is now aligned with current OpenTelemetry Collector filter processor documentation. The examples were parsed as YAML successfully, but a full collector startup validation was not run because `otelcol` is not installed in the local environment.
