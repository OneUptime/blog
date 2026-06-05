# Validation Summary: How to Configure OpenTelemetry SDK Shutdown Timeout and ForceFlush

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Java SDK
- OpenTelemetry Spring Boot Starter
- OpenTelemetry OTLP exporter configuration
- Java
- Spring Boot graceful shutdown
- Spring bean lifecycle callbacks

## Sources Consulted
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java SDK components and BatchSpanProcessor example: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Spring Boot Starter SDK configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry trace SDK specification for Shutdown and ForceFlush: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry SDK autoconfigure Javadoc for default shutdown hook behavior: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-extension-autoconfigure/latest/io/opentelemetry/sdk/autoconfigure/AutoConfiguredOpenTelemetrySdkBuilder.html
- Spring Boot graceful shutdown reference: https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Spring Boot 3.3 graceful shutdown reference for `server.shutdown=graceful`: https://docs.spring.io/spring-boot/3.3/reference/web/graceful-shutdown.html
- OpenTelemetry Java semantic conventions Javadoc showing deprecated `ResourceAttributes` constants: https://javadoc.io/doc/io.opentelemetry.semconv/opentelemetry-semconv/latest/

## Issues Found
- The default behavior section incorrectly described the 10-second timeout as the SDK shutdown timeout. OpenTelemetry Java documents `otel.exporter.otlp.timeout` as a 10-second OTLP exporter request timeout and `otel.bsp.export.timeout` as a 30-second BatchSpanProcessor export timeout. Updated the text to distinguish these timeouts.
- The default behavior section said the starter shutdown hook calls `shutdown()` on the TracerProvider and MeterProvider. SDK autoconfiguration documents that a shutdown hook is registered by default; updated the wording to say it closes the `OpenTelemetrySdk`, which shuts down providers, processors, readers, and exporters.
- The manual configuration snippet imported `SdkMeterProvider` but did not use it. Removed the unused import.
- The manual configuration snippet used `io.opentelemetry.semconv.ResourceAttributes`, whose generated constants are deprecated in current semantic convention artifacts. Replaced the constants with `AttributeKey.stringKey("service.name")` and `AttributeKey.stringKey("service.version")`.
- The shutdown handler snippet imported `OpenTelemetrySdk` but did not use it. Removed the unused import.
- The `ApplicationShutdownListener` snippet referenced `SdkTracerProvider` and `TimeUnit` without imports. Added both imports so the snippet is syntactically complete.
- The auto-configuration section said users can customize "the timeout" with only `OTEL_BSP_EXPORT_TIMEOUT`. Updated the wording to "batch processor and exporter timeouts" and added `OTEL_EXPORTER_OTLP_TIMEOUT` plus the equivalent `otel.exporter.otlp.timeout` YAML setting.

## Review Notes
- The Spring Boot graceful shutdown property `server.shutdown: graceful` is correct for Spring Boot 2.3 through 3.3. Current Spring Boot documentation states graceful shutdown is enabled by default in newer releases, so keeping the explicit setting remains valid and compatible for the versions discussed.
- The examples focus on traces. Applications exporting metrics or logs should also account for metric readers and log record processors when customizing shutdown behavior.
