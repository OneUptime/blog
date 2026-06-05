# Validation Summary: How to Use OTTL to Add Prefix or Suffix to Metric Names

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Metrics and datapoint/resource attributes
- Prometheus receiver configuration
- OTLP exporter configuration

## Sources Consulted
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL language README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md
- OTTL metric context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlmetric/README.md
- OTTL datapoint context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottldatapoint/README.md
- OTTL resource context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlresource/README.md
- OTTL function documentation for `set`, `delete_key`, `Concat`, and `replace_pattern`: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- Current Collector validation using `otel/opentelemetry-collector-contrib:latest` and `otelcol-contrib validate`

## Issues Found
- The OTTL examples used older shorthand paths such as `name`, `unit`, `type`, and `attributes`. Current OpenTelemetry Collector documentation for version `0.120.0` and later documents explicit paths such as `metric.name`, `metric.unit`, `metric.type`, `datapoint.attributes`, and `resource.attributes`. Updated the snippets to use the current explicit paths so they parse correctly with the current transform processor documentation.
- Updated all `replace_pattern` examples to target `metric.name`, matching the documented function signature that expects a telemetry path expression.
- Updated datapoint attribute rename examples to use `datapoint.attributes` and resource attribute rename examples to use `resource.attributes`, matching the documented context path names.

## Review Notes
- The complete configuration example validates successfully with the current `otel/opentelemetry-collector-contrib:latest` Collector image.
- The post does not pin a Collector version. The reviewed syntax is aligned with the current `0.120.0+` transform processor documentation.
