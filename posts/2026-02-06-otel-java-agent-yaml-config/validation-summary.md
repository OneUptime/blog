# Validation Summary: How to Configure the OpenTelemetry Java Agent Using YAML Declarative Config

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry declarative configuration
- YAML
- JVM system properties
- Spring Boot
- Gradle
- Kubernetes environment variables and secrets

## Sources Consulted
- OpenTelemetry Java agent declarative configuration: https://opentelemetry.io/docs/zero-code/java/agent/declarative-configuration/
- OpenTelemetry SDK declarative configuration: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry configuration data model: https://opentelemetry.io/docs/specs/otel/configuration/data-model/
- OpenTelemetry configuration types reference: https://opentelemetry.io/docs/specs/otel/configuration/types/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Spring Boot starter declarative configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/declarative-configuration/
- OpenTelemetry configuration schema source: https://github.com/open-telemetry/opentelemetry-configuration/tree/main/schema

## Issues Found
- The post used the older `-Dotel.experimental.config.file` property. Updated all Java agent examples to `-Dotel.config.file`, and added the standard `OTEL_CONFIG_FILE` alternative.
- The YAML examples used `file_format: "0.3"`. Updated them to `file_format: "1.0"` to match the current stable schema.
- Resource attributes were shown as a YAML map. Updated them to the current `resource.attributes` list of `name` / `value` entries, and changed `deployment.environment` to `deployment.environment.name`.
- OTLP exporters were written as `otlp` plus `protocol: "grpc"`. Updated declarative config examples to use `otlp_grpc`.
- The propagator example used a flow-style list of strings. Updated it to the schema-supported list of propagator objects.
- Instrumentation settings were under `instrumentation.java` with older property names. Updated them to `instrumentation/development`, using documented mappings such as `general.http.server.request_captured_headers` and `java.common.database.statement_sanitizer.enabled`.
- The disabled instrumentation example used a non-schema `disabled_instrumentations` list. Updated it to `distribution.javaagent.instrumentation.disabled`.
- The secrets example used a header map. Updated it to the schema-supported `headers` array with `name` and `value`.
- The Spring Boot section claimed the Java agent config file path could be loaded from application YAML. Reworked it to pass the config path to the Java agent, and clarified that the OpenTelemetry Spring Boot starter has a separate `application.yaml` declarative configuration model.
- The final paragraph claimed the agent falls back to environment variables and system properties for settings not covered by the file. Updated it to reflect that declarative configuration ignores environment variables unless explicitly referenced with substitution syntax.

## Review Notes
All YAML snippets were parsed locally with PyYAML after editing. The Java agent declarative configuration support is still documented as experimental even though the core schema is stable.
