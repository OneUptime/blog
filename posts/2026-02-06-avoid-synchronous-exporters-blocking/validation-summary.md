# Validation Summary: How to Avoid the Anti-Pattern of Using Synchronous Exporters That Block Your

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry tracing SDK
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- OTLP trace exporters
- SimpleSpanProcessor and BatchSpanProcessor

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript NodeSDK configuration TypeDoc: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- OpenTelemetry JavaScript NodeSDK source: https://github.com/open-telemetry/opentelemetry-js/blob/06ad0eaaecbd49f5ead871325f852cc2a3454079/experimental/packages/opentelemetry-sdk-node/src/sdk.ts
- OpenTelemetry JavaScript SpanProcessor and SpanExporter TypeDoc: https://open-telemetry.github.io/opentelemetry-js/
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java BatchSpanProcessorBuilder Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.26.0/io/opentelemetry/sdk/trace/export/BatchSpanProcessorBuilder.html

## Issues Found
- The post stated that `span.end()` always blocks until export completes. The OpenTelemetry specification allows language-specific exporter completion behavior, and OpenTelemetry JavaScript exporters use a callback-based `export()` API. Updated the wording to say that the simple processor calls export inline and can block in synchronous SDKs/exporters.
- The NodeSDK example used the deprecated `spanProcessor` option. Updated it to the current `spanProcessors` array option.
- The ConsoleSpanExporter example referenced `NodeSDK` without importing it. Added the missing import so the example is complete.
- The text called the batching component a "batch exporter" in one place. Updated it to "batch processor" to match OpenTelemetry terminology.
- Several headings, descriptions, and comments referred to "synchronous exporters" where the code was configuring span processors. Updated those references to distinguish simple processors from exporters.

## Review Notes
The Java, Python, and JavaScript BatchSpanProcessor option names and defaults shown in the post align with the OpenTelemetry specification and language SDK documentation. The "min 1000" guidance for schedule delay is conservative operational advice rather than a universal SDK API minimum; no change was made.
