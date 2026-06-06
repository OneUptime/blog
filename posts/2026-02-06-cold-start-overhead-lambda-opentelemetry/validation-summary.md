# Validation Summary: How to Handle Cold Start Overhead in Lambda with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- AWS Lambda provisioned concurrency
- Node.js on AWS Lambda
- OpenTelemetry JavaScript SDK
- OpenTelemetry metrics and tracing APIs
- OpenTelemetry Collector and OTLP HTTP exporter
- Serverless Framework configuration

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript SDK for Node.js API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript metrics SDK API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-metrics.html
- OpenTelemetry JavaScript OTLP trace HTTP exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-http.html
- OpenTelemetry JavaScript SimpleSpanProcessor API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-base.SimpleSpanProcessor.html
- OpenTelemetry Resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry FaaS semantic conventions: https://opentelemetry.io/docs/specs/semconv/faas/
- OpenTelemetry FaaS attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/faas/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Functions as a Service documentation: https://opentelemetry.io/docs/platforms/faas/
- AWS Lambda execution environment lifecycle documentation: https://docs.aws.amazon.com/lambda/latest/dg/running-lambda-code.html
- AWS Lambda provisioned concurrency documentation: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The cold-start metric example imported `MeterProvider` but did not register a working global meter provider, so `metrics.getMeter()` would use the default no-op provider. Added a `MeterProvider` with a `PeriodicExportingMetricReader` and `OTLPMetricExporter`, then registered it with `metrics.setGlobalMeterProvider()`.
- The cold-start metric example used the non-standard attribute name `faas.cold_start`. Changed it to the OpenTelemetry semantic convention attribute `faas.coldstart`.
- The lazy tracer initialization example referenced `Resource` without importing it and used the outdated `new Resource(...)` pattern. Updated the example to import and use `resourceFromAttributes()` from `@opentelemetry/resources`.
- The lazy tracer initialization example used `provider.addSpanProcessor(...)`, which is not part of the current `NodeTracerProvider` API reference. Updated it to configure `spanProcessors` in the `NodeTracerProvider` constructor.
- The lazy tracer initialization text and code recommended `SimpleSpanProcessor` as an overhead optimization. Current OpenTelemetry JS docs warn that `SimpleSpanProcessor` exports each ended span individually and has significant performance overhead with most exporters. Replaced it with `BatchSpanProcessor`.
- The sampling example used `NodeTracerProvider` without importing it. Added the missing import.
- The sampling explanation said unsampled invocations skip span creation entirely. Updated it to say unsampled root traces use non-recording spans and are not exported.
- The Serverless Framework example used `nodejs20.x`, which AWS Lambda runtime documentation now lists as deprecated as of April 30, 2026. Updated it to `nodejs22.x`.
- Several precise latency ranges were presented as general facts without official backing. Reworded those claims to qualitative statements about measurable or possible latency reduction.

## Review Notes
The post is valid after correction. The performance impact of OpenTelemetry in Lambda remains workload-specific, so future updates should use measured benchmark data if the post wants to include exact millisecond ranges.
