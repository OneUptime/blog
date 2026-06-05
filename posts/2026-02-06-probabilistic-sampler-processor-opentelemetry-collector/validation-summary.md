# Validation Summary: How to Configure the Probabilistic Sampler Processor

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector probabilistic_sampler processor
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector tail_sampling processor
- OTLP exporter and Collector internal telemetry
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector probabilistic sampler processor config/source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/config.go
- OpenTelemetry Collector probabilistic sampler metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/metadata.yaml
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post said the probabilistic sampler only supports proportional and equalizing modes and described proportional as the default. Updated this to include `hash_seed` mode as the default and added a minimal hash_seed example.
- The basic config said an unset `hash_seed` uses a random seed. Updated this to the documented default seed of `0`.
- The proportional and equalizing descriptions overstated or misstated upstream sampling behavior. Adjusted them to match current consistent probability sampling semantics.
- Removed `sampling_percentage_for_missing_priority`, which is not a current probabilistic sampler configuration field.
- The attribute-based routing example used routing processor-style syntax. Updated it to the current routing connector structure with `connectors`, `default_pipelines`, `context`, `condition`, and downstream pipelines receiving from `routing`.
- The environment variable examples used outdated/default syntax and implied a parent shell export could change a running process environment. Updated examples to `${env:...}` / `${env:...:-default}` and changed the operational wording to restart or reload the collector after updating its environment.
- The per-environment sampling example used filter conditions as if matching telemetry were kept. Filter conditions drop matching telemetry, so the conditions were inverted and updated to current `trace_conditions` syntax.
- The tail-sampling baseline comment implied the probabilistic policy samples only remaining traces. Updated it to note that error and latency policies can raise the final rate above the random baseline.
- The production example placed `batch` before sampling and used invalid environment substitutions. Reordered processors so sampling happens before batching and fixed environment substitutions.
- The optional backup exporter used unresolved required environment variables. Replaced them with explicit placeholder values so the snippet is structurally valid when copied and edited.
- The sampler monitoring section listed non-current or unsupported metric names. Updated it to the current probabilistic sampler counter with the `sampled` label and adjusted the sampling-rate calculation.

## Review Notes
All YAML code blocks were parsed successfully after the edits. The examples are configuration-oriented and should still be validated with the exact Collector distribution/version used in production, because Collector component availability and internal telemetry names can vary by distribution and metric exporter format.
