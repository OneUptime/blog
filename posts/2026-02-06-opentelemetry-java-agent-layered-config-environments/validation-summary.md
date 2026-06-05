# Validation Summary: How to Configure OpenTelemetry Java Agent Layered Configuration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry SDK autoconfiguration
- OpenTelemetry resource semantic conventions
- Java system properties and environment variables
- Java properties files
- Kubernetes Deployments, ConfigMaps, Secrets, and Downward API
- Spring Boot startup events
- JUnit 5

## Sources Consulted
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java agent getting started and troubleshooting: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry deployment semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Java API usage with the agent: https://opentelemetry.io/docs/zero-code/java/agent/api/
- OpenTelemetry Java instrumentation releases: https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases
- Kubernetes dependent environment variables: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes Downward API fields: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/

## Issues Found
- `otel.service.version` and `OTEL_SERVICE_VERSION` were presented as OpenTelemetry configuration keys, but current OpenTelemetry Java configuration exposes `otel.service.name` as the dedicated service property. Changed service version to the `service.version` resource attribute inside `otel.resource.attributes`.
- The post used deprecated `deployment.environment`. Updated examples and validation logic to use the stable `deployment.environment.name` resource attribute.
- The Java agent precedence list omitted extension-supplied properties. Added the `AutoConfigurationCustomizerProvider` extension source before defaults.
- The base config used the deprecated JDBC-specific statement sanitizer key. Changed it to the non-deprecated common query sanitization property.
- Properties-file examples used `${OTEL_AUTH_TOKEN}` interpolation, which Java properties files do not automatically expand. Replaced those with concrete placeholder header values and kept environment-variable secret expansion in the Kubernetes example.
- The Kubernetes example used `OTEL_SERVICE_VERSION`, which is not an OpenTelemetry environment variable. Replaced it with `APPLICATION_VERSION` from `fieldRef` and expanded it into `OTEL_RESOURCE_ATTRIBUTES`.
- The environment variable conversion rules said to add an `OTEL_` prefix separately and did not mention hyphens. Corrected the rules to uppercase the full property name and replace dots and hyphens with underscores.
- The Spring Boot validation example referenced `ResourceAttributes` without import and depended on casting `GlobalOpenTelemetry` to `OpenTelemetrySdk`. Reworked it to validate system properties, environment variables, and the configured Java properties file directly.
- The tests loaded each override file in isolation even though the article describes layered configuration. Updated the test helper to load the base file first and then apply the environment override.
- The troubleshooting section showed fabricated per-property resolution logs. Replaced it with a more accurate description of verbose debug output.

## Review Notes
The post is accurate after edits. One future improvement would be to mention that OpenTelemetry Java agent 2.x defaults OTLP protocol to `http/protobuf`; the examples explicitly set `grpc`, so they remain valid.
