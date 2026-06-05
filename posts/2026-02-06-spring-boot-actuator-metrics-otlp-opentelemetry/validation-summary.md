# Validation Summary: How to Export Spring Boot Actuator Metrics via OTLP with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot Actuator
- Micrometer
- OpenTelemetry Java SDK
- OpenTelemetry Java Micrometer instrumentation
- OTLP over HTTP/protobuf and gRPC
- Maven
- Java
- YAML configuration

## Sources Consulted
- Spring Boot Actuator metrics reference: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Spring Boot Actuator endpoints reference: https://docs.enterprise.spring.io/spring-boot/reference/actuator/endpoints.html
- OpenTelemetry Java SDK configuration reference: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java exporters reference: https://opentelemetry.io/docs/languages/java/exporters/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Micrometer bridge Javadocs: https://javadoc.io/static/io.opentelemetry.instrumentation/opentelemetry-micrometer-1.5/2.28.1-alpha/io/opentelemetry/instrumentation/micrometer/v1_5/OpenTelemetryMeterRegistry.html
- OpenTelemetry PeriodicMetricReader Javadocs: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-metrics/1.62.0/io/opentelemetry/sdk/metrics/export/PeriodicMetricReaderBuilder.html
- Micrometer histograms and percentiles reference: https://docs.micrometer.io/micrometer/reference/concepts/histogram-quantiles.html
- Micrometer OTLP reference: https://docs.micrometer.io/micrometer/reference/implementations/otlp.html
- Maven Central metadata for OpenTelemetry SDK and instrumentation artifacts: https://repo1.maven.org/maven2/io/opentelemetry/

## Issues Found
- The OpenTelemetry Micrometer bridge dependency used the wrong Maven group ID (`io.opentelemetry`). Changed it to `io.opentelemetry.instrumentation`, which is the published group for `opentelemetry-micrometer-1.5`.
- The dependency versions were pinned to old OpenTelemetry 1.33-era artifacts. Added the current `opentelemetry-instrumentation-bom-alpha` import so the Micrometer bridge and OpenTelemetry SDK/exporter versions are aligned.
- The Spring Boot configuration exposed and disabled Prometheus even though the tutorial does not add `micrometer-registry-prometheus`, and the Prometheus endpoint requires that registry dependency. Removed the Prometheus endpoint/export settings from the OTLP-only example.
- The OpenTelemetry export interval property was written as `otel.metrics.export.interval`, but the Java SDK property is singular: `otel.metric.export.interval`. Updated the YAML and changed the Java configuration to read that property as a `Duration`.
- The Java code hard-coded a 60-second export interval despite showing an export interval in configuration. Updated the `PeriodicMetricReader` setup to use the configured interval.
- The resource configuration used `ResourceAttributes`, which is deprecated in the Java semantic conventions artifact and also required an undeclared dependency in the shown POM. Replaced those constants with the semantic convention attribute names directly.
- The HTTP OTLP exporter always appended `/v1/metrics`, which could produce an invalid URL if the configured endpoint already included that path. Added a helper to append the metrics path only when needed.
- The custom payment metric used `registry.gauge("payments.amount", amount)` for a per-payment amount. Gauges are for observed state, not recording event values, and immutable number gauges are not appropriate for this use. Replaced it with a `DistributionSummary`.
- Removed the `@Timed` annotation and unused `TimeUnit` import from the custom service example because the method already records timing manually and `@Timed` on arbitrary service methods requires additional aspect configuration not shown in the post.

## Review Notes
The post is now technically consistent with current official documentation. Maven is not installed in this workspace, so I could not compile the Java snippets locally; validation was performed against official Spring Boot, OpenTelemetry, Micrometer, Javadoc, and Maven Central sources.
