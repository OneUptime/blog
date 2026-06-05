# Validation Summary: How to Add OpenTelemetry Tracing to an iOS App with opentelemetry-swift

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- opentelemetry-swift
- Swift
- iOS
- Swift Package Manager
- Distributed tracing

## Sources Consulted
- OpenTelemetry Swift instrumentation documentation: https://opentelemetry.io/docs/languages/swift/instrumentation/
- OpenTelemetry Swift repository README: https://github.com/open-telemetry/opentelemetry-swift/blob/main/README.md
- OpenTelemetry Swift Package.swift: https://github.com/open-telemetry/opentelemetry-swift/blob/main/Package.swift
- OpenTelemetry Swift releases: https://github.com/open-telemetry/opentelemetry-swift/releases
- OpenTelemetry Swift Core Span API source: https://github.com/open-telemetry/opentelemetry-swift-core/tree/main/Sources/OpenTelemetryApi/Trace
- OpenTelemetry trace specification: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/api.md

## Issues Found
- The Swift Package Manager snippet used `opentelemetry-swift` from `1.5.0` and did not include the current `opentelemetry-swift-core` package or target product dependencies needed for `OpenTelemetryApi`, `OpenTelemetrySdk`, and `StdoutExporter`. Updated the snippet to use the current `2.4.1` release line and include both package and target dependencies.
- The initialization example described `SimpleSpanProcessor` as batching spans. Official OpenTelemetry Swift documentation states `SimpleSpanProcessor` immediately forwards ended spans, while `BatchSpanProcessor` batches them. Updated the comment accordingly.
- The AppDelegate lifecycle example created the tracer property before `TelemetryManager.shared.initialize()` registered the SDK provider, which could bind it to the default no-op provider. Changed it to a computed tracer property and added the required `OpenTelemetryApi` import so tracer lookup happens after provider registration.

## Review Notes
The manual span creation, parent-child span relationship, span attributes, span status usage, and stdout exporter examples match the current OpenTelemetry Swift API. In production, the post correctly notes that an OTLP exporter and sampling strategy should replace the development stdout-only setup.
