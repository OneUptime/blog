# Validation Summary: How to Troubleshoot Spring Boot Actuator Metrics Not Appearing When

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Spring Boot Actuator
- Micrometer
- OpenTelemetry Java agent
- OpenTelemetry Spring Boot starter
- OpenTelemetry Micrometer bridge
- OTLP metrics export
- Maven
- YAML configuration
- Java

## Sources Consulted
- Spring Boot Actuator metrics reference: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- OpenTelemetry Java agent supported libraries: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java agent instrumentation enable/disable configuration: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Spring Boot starter getting started guide: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter out-of-the-box instrumentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- Maven Central metadata for opentelemetry-micrometer-1.5: https://central.sonatype.com/artifact/io.opentelemetry.instrumentation/opentelemetry-micrometer-1.5

## Issues Found
- The post grouped `micrometer-registry-otlp` with the OpenTelemetry Micrometer bridge. I changed the bridge section to describe only the OpenTelemetry Micrometer bridge because `micrometer-registry-otlp` exports Micrometer metrics directly via OTLP and is already covered separately.
- The OpenTelemetry Micrometer dependency used an outdated hard-coded alpha version. I removed the version from the dependency snippet and noted that the OpenTelemetry instrumentation alpha BOM should manage it.
- The post said the Java agent bridge is included automatically and only needs enabling. I clarified that Micrometer instrumentation is included but disabled by default, matching the official OpenTelemetry Java supported libraries documentation.
- The OpenTelemetry Spring Boot starter dependency used a hard-coded older version. I removed the version from the dependency snippet and noted that the OpenTelemetry instrumentation BOM should manage it.
- The Spring Boot starter section implied Micrometer integration is automatic by default. I added `otel.instrumentation.micrometer.enabled: true` because the official starter documentation lists Micrometer instrumentation as disabled by default.
- The verification command used `-Dotel.metrics.exporter=logging`. I changed it to `-Dotel.metrics.exporter=console`, which is the current documented Java autoconfigure value for the logging-style console exporter.
- The custom metrics section said metrics must be registered with the global `MeterRegistry`. I changed this to the application `MeterRegistry` that the bridge observes, which matches Spring Boot's normal injected registry model.

## Review Notes
The Spring Boot OTLP registry configuration under `management.otlp.metrics.export.url` is technically correct for Spring Boot 3.x and later. The post could later mention BOM snippets explicitly for Maven users, but the dependency examples are now technically accurate without pinning stale versions.
