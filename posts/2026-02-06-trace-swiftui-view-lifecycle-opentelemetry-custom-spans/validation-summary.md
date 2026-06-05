# Validation Summary: How to Trace SwiftUI View Lifecycle Events with OpenTelemetry Custom Spans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Swift
- SwiftUI
- OpenTelemetry Swift
- iOS view lifecycle instrumentation
- OpenTelemetry custom spans

## Sources Consulted
- OpenTelemetry Swift documentation: https://opentelemetry.io/docs/languages/swift/
- OpenTelemetry Swift instrumentation documentation: https://opentelemetry.io/docs/languages/swift/instrumentation/
- OpenTelemetry Swift GitHub repository: https://github.com/open-telemetry/opentelemetry-swift
- OpenTelemetry Swift Core `SpanBuilder` API: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetryApi/Trace/SpanBuilder.swift
- OpenTelemetry Swift Core `Span` API: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetryApi/Trace/Span.swift
- Apple SwiftUI input and event modifiers documentation: https://developer.apple.com/documentation/SwiftUI/View-Input-and-Events
- Apple SwiftUI `onChange(of:initial:_:)` documentation: https://developer.apple.com/documentation/swiftui/view/onchange%28of%3Ainitial%3A_%3A%29

## Issues Found
- The navigation tracking example started navigation spans in `TrackedNavigationLink`, but the shown destination wrapper owned an unset local `navigationId`, so destination appearance could not complete the span. I updated the wrapper to accept a navigation ID and updated `TrackedNavigationLink` to complete the span when the destination appears.
- The hierarchy tracing example used a simple stack. Because sibling SwiftUI views can be visible at the same time, this could incorrectly make sibling sections appear as nested child spans. I changed the tracer to keep active spans by name and set parent spans explicitly.
- The hierarchy diagram showed `StatCard` child spans that the code did not instrument. I updated the diagram so it matches the spans actually created by the code.
- The interaction tracing example used the deprecated one-parameter `onChange(of:perform:)` form. I updated the examples to use the current zero-parameter `onChange(of:initial:_:)` closure form.

## Review Notes
The OpenTelemetry Swift tracing APIs used by the post, including `tracerProvider.get(...)`, `spanBuilder(spanName:)`, `setSpanKind`, `setStartTime`, `setParent`, span attributes, span status, and `end(time:)`, match the current OpenTelemetry Swift API. The render timing example remains an approximation because SwiftUI view structs are value descriptions of UI and `onAppear` timing depends on the specific view and container.
