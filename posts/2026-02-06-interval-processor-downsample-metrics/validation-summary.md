# Validation Summary: How to Use the OpenTelemetry Interval Processor to Downsample Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector interval processor
- OpenTelemetry Collector routing connector
- OTLP / OTLP HTTP Collector configuration
- OpenTelemetry Python metrics API
- Python
- YAML

## Sources Consulted
- OpenTelemetry Collector contrib interval processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/intervalprocessor/README.md
- OpenTelemetry Collector contrib interval processor source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/intervalprocessor/processor.go
- OpenTelemetry Collector contrib interval processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/intervalprocessor/config.go
- OpenTelemetry Collector contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector contrib routing connector config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/config.go
- OpenTelemetry OTTL metric context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlmetric/README.md
- OpenTelemetry OTTL function documentation for `IsMatch`: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md#ismatch
- OpenTelemetry metrics concepts documentation: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html

## Issues Found
- The basic Collector configuration used `passthrough_gauges`, which is not the documented interval processor field. Updated it to `pass_through.gauge`, matching the processor config schema.
- The routing connector example referenced `metric.name` without setting the routing table context to `metric`. Since routing connector rules default to the `resource` context, added `context: metric` to both metric-name routing rules.
- The post described cumulative histogram bucket counts as being accumulated across the interval. The interval processor keeps the newest datapoint per metric stream, so updated the wording to say it emits the latest cumulative bucket counts.
- The counter example said the processor accumulates four cumulative counter datapoints. Updated the wording to clarify that it keeps the newest cumulative value and exports one datapoint per interval.

## Review Notes
- The interval processor is currently documented as alpha for metrics and stateful; the post does not pin a Collector version, so future Collector releases may require another review.
- Delta metrics and non-monotonic sums are passed through unchanged by the interval processor. The post focuses on cumulative metrics, which matches the examples.
