# Validation Summary: How to Configure OpenTelemetry Metrics in Quarkus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Quarkus
- OpenTelemetry Metrics
- OpenTelemetry Java API and SDK
- Micrometer
- Jakarta REST
- Maven
- Prometheus metrics export
- GraalVM / native image considerations

## Sources Consulted
- Quarkus OpenTelemetry guide: https://quarkus.io/guides/opentelemetry
- Quarkus OpenTelemetry Metrics guide: https://quarkus.io/guides/opentelemetry-metrics
- Quarkus Micrometer guide: https://quarkus.io/guides/telemetry-micrometer
- Quarkus Micrometer and OpenTelemetry bridge guide: https://quarkus.io/guides/telemetry-micrometer-to-opentelemetry
- Quarkus REST guide: https://quarkus.io/guides/rest
- OpenTelemetry Java metrics API Javadocs: https://www.javadoc.io/doc/io.opentelemetry/opentelemetry-api/latest/io/opentelemetry/api/metrics/package-summary.html
- OpenTelemetry Java SDK metrics exporter Javadocs: https://www.javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-metrics/latest/io/opentelemetry/sdk/metrics/export/MetricExporter.html
- Micrometer reference documentation for timers, histograms, and percentiles: https://docs.micrometer.io/micrometer/reference/concepts/histogram-quantiles.html

## Issues Found
- The dependency snippet used the older `quarkus-resteasy-reactive` artifact. Updated it to current Quarkus REST artifact `quarkus-rest`.
- The Micrometer/OpenTelemetry artifact was listed as `quarkus-micrometer-registry-opentelemetry`, which is not the current Quarkus bridge extension. Updated it to `quarkus-micrometer-opentelemetry`.
- Removed the standalone `opentelemetry-exporter-otlp` dependency from the Quarkus setup because the Quarkus OpenTelemetry extension provides managed OTLP exporters.
- The configuration used the legacy `quarkus.opentelemetry.enabled` key. Updated it to `quarkus.otel.enabled`.
- The OTLP metric endpoint and protocol were configured with generic exporter keys. Updated them to the signal-specific `quarkus.otel.exporter.otlp.metrics.endpoint` and `quarkus.otel.exporter.otlp.metrics.protocol` keys.
- Removed the native-image `--initialize-at-run-time=io.opentelemetry.sdk.metrics` line because it is not part of the documented Quarkus OpenTelemetry metrics setup.
- The custom metrics examples used `customer.id` and `transaction.id` as metric attributes, which creates high-cardinality metric series. Removed those labels from metrics while leaving trace attributes intact.
- The HTTP server `match-patterns` example omitted the required `regex=replacement` format. Updated it to include replacements.
- The HTTP server `percentiles` and `slo` properties shown in the post are not documented Quarkus Micrometer binder configuration keys. Replaced that snippet with the documented `max-uri-tags` cardinality limit.
- The JVM metrics snippet used unsupported per-binder keys such as `quarkus.micrometer.binder.jvm.memory`. Replaced them with documented Micrometer JVM/System binder keys and documented OpenTelemetry instrumentation toggles.
- The production section included unsupported `quarkus.otel.metrics.exemplars.enabled` and `quarkus.otel.exporter.otlp.metrics.batch-size` properties. Replaced them with guidance to avoid high-cardinality metric attributes and kept documented exporter timeout/compression properties.
- The conclusion claimed native image metrics work identically to JVM metrics. Updated it to note that some JVM runtime metrics can differ depending on native VM support.

## Review Notes
OpenTelemetry Metrics and the Quarkus Micrometer/OpenTelemetry bridge are documented as preview / tech preview features, so configuration and behavior may change across Quarkus versions. The code snippets remain illustrative and refer to placeholder application classes such as `PaymentGateway`, `PaymentRequest`, `OrderService`, and `CreateOrderRequest`.
