# Validation Summary: How to Configure the Resource Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry resource processor
- OpenTelemetry attributes processor
- OpenTelemetry resource detection processor
- OpenTelemetry semantic conventions
- Kubernetes Downward API
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector resource detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry service resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/

## Issues Found
- Updated `deployment.environment` to `deployment.environment.name` to match the current OpenTelemetry deployment resource semantic convention.
- Corrected the description and examples for `service.namespace` so it is treated as a logical service namespace rather than an environment value.
- Replaced `resourcedetection` with `resource_detection`; the old component type is now a deprecated alias that logs a deprecation warning.
- Replaced `logging` exporter examples with `debug`, which is the current Collector exporter for console debugging.
- Updated environment variable substitution examples from `${VAR}` to `${env:VAR}` to match current Collector configuration documentation.
- Corrected the missing-environment-variable troubleshooting text so it describes an empty substituted value rather than the literal placeholder remaining.
- Fixed the attributes processor `extract` example to use a named regex capture group, which is required by the processor.
- Adjusted the performance note to say resource attributes are processed at the resource level, not once per batch.

## Review Notes
Some examples use custom resource attributes such as `tenant.*`, `billing.*`, `compliance.*`, and `service.mesh.*`. These are syntactically valid Collector configurations, but teams should define and document internal naming conventions for custom attributes to avoid future collisions with OpenTelemetry semantic conventions.
