# Validation Summary: How to Fix Collector Failing to Start Because a Component Is Defined but Not

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector configuration
- Collector receivers, processors, exporters, and service pipelines
- Collector `validate` command
- Docker-based Collector validation
- Environment variable substitution in Collector config

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- Official `otel/opentelemetry-collector-contrib:0.121.0` Docker image, including `validate --help` and validation/startup checks

## Issues Found
- The original post claimed that an unused configured component causes the Collector to fail startup with `component "processor/attributes" is not used in any pipeline`. This did not match current OpenTelemetry Collector documentation or behavior verified with `otel/opentelemetry-collector-contrib:0.121.0`; unused configured components are not enabled by `service.pipelines`, but they did not fail validation or startup in the tested Collector. I changed the post to describe the accurate behavior: the component has no effect unless referenced in a pipeline.
- The original post said every defined component must be referenced in at least one pipeline. OpenTelemetry documentation says configured components are enabled through the `service` section, not that every unused configured component is rejected. I revised that explanation and clarified that startup validation fails when a pipeline references a component that is not configured.
- The copy-paste scenario used the deprecated `logging` exporter with Collector `0.121.0`. The current docs and the tested image indicate `debug` should be used instead, so I changed the example from `logging` to `debug`.
- The typo scenario said two startup errors occur. The tested `0.121.0` image reported the referenced-but-not-configured processor error for `memorylimiter`; the unused `memory_limiter` definition was not a separate startup error. I corrected that wording.
- The environment variable examples used `${VAR}` and `${VAR:-default}`. Current Collector docs use `${env:VAR}` and `${env:VAR:-default}`, and the tested `0.121.0` image rejected the bare default form. I updated the examples to the current `env:` syntax.
- The validation section implied that `otelcol-contrib validate` catches unused configured components. The tested image did not reject unused processors, so I narrowed the claim to invalid component references, invalid component names, and configuration decoding errors.

## Review Notes
- The `otelcol-contrib validate --config config.yaml` command and the Docker validation pattern are valid for the tested Collector contrib image.
- The example OTLP receiver, batch processor, attributes processor, memory limiter processor, debug exporter, and pipeline structure align with current Collector configuration documentation.
