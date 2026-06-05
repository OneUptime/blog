# Validation Summary: How to Monitor Apache Pulsar with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Pulsar
- Pulsar Java client
- OpenTelemetry Java SDK
- OpenTelemetry tracing and metrics
- OpenTelemetry Collector
- Prometheus scraping
- Java

## Sources Consulted
- Apache Pulsar OpenTelemetry Tracing for Pulsar Java Client: https://pulsar.apache.org/docs/client-libraries/java-tracing/
- Apache Pulsar ClientBuilder API 4.2.x: https://pulsar.apache.org/api/client/4.2.x/org/apache/pulsar/client/api/ClientBuilder.html
- Apache Pulsar OpenTelemetry Metrics reference 4.2.x: https://pulsar.apache.org/docs/4.2.x/reference-metrics-opentelemetry/
- Apache Pulsar monitoring documentation 4.2.x: https://pulsar.apache.org/docs/4.2.x/deploy-monitoring/
- OpenTelemetry Java supported libraries: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Java `ResourceAttributes` Javadoc showing deprecation: https://javadoc.io/static/io.opentelemetry.semconv/opentelemetry-semconv/1.28.0-alpha/io/opentelemetry/semconv/ResourceAttributes.html

## Issues Found
- The post said native Pulsar Java client OpenTelemetry support started in version 2.11. Current Pulsar API documentation marks `enableTracing(boolean)` as available since 4.2.0, so the version-specific wording was corrected.
- The post implied `openTelemetry(openTelemetry)` enabled both tracing and metrics. Current Pulsar ClientBuilder documentation describes `openTelemetry(OpenTelemetry)` for metrics and `enableTracing(true)` for tracing, so the client examples and explanatory text now include both calls.
- The Java examples imported `io.opentelemetry.semconv.ResourceAttributes` and used `ResourceAttributes.SERVICE_NAME`, which is deprecated in current OpenTelemetry Java semantic convention artifacts. The snippet now uses `AttributeKey.stringKey("service.name")`.
- The examples used `buildAndFinishConfiguration()`. The snippets now use the current `OpenTelemetrySdk.builder().build()` style and register the SDK globally before enabling Pulsar tracing.
- The producer tracing section listed non-documented span attributes for tenant and namespace. It now lists the documented producer span attributes: `messaging.system`, `messaging.destination.name`, `messaging.operation.name`, and `messaging.message.id`.
- The custom attributes snippet implied `Span.current()` would modify the auto-generated Pulsar producer span before the send call. The wording now correctly says these are attributes on the active application span around the publish operation.
- Several Pulsar Java client metric names were incorrect. They were corrected to `pulsar.client.consumer.message.received.count`, `pulsar.client.consumer.message.ack`, `pulsar.client.consumer.message.nack`, `pulsar.client.consumer.receive_queue.count`, and `pulsar.client.consumer.receive_queue.size`.
- The metrics example used `Duration` without importing it. The snippet now includes `import java.time.Duration;`.
- The sampling example referenced an undefined `exporter` variable. It now uses the earlier `spanExporter` variable name.

## Review Notes
The OpenTelemetry Java agent supports Apache Pulsar 2.8+ for messaging spans, which is a separate path from Pulsar's native Java client tracing API. The post now focuses on the native Pulsar Java client path. Deployments using older Pulsar clients should use the OpenTelemetry Java agent or explicit interceptors instead of the 4.2.x `enableTracing(true)` API.
