# Validation Summary: How to Instrument Core Data Operations with OpenTelemetry in Swift

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Swift
- Core Data
- OpenTelemetry Swift
- Swift Package Manager
- iOS app tracing

## Sources Consulted
- OpenTelemetry Swift documentation: https://opentelemetry.io/docs/languages/swift/
- OpenTelemetry Swift instrumentation documentation: https://opentelemetry.io/docs/languages/swift/instrumentation/
- OpenTelemetry Swift Core Package.swift: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Package.swift
- OpenTelemetry Swift Core `Span` API: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetryApi/Trace/Span.swift
- OpenTelemetry Swift Core `SpanBuilder` API: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetryApi/Trace/SpanBuilder.swift
- OpenTelemetry Swift Core `TracerProviderBuilder` API: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetrySdk/Trace/TracerProviderBuilder.swift
- OpenTelemetry Swift Core `Resource` and semantic conventions APIs: https://github.com/open-telemetry/opentelemetry-swift-core/tree/main/Sources/OpenTelemetryApi/Common/SemanticAttributes
- OpenTelemetry Swift Core `StdoutSpanExporter`: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/Exporters/Stdout/StdoutSpanExporter.swift
- Apple `NSFetchRequest` documentation: https://developer.apple.com/documentation/coredata/nsfetchrequest
- Apple `NSBatchUpdateRequestResultType` documentation: https://developer.apple.com/documentation/coredata/nsbatchupdaterequestresulttype
- Apple Core Data Batch Updates guide: https://developer.apple.com/library/archive/featuredarticles/CoreData_Batch_Guide/BatchUpdates/BatchUpdates.html
- Apple `NSManagedObjectContext` notification keys documentation: https://developer.apple.com/documentation/coredata/nsinsertedobjectskey
- Apple `NSPersistentContainer` documentation: https://developer.apple.com/documentation/coredata/nspersistentcontainer

## Issues Found
- The dependency snippet used `opentelemetry-swift` from `1.0.0`, while the shown API, SDK, and stdout exporter imports are provided by the current `opentelemetry-swift-core` package. Updated the dependency to `opentelemetry-swift-core.git` from `2.4.1`, the latest release checked during validation.
- The setup prose claimed the example used an OTLP exporter, but the code used stdout export. Updated the prose to describe stdout local debugging and mention OTLP as the production exporter option.
- The setup code imported `ResourceExtension` and used deprecated `ResourceAttributes`. Removed the obsolete import and changed resource attribute keys to current `SemanticConventions` values.
- The setup code constructed deprecated `StdoutExporter()`. Replaced it with `StdoutSpanExporter()`.
- The span examples used `span.setStatus(status:)`, which is not part of the current Swift API. Replaced those calls with assignments to the `span.status` property.
- The fetch instrumentation treated `fetchLimit` and `fetchBatchSize` as optionals. Apple documents them as integer properties, so the checks now compare their values directly.
- The batch-update affected-row extraction only handled `Int`. Added an `NSNumber` fallback because Core Data result values may bridge from Objective-C numeric types.
- The context monitoring section claimed to monitor merge timing, but the code only observes `NSManagedObjectContextDidSave` notifications and records object counts. Renamed the section, span, operation label, and usage method to describe context save notification monitoring accurately.

## Review Notes
Swift is not installed in the validation workspace, so the snippets could not be locally compiled. The corrections were validated against official OpenTelemetry Swift source/docs and Apple Core Data documentation.
