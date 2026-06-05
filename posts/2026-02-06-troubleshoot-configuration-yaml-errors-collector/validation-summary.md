# Validation Summary: How to Troubleshoot Configuration YAML Errors in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- YAML configuration
- Collector receivers, processors, exporters, extensions, and service pipelines
- Collector environment variable substitution
- Kubernetes environment variables
- Shell validation scripts
- yamllint and yq

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector processor package documentation: https://go.opentelemetry.io/collector/processor
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Current `otel/opentelemetry-collector-contrib:latest` Docker image `otelcol-contrib --help` and `otelcol-contrib validate --help` output
- Current `otel/opentelemetry-collector-contrib:latest` Docker image validation runs for representative valid, invalid type, invalid duration, missing endpoint, extension, and environment-substitution configurations

## Issues Found
- The post used the removed `logging` exporter in multiple examples. Current official Collector distributions removed it in v0.111.0 in favor of the `debug` exporter, so I replaced `logging` with `debug` and kept the supported `verbosity` option.
- The tab-check command used `grep "^I"`, which does not match the `^I` text emitted by `cat -A`. I changed it to `grep '\^I'`.
- Two "correct" YAML examples showed alternative forms by repeating the same key in one YAML document. I split those alternatives into separate snippets so the examples are valid YAML.
- The validator section claimed valid configs print `Config validation successful`. The current contrib image validates successfully with no output and a zero exit status, so I updated the expected output note.
- The invalid type section treated a bare numeric duration as a validation error. Current Collector validation accepts it, so I changed the guidance to warn that explicit units should be used to avoid unintended values, and updated the decoder error examples for quoted integer and boolean values.
- The processor order section presented best-practice ordering as hard Collector validation errors. I changed it to a warning/best-practice note because processor order matters, but the Collector does not reject the shown order.
- The extension section claimed a defined but unregistered `health_check` extension fails with an extension-not-found error. Current validation accepts that config, but the extension is not started, so I changed the symptom to the health endpoint being unavailable.
- The environment variable examples used legacy `${VAR}` syntax for Collector substitution. Current Collector docs use `${env:VAR}` and `${env:VAR:-default}`, so I updated those examples while leaving the `envsubst` template section in shell substitution syntax.
- The Kubernetes example used `otel/opentelemetry-collector-contrib:0.93.0`, which predates the `logging` exporter removal and conflicted with the updated examples. I changed it to `0.111.0`.

## Review Notes
The post is now technically accurate for current OpenTelemetry Collector behavior. Exact validation error wording can still vary by Collector version and component, so the examples should be treated as representative diagnostics rather than guaranteed byte-for-byte output.
