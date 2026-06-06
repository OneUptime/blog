# Validation Summary: How to Collect Device Resource Information with OpenTelemetry on iOS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Swift API and SDK
- OpenTelemetry resource attributes and semantic conventions
- Swift
- iOS UIKit device, screen, and app metadata APIs
- Foundation ProcessInfo, Bundle, Locale, TimeZone, and FileManager APIs
- Network framework NWPathMonitor

## Sources Consulted
- OpenTelemetry Swift official documentation: https://opentelemetry.io/docs/languages/swift/
- OpenTelemetry Swift GitHub README and package metadata: https://github.com/open-telemetry/opentelemetry-swift
- OpenTelemetry Swift Core `Resource` source: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetrySdk/Resources/Resource.swift
- OpenTelemetry Swift Core `TracerProviderBuilder` source: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetrySdk/Trace/TracerProviderBuilder.swift
- OpenTelemetry Swift Core `TracerProviderSdk` source: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetrySdk/Trace/TracerProviderSdk.swift
- OpenTelemetry Swift Core `BatchSpanProcessor` source: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetrySdk/Trace/SpanProcessors/BatchSpanProcessor.swift
- OpenTelemetry Swift Core `StdoutSpanExporter` source: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/Exporters/Stdout/StdoutSpanExporter.swift
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry device resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/device/
- Apple UIDevice documentation: https://developer.apple.com/documentation/uikit/uidevice/systemname

## Issues Found
- The code used deprecated OpenTelemetry Swift `ResourceAttributes` constants. Replaced them with the current `SemanticConventions` namespaces used by the Swift API, such as `SemanticConventions.Service.name`, `SemanticConventions.Device.modelIdentifier`, `SemanticConventions.Os.version`, and `SemanticConventions.Process.executablePath`.
- The deployment environment examples used the older `deployment.environment` key. Updated them to `SemanticConventions.Deployment.environmentName.rawValue`, which emits the current `deployment.environment.name` semantic attribute.
- Several standalone snippets used `Resource` without importing `OpenTelemetrySdk`. Added the missing imports where needed.
- The app configuration snippet used `UIScreen` while importing only `Foundation` and OpenTelemetry. Added `UIKit`.
- The network snippet used `DispatchQueue` and `Resource` without explicit module imports. Added `Foundation` and `OpenTelemetrySdk`.
- The exporter example returned deprecated `StdoutExporter()`. Updated it to `StdoutSpanExporter()` and added `import StdoutExporter` to snippets that use it.
- The runtime resource inspection example accessed `OpenTelemetry.instance.tracerProvider.resource`, but the public tracer provider is the `TracerProvider` protocol and does not expose a `resource` property. Updated the example to cast to `TracerProviderSdk` and call `getActiveResource()`.
- The process executable path example indexed `processInfo.arguments[0]` directly. Changed it to safely use `processInfo.arguments.first`.

## Review Notes
The post is technically valid after the corrections. The network resource example still represents a startup snapshot, and the post correctly notes that changing network state should be captured as span attributes or events rather than static resource attributes.
