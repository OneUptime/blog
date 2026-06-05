# Validation Summary: How to Reduce Observability Costs by 80% with OpenTelemetry Intelligent Sampling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector transform processor and OTTL
- OpenTelemetry Collector filter processor and OTTL
- OpenTelemetry Collector internal telemetry metrics

## Sources Consulted
- OpenTelemetry Collector Contrib tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib metrics transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The tail sampling health-check policy used `string_attribute` with `invert_match: true`, which would not reliably drop health-check traces and could sample non-health traffic outside the intended 5% policy. Changed it to a `drop` policy with a `drop_sub_policy`, matching the official tail sampling processor behavior for explicit trace exclusion.
- The transform processor span trimming example used unqualified `attributes` paths and described truncating only URL query strings. Updated the snippet to use documented `span.attributes` paths and changed the comment to accurately describe truncating long span attribute values.
- The metrics section used `metricstransform` with `aggregation_type: ""`, which is not a valid aggregation configuration and does not change export intervals. Replaced it with transform processor OTTL that deletes high-cardinality datapoint attributes, normalizes route values, and re-aggregates sum metrics with `aggregate_on_attributes("sum")`.
- The log filtering example used duplicate `log_record` YAML keys under `logs`, which would overwrite or invalidate part of the configuration. Updated it to the current filter processor `log_conditions` syntax with `log.severity_number` paths.
- The internal metrics example used `service.telemetry.metrics.address`, which the official OpenTelemetry docs state is ignored as of Collector v0.123.0. Replaced it with the current Prometheus pull-reader configuration.

## Review Notes
The percentage savings claims are plausible as tuning examples, but they depend heavily on traffic shape, trace size, backend pricing, and sampling policy order. In a future revision, consider adding a note that the `net.sock.*` attributes are older semantic convention names and may need to be adjusted for environments emitting newer network attributes.
