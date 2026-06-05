# Validation Summary: How to Configure OpenTelemetry Exporters in Micronaut (OTLP, Zipkin, Jaeger)

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Micronaut Framework
- Micronaut Tracing OpenTelemetry integration
- OpenTelemetry Java SDK and autoconfigure
- OTLP exporter
- Zipkin exporter
- Jaeger OTLP ingestion
- Java
- Gradle and Maven
- YAML configuration

## Sources Consulted
- Micronaut Tracing guide: https://micronaut-projects.github.io/micronaut-tracing/latest/guide/
- Micronaut `OpenTelemetryBuilderCustomizer` API: https://micronaut-projects.github.io/micronaut-tracing/latest/api/io/micronaut/tracing/opentelemetry/OpenTelemetryBuilderCustomizer.html
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java exporter documentation: https://opentelemetry.io/docs/languages/java/exporters/
- OpenTelemetry Java `SpanExporter` Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace/latest/io/opentelemetry/sdk/trace/export/SpanExporter.html
- OpenTelemetry Java Zipkin exporter Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-exporter-zipkin/latest/io/opentelemetry/exporter/zipkin/ZipkinSpanExporterBuilder.html
- OpenTelemetry Java Jaeger exporter deprecated API list: https://javadoc.io/doc/io.opentelemetry/opentelemetry-exporter-jaeger/1.34.1/deprecated-list.html
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/latest/apis/
- OpenTelemetry migration guidance for Jaeger clients/exporters: https://opentelemetry.io/docs/migration/

## Issues Found
- The Micronaut configuration examples used an unsupported `opentelemetry:` namespace with keys such as `service-name`, `resource-attributes`, `exporter.otlp.enabled`, `span-processor.batch`, and `sampler.probability`. Updated examples to use Micronaut/OpenTelemetry Java autoconfigure properties under `otel.*`, including `otel.traces.exporter`, `otel.service.name`, `otel.resource.attributes`, `otel.exporter.otlp.*`, `otel.bsp.*`, and `otel.traces.sampler`.
- The Zipkin example used `tracing.zipkin.*`, which configures Micronaut's Brave/Zipkin tracing path rather than the OpenTelemetry Zipkin exporter. Replaced it with `otel.traces.exporter=zipkin` and `otel.exporter.zipkin.endpoint`.
- The post recommended and demonstrated OpenTelemetry Java's native Jaeger exporter, which is deprecated. Removed the `opentelemetry-exporter-jaeger` dependency and replaced Jaeger examples with OTLP exporter configuration targeting Jaeger's OTLP endpoint.
- The programmatic multi-exporter example returned a raw `SdkTracerProvider` bean instead of using Micronaut's documented OpenTelemetry customization hook. Reworked it to provide an `OpenTelemetryBuilderCustomizer` and compose additional exporters with the configured exporter.
- The Zipkin programmatic example included a placeholder `.setEncoder(/* custom encoder */)` call that would not compile. Removed that placeholder while keeping the valid endpoint and read-timeout example.
- The custom exporter snippet referenced an undefined `CustomBackendClient` and produced JSON with trailing commas. Added a small placeholder client class and changed JSON creation to use `StringJoiner` with basic string escaping.
- The performance tuning snippet used incorrect property names and an unsupported `max-connections` key. Replaced it with current `otel.bsp.*`, `otel.span.*.limit`, `otel.traces.sampler`, and OTLP exporter properties.

## Review Notes
Jaeger is still a valid trace backend, but current guidance is to send OpenTelemetry data to Jaeger with OTLP rather than using the deprecated native Jaeger exporter. The post now reflects that while preserving its original focus on choosing exporters/backends.
