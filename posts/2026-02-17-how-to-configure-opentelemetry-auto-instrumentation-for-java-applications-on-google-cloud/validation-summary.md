# Validation Summary: How to Configure OpenTelemetry Auto-Instrumentation for Java Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- OpenTelemetry Java agent
- OpenTelemetry Java API
- OpenTelemetry automatic instrumentation
- Google Cloud Trace
- Google Cloud Monitoring
- Google Kubernetes Engine
- OpenTelemetry Collector
- Docker
- Kubernetes

## Sources Consulted
- OpenTelemetry Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent suppressing instrumentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Java HTTP instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/http/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java instrumentation ecosystem: https://opentelemetry.io/docs/languages/java/instrumentation/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- GoogleCloudPlatform/opentelemetry-operations-java README: https://github.com/GoogleCloudPlatform/opentelemetry-operations-java
- Google Cloud OpenTelemetry operations Java auto-exporter README: https://github.com/GoogleCloudPlatform/opentelemetry-operations-java/blob/main/exporters/auto/README.md
- Google Cloud Trace exporter README: https://github.com/GoogleCloudPlatform/opentelemetry-operations-java/blob/main/exporters/trace/README.md
- Maven Central metadata for com.google.cloud.opentelemetry:exporter-auto: https://repo1.maven.org/maven2/com/google/cloud/opentelemetry/exporter-auto/maven-metadata.xml

## Issues Found
- The Google Cloud exporter download URL used a GitHub release asset that does not exist. Updated the download and Dockerfile URLs to the current Maven Central shaded auto-exporter artifact, `exporter-auto-0.36.0-alpha-shaded.jar`, which is the documented form for using the exporter as a Java agent extension.
- The prerequisites said Java 11 or later. Current OpenTelemetry Java agent documentation says Java zero-code instrumentation works with Java 8+ applications, and the Google Cloud exporter artifacts also support Java 8 or higher. Updated the prerequisite to Java 8 or later.
- The customization example used a stale/non-documented messaging suppression environment variable and described suppressing spans by name pattern. Replaced it with the current documented messaging receive telemetry setting, `OTEL_INSTRUMENTATION_MESSAGING_EXPERIMENTAL_RECEIVE_TELEMETRY_ENABLED=false`.
- The manual instrumentation example started a span but did not make it current. Added `Scope` and `span.makeCurrent()` so work inside `validateAndCreate(request)` and any nested spans are correlated under the custom span.

## Review Notes
- The Google Cloud auto-exporter extension is still documented as alpha/proof-of-concept by the Google Cloud operations Java project, so production users should pin and test the exact version they deploy.
- The direct-to-Google-Cloud setup is valid with the Google Cloud exporter extension. For larger deployments, the collector-based approach remains a good option when the collector is configured with the appropriate Google Cloud exporters.
