# Validation Summary: How to Fix 'Invalid Configuration' Errors in the OpenTelemetry Collector

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- Collector YAML configuration
- Collector receivers, processors, exporters, extensions, and service pipelines
- Docker-based Collector validation
- Kubernetes ConfigMaps
- GitHub Actions
- yamllint and yq

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector component/exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector component/processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector receiver documentation: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector logging exporter replacement announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Current `otel/opentelemetry-collector-contrib:latest` Docker image CLI and config validation output.

## Issues Found
- The post used the removed `logging` exporter in examples. Replaced it with the current `debug` exporter, which is included in current Collector distributions.
- The Docker validation examples used runtime execution or `--dry-run`. Updated them to use the supported `validate --config=...` command.
- The post stated successful validation prints `"Config validation passed"`. Current Collector validation exits with status 0 and no success output, so the text was corrected.
- Several environment variable examples used legacy `${VAR}` syntax. Updated them to the documented `${env:VAR}` and `${env:VAR:-default}` syntax.
- The complete template used `file_storage` without `create_directory: true`, which fails validation if the queue directory does not already exist. Added the option.
- The complete template used the ignored `service.telemetry.metrics.address` setting. Replaced it with the current `readers` configuration for the Prometheus pull endpoint.
- The internal telemetry OTLP reader example used an invalid duration value and normal exporter-style headers. Corrected the interval type and removed the invalid header mapping.
- The YAML boolean section said `True` and `FALSE` are invalid strings. Adjusted the wording because they are accepted as booleans by common YAML parsers, while legacy `yes`/`no` values should be avoided for cross-tool consistency.
- The environment variable extraction command only matched the old `${VAR}` form. Updated it to extract variables from `${env:VAR}` placeholders.

## Review Notes
The complete configuration template was validated with the current `otel/opentelemetry-collector-contrib:latest` image using `validate --config=/config.yaml` and `ONEUPTIME_TOKEN=test`. Some example error messages in the article are representative rather than exact current Collector output.
