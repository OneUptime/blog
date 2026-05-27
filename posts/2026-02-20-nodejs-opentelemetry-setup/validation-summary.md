# Validation Summary: How to Set Up OpenTelemetry for Node.js Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- OpenTelemetry JavaScript SDK
- OpenTelemetry automatic instrumentation for Node.js
- OpenTelemetry traces, metrics, and context propagation
- OTLP/HTTP exporters
- OpenTelemetry Collector
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry JavaScript Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript API reference for `resourceFromAttributes`: https://open-telemetry.github.io/opentelemetry-js/functions/_opentelemetry_resources.resourceFromAttributes.html
- OpenTelemetry JavaScript API reference for `NodeSDKConfiguration`: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- OpenTelemetry JavaScript HTTP instrumentation configuration: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_instrumentation-http.HttpInstrumentationConfig.html
- OpenTelemetry JavaScript context propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector OTLP HTTP exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlphttpexporter
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- npm package metadata/readmes for current OpenTelemetry packages: `@opentelemetry/resources`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, and `@opentelemetry/exporter-metrics-otlp-http`

## Issues Found
- The instrumentation example imported `Resource` from `@opentelemetry/resources` and used `new Resource(...)`. Current `@opentelemetry/resources` exposes `Resource` as a type/interface and uses `resourceFromAttributes(...)` to create resources, so the example would fail at runtime in CommonJS. Changed the import and resource creation to use `resourceFromAttributes`.
- The `NodeSDK` example used the deprecated `metricReader` option. Current `NodeSDKConfiguration` marks `metricReader` deprecated in favor of `metricReaders`. Changed the configuration to `metricReaders: [metricReader]`.
- The OneUptime Collector configuration used `https://otlp.oneuptime.com` and omitted JSON encoding. Current OneUptime documentation shows `https://oneuptime.com/otlp` for OTLP ingestion and requires `encoding: json` with `Content-Type: application/json` when exporting through the Collector OTLP HTTP exporter. Updated the endpoint, encoding, and header.

## Review Notes
The JavaScript SDK and several OpenTelemetry Node.js packages remain actively versioned, and some packages used here are still marked experimental by their npm readmes. The corrected examples were checked against current package metadata and a temporary install of the listed dependencies.
