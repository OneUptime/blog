# Validation Summary: How to Monitor iOS App Launch Performance with OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iOS app launch lifecycle
- Swift and SwiftUI
- UIKit AppDelegate lifecycle callbacks
- OpenTelemetry Swift tracing API and SDK
- OpenTelemetry spans, span processors, resources, and exporters
- Xcode launch-time diagnostics and DYLD_PRINT_STATISTICS

## Sources Consulted
- OpenTelemetry Swift documentation: https://opentelemetry.io/docs/languages/swift/
- OpenTelemetry Swift instrumentation documentation: https://opentelemetry.io/docs/languages/swift/instrumentation/
- OpenTelemetry Swift repository README: https://github.com/open-telemetry/opentelemetry-swift
- OpenTelemetry Swift Core SpanBuilder API: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetryApi/Trace/SpanBuilder.swift
- OpenTelemetry Swift Core TracerProviderBuilder API: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetrySdk/Trace/TracerProviderBuilder.swift
- OpenTelemetry Swift Core StdoutSpanExporter API: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/Exporters/Stdout/StdoutSpanExporter.swift
- OpenTelemetry Swift Core semantic conventions: https://github.com/open-telemetry/opentelemetry-swift-core/blob/main/Sources/OpenTelemetryApi/Common/SemanticAttributes/Attributes/Service_attributes.swift
- Apple Developer Documentation, Reducing your app's launch time: https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time
- Apple Developer Documentation, Responding to the launch of your app: https://developer.apple.com/documentation/UIKit/responding-to-the-launch-of-your-app

## Issues Found
- Replaced the blanket claim that Apple recommends launch time under 400 milliseconds. Apple's current documentation frames launch performance around the time from tapping the app icon to first screen draw and responsiveness, rather than a universal 400 ms rule.
- Corrected the launch type explanation. The original wording described warm starts as recently terminated apps; the revised text treats warm starts as process relaunches where cached system work may help, and distinguishes resumes as foreground returns without a new process launch.
- Fixed `AppDelegate.init` phase recording. The original code called `recordPhase` before the launch tracer was initialized, so the phase would be dropped. Added pending phase buffering and replay after tracer initialization.
- Added `recordMilestone` so first-paint and app-active events can be attached to the launch span instead of creating unrelated root spans.
- Updated OpenTelemetry imports and stdout exporter usage. The current Swift package exposes the stdout span exporter from the `StdoutExporter` target and the concrete current type is `StdoutSpanExporter`; `StdoutExporter` is only a deprecated typealias.
- Replaced deprecated `ResourceAttributes.serviceName` usage with `SemanticConventions.Service.name`.
- Adjusted `applicationDidBecomeActive` to record a milestone instead of ending the launch span before the first-paint sample can attach to it.
- Updated the pre-main sample so the estimated pre-main phase is recorded through `LaunchPerformanceTracer`, preserving the trace hierarchy described later in the post.
- Fixed async initialization tracing so the parent `async_initialization` span starts before child tasks and child task spans call `setParent(parentSpan)`.
- Added missing `UIKit` import to the launch analyzer sample because it uses `UIDevice`.
- Reworked warm-start detection to use background-entry timestamps and noted that iOS termination callbacks are not guaranteed.

## Review Notes
The code remains illustrative and still depends on app-specific integration details, exporter configuration, and when the app chooses to call `completeLaunch()`. The launch type detector is intentionally approximate; production implementations should combine lifecycle state, app version, scene lifecycle, and backend analysis rather than treating one timestamp as authoritative.
