# Validation Summary: Configure OpenTelemetry Java Agent Properties via YAML Declarative Configuration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Java Agent
- OpenTelemetry declarative configuration
- YAML
- OTLP HTTP exporter
- Java JVM startup arguments
- Docker
- Kubernetes ConfigMaps

## Sources Consulted
- OpenTelemetry Java Agent Declarative configuration: https://opentelemetry.io/docs/zero-code/java/agent/declarative-configuration/
- OpenTelemetry Java Agent Configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java SDK Configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Declarative configuration: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry Configuration Data Model: https://opentelemetry.io/docs/specs/otel/configuration/data-model/
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry configuration examples: https://github.com/open-telemetry/opentelemetry-configuration/tree/main/examples

## Issues Found
- The post used `otel.javaagent.configuration-file` for YAML declarative configuration. Changed examples to `otel.config.file` / `OTEL_CONFIG_FILE` and added a note that `otel.javaagent.configuration-file` is for Java properties files.
- The post did not mention that Java agent declarative configuration is experimental and supported starting in agent version 2.26.0. Added that version caveat and updated the Docker agent download from `v2.1.0` to `v2.26.0`.
- YAML examples used legacy flat property names such as `traces.exporter`, `metrics.exporter`, `exporter.otlp`, `batch-span-processor`, and `service.name`. Replaced them with the declarative configuration schema using `file_format`, `resource`, `propagator`, `tracer_provider`, `meter_provider`, and `logger_provider`.
- Environment variable fallback syntax used `${VAR:default}`. Corrected it to declarative configuration syntax `${VAR:-default}`.
- Several Java-agent startup options were incorrectly placed in YAML, including debug logging and extension loading. Moved those to JVM properties and documented that they must be set before the declarative file is read.
- Sampling examples used non-declarative sampler names such as `parentbased_traceidratio` and a conceptual `rules` sampler. Replaced them with supported declarative sampler components such as `always_on`, `always_off`, `trace_id_ratio_based`, and `parent_based`.
- HTTP header capture and database statement sanitizer examples used environment-property key shapes directly in YAML. Converted them to the documented `instrumentation/development` mappings.
- Multi-backend export used `traces.exporter: otlp,zipkin`, which is not declarative YAML. Replaced it with multiple span processors, each with its own exporter.
- Configuration precedence section claimed system properties and environment variables override YAML. Updated it to explain that when declarative configuration is selected, other SDK environment variables are ignored unless explicitly referenced by substitution syntax in the YAML.

## Review Notes
Declarative configuration support for the Java agent remains experimental as of the reviewed documentation. The post now uses current schema-backed examples, but future OpenTelemetry releases may still change `/development` sections such as instrumentation configuration mappings.
