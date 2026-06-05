# Validation Summary: How to Export OpenTelemetry Traces from an iOS App via OTLP HTTP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Swift
- OpenTelemetry Protocol (OTLP)
- OTLP HTTP/protobuf exporter
- Swift Package Manager
- iOS application lifecycle
- Swift `Network` framework

## Sources Consulted
- OpenTelemetry Swift documentation: https://opentelemetry.io/docs/languages/swift/
- OpenTelemetry Swift instrumentation documentation: https://opentelemetry.io/docs/languages/swift/instrumentation/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Swift 2.4.1 `Package.swift`: https://github.com/open-telemetry/opentelemetry-swift/blob/2.4.1/Package.swift
- OpenTelemetry Swift 2.4.1 `OtlpHttpTraceExporter`: https://github.com/open-telemetry/opentelemetry-swift/blob/2.4.1/Sources/Exporters/OpenTelemetryProtocolHttp/trace/OtlpHttpTraceExporter.swift
- OpenTelemetry Swift 2.4.1 `OtlpConfiguration`: https://github.com/open-telemetry/opentelemetry-swift/blob/2.4.1/Sources/Exporters/OpenTelemetryProtocolCommon/common/OtlpConfiguration.swift
- OpenTelemetry Swift Core 2.4.1 `BatchSpanProcessor`: https://github.com/open-telemetry/opentelemetry-swift-core/blob/2.4.1/Sources/OpenTelemetrySdk/Trace/SpanProcessors/BatchSpanProcessor.swift
- OpenTelemetry Swift Core 2.4.1 `SpanExporter`: https://github.com/open-telemetry/opentelemetry-swift-core/blob/2.4.1/Sources/OpenTelemetrySdk/Trace/Export/SpanExporter.swift
- OpenTelemetry Swift Core 2.4.1 `TracerProviderSdk`: https://github.com/open-telemetry/opentelemetry-swift-core/blob/2.4.1/Sources/OpenTelemetrySdk/Trace/TracerProviderSdk.swift

## Issues Found
- The package snippet used the old single-package 1.5.0 dependency layout and a non-existent `OtlpHttpTraceExporter` product. Updated it to the current 2.4.1 package split: `OpenTelemetryApi` and `OpenTelemetrySdk` from `opentelemetry-swift-core`, and `OpenTelemetryProtocolExporterHTTP` / `ResourceExtension` from `opentelemetry-swift`.
- The import examples used `import OtlpHttpTraceExporter`, which is not the module name. Replaced it with `OpenTelemetryProtocolExporterHttp` and added `OpenTelemetryProtocolExporterCommon` where `OtlpConfiguration` is used.
- Several snippets called `OtlpHttpTraceExporter(..., config: ..., useCompression: true)`, but the current exporter does not have a `useCompression` initializer parameter. Updated compression examples to use `OtlpConfiguration(compression: .gzip)`.
- The article manually set `Content-Encoding: gzip`. The SDK sets this header when configured with gzip compression, so the manual header was removed.
- The network failure section claimed automatic retry behavior and subclassed `BatchSpanProcessor`. `BatchSpanProcessor` is a struct, not a class, and cannot be subclassed. Replaced the custom subclass with a normal `BatchSpanProcessor` and an `NWPathMonitor` callback that calls `forceFlush()` when connectivity returns.
- The validation snippet treated `TracerProviderSdk.forceFlush(timeout:)` as returning success/failure. The current API returns `Void`, so the snippet now flushes and tells the user to check the backend for the test trace.
- The debug exporter wrapper was updated to match the current `SpanExporter` method signatures and marked as `@unchecked Sendable` for the current protocol conformance.
- Overstated delivery and retry language was softened. Mobile telemetry delivery is best effort; the exporter supports timeouts, compression, headers, and pending failed spans, but it does not guarantee delivery under all mobile termination and network conditions.

## Review Notes
- The development endpoint `localhost:4318` is suitable for a simulator or local testing setup, but a physical iOS device usually needs a reachable host name or LAN IP for the collector.
- A local Swift compiler was not available in the review environment, so validation was source-level against official package code and OpenTelemetry documentation rather than a compiled sample app.
