# Validation Summary: How to Integrate MicroProfile Telemetry with OpenTelemetry in Open Liberty

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Open Liberty
- MicroProfile Telemetry 1.1
- MicroProfile Config
- MicroProfile REST Client
- OpenTelemetry Java API and SDK autoconfiguration
- Jakarta EE / Jakarta RESTful Web Services
- Maven
- Docker and Docker Compose
- OpenTelemetry Collector and Jaeger

## Sources Consulted
- Open Liberty MicroProfile Telemetry 1.1 feature reference: https://openliberty.io/docs/latest/reference/feature/mpTelemetry-1.1.html
- Open Liberty code instrumentation for MicroProfile Telemetry tracing: https://openliberty.io/docs/latest/telemetry-trace.html
- MicroProfile Telemetry 1.1 tracing specification: https://download.eclipse.org/microprofile/microprofile-telemetry-1.1/tracing/microprofile-telemetry-tracing-spec-1.1.html
- MicroProfile Telemetry releases/specification page: https://microprofile.io/specifications/telemetry/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- Open Liberty container image documentation: https://www.openliberty.io/docs/latest/container-images.html

## Issues Found
- The `server.xml` example used an `<mpTelemetry>` element with nested service name and OTLP exporter settings. Open Liberty `mpTelemetry-1.1` does not define that configuration element; MicroProfile Telemetry 1.1 tracing is configured through MicroProfile Config/OpenTelemetry properties. Removed the invalid XML block.
- The post described CDI as automatic instrumentation. MicroProfile Telemetry 1.1 automatically enlists Jakarta RESTful Web Services server/client and MicroProfile REST Client; CDI bean instrumentation is manual through OpenTelemetry APIs or annotations such as `@WithSpan`. Updated the diagram and explanation.
- The Maven dependencies listed `org.eclipse.microprofile.telemetry:microprofile-telemetry-api:1.1`, which is not the MicroProfile Telemetry 1.1 tracing API artifact used for the shown OpenTelemetry types. Removed it and aligned the OpenTelemetry API dependency with the OpenTelemetry Java 1.29.0 version referenced by MicroProfile Telemetry 1.1.
- The MicroProfile Config example set `otel.metrics.exporter` and `otel.logs.exporter` for a MicroProfile Telemetry 1.1 tracing guide. Metrics and logging are out of scope for MicroProfile Telemetry 1.1. Removed those settings and kept trace export configuration.
- The custom sampler section implied that a bare `Sampler` implementation was sufficient for MicroProfile Config selection. Added the required `ConfigurableSamplerProvider`, ServiceLoader registration file, and `otel.traces.sampler=custom` configuration.
- The custom sampler comments implied sampling could react to errors/admin attributes after span creation. Adjusted comments to reflect head-sampling behavior: the sampler only sees the span name and attributes available at span creation.
- The Dockerfile copied `microprofile-config.properties` to `/config/`, which is not the application `META-INF` classpath location. Removed that copy step because the WAR already contains `src/main/resources/META-INF/microprofile-config.properties`.

## Review Notes
- Maven is not installed in this workspace, so I could not run local Maven commands to validate dependency resolution or build the snippets.
- The article targets MicroProfile Telemetry 1.1. Newer MicroProfile Telemetry versions exist, but keeping 1.1 is acceptable because the post is explicitly versioned.
