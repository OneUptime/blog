# Validation Summary: How to Configure the Unroll Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Unroll processor
- OpenTelemetry Collector Transform processor
- OpenTelemetry Collector Filter processor
- OpenTelemetry Transformation Language (OTTL)
- Collector internal telemetry configuration

## Sources Consulted
- OpenTelemetry Collector Contrib Unroll processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/unrollprocessor/README.md
- OpenTelemetry Collector Contrib Unroll processor metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/unrollprocessor/metadata.yaml
- OpenTelemetry Collector Contrib Unroll processor config: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/unrollprocessor/config.go
- OpenTelemetry Collector Contrib Transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib Filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/

## Issues Found
- The post claimed the Unroll processor supports traces, metrics, and logs. Official metadata lists Unroll as alpha for logs only. Updated the article to describe logs-only behavior.
- The post used unsupported `field`, `new_field`, `match`, `preserve_original`, and `max_array_size` processor settings. Official config only exposes `recursive`. Replaced all snippets with valid `recursive`-based configuration.
- The post described unrolling array-valued attributes directly. Official documentation says the processor expands log record bodies that are slices. Updated examples to unroll log bodies and use Transform processor examples where an attribute must first be copied into the body.
- The conditional unroll example used unsupported matcher configuration. Replaced it with current Filter processor `log_conditions` syntax using OTTL.
- The nested-array section used unsupported dot-path field selection. Replaced it with valid `recursive: true` behavior for nested list bodies.
- The Transform processor integration used trace statements and unsupported Unroll field selection. Updated it to use `log_statements`, `ParseJSON`, `IsString`, and `Trim` with the Unroll processor in a logs pipeline.
- The production safeguard example used unsupported `max_array_size` and trace filtering. Replaced it with Filter processor `log_conditions` using `IsList` and `Len`.
- The internal telemetry snippet used the older `metrics.address` form. Updated it to the current `metrics.readers` Prometheus pull exporter configuration.
- Several examples referred to spans and metrics after unroll. Updated them to log records and preserved metadata, matching official processor behavior.

## Review Notes
The Unroll processor is alpha and logs-only as of the current OpenTelemetry Collector Contrib documentation. Future changes could expand supported signals or configuration, so this post should be rechecked when upgrading Collector versions.
