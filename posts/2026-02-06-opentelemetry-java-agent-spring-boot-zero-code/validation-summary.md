# Validation Summary: Use the OpenTelemetry Java Agent for Zero-Code Spring Boot Instrumentation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Java SDK autoconfiguration
- Spring Boot
- Java JVM agents
- OTLP exporters
- Docker
- Kubernetes ConfigMaps, Secrets, and environment variables
- GPG signature verification

## Sources Consulted
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java instrumentation GitHub repository and release assets: https://github.com/open-telemetry/opentelemetry-java-instrumentation
- OpenTelemetry Java agent supported libraries list: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/v2.28.1/docs/supported-libraries.md
- Kubernetes dependent environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/

## Issues Found
- The "latest" download example pinned the old `v2.1.0` release. Changed it to the official `releases/latest/download/opentelemetry-javaagent.jar` URL.
- The production and Docker examples pinned `v2.1.0`, which is outdated for this review date. Updated pinned examples to `v2.28.1`, the current latest release shown by the official GitHub repository on 2026-06-05.
- The checksum verification example referenced `opentelemetry-javaagent.jar.sha256`, but the current release assets provide `opentelemetry-javaagent.jar.asc` and no `.sha256` asset. Replaced the checksum commands with GPG signature verification commands.
- The expected Java agent size was listed as 60-70 MB. Updated it to 20-30 MB based on the current release asset size.
- The Kubernetes `OTEL_RESOURCE_ATTRIBUTES` override added pod-specific attributes but dropped the deployment and cluster attributes from the ConfigMap. Updated the explicit value to include the full resource attribute set.
- The multiple-exporter example used `otel.logs.exporter=logging`, but current Java SDK autoconfiguration lists `console` and `logging-otlp`, not `logging`. Changed the example to `otel.logs.exporter=console`.
- The Spring Boot profiles section claimed `application.properties` OpenTelemetry keys are picked up by both Spring and the Java agent. The Java agent is configured through system properties, environment variables, or an agent configuration file, so the section was corrected to pass OpenTelemetry settings as JVM system properties.
- The Kubernetes Secret example referenced `$(OTEL_API_KEY)` before defining `OTEL_API_KEY`. Kubernetes environment variable expansion is order-sensitive, so the secret-backed variable was moved before `OTEL_EXPORTER_OTLP_HEADERS`.
- The verification section used an outdated version log example. Updated it to reference `opentelemetry-javaagent - version: 2.28.1`.

## Review Notes
Most Java agent configuration keys, sampler names, OTLP endpoint usage, `JAVA_TOOL_OPTIONS` usage, selective instrumentation flags, batch span processor properties, and supported instrumentation categories matched current official documentation. The overhead figures are plausible as general guidance but are workload-dependent and should be benchmarked for production systems.
