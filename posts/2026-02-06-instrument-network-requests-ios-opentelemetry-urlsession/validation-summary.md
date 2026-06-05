# Validation Summary: How to Instrument Network Requests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Swift
- OpenTelemetry URLSessionInstrumentation
- Swift Package Manager
- Swift
- iOS URLSession
- OpenTelemetry HTTP semantic conventions

## Sources Consulted
- OpenTelemetry Swift GitHub README: https://github.com/open-telemetry/opentelemetry-swift
- OpenTelemetry Swift Package.swift for version 2.4.1: https://github.com/open-telemetry/opentelemetry-swift/blob/2.4.1/Package.swift
- OpenTelemetry Swift URLSessionInstrumentation README: https://github.com/open-telemetry/opentelemetry-swift/blob/2.4.1/Sources/Instrumentation/URLSession/README.md
- OpenTelemetry Swift URLSessionInstrumentationConfiguration source: https://github.com/open-telemetry/opentelemetry-swift/blob/2.4.1/Sources/Instrumentation/URLSession/URLSessionInstrumentationConfiguration.swift
- OpenTelemetry Swift URLSessionLogger source: https://github.com/open-telemetry/opentelemetry-swift/blob/2.4.1/Sources/Instrumentation/URLSession/URLSessionLogger.swift
- OpenTelemetry Swift Core context provider source: https://github.com/open-telemetry/opentelemetry-swift-core/blob/2.4.1/Sources/OpenTelemetryApi/Context/OpenTelemetryContextProvider.swift
- Apple URLSession documentation: https://developer.apple.com/documentation/foundation/urlsession
- Swift Package Manager PackageDescription documentation: https://docs.swift.org/package-manager/PackageDescription/PackageDescription.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/

## Issues Found
- The Swift Package Manager example used only `opentelemetry-swift` at version 1.5.0 for API, SDK, and URLSession instrumentation products. Current OpenTelemetry Swift uses `opentelemetry-swift-core` for `OpenTelemetryApi` and `OpenTelemetrySdk`, while `URLSessionInstrumentation` remains in `opentelemetry-swift`. Updated the dependency snippet to use version 2.4.1 and the correct package names.
- The article described `URLSessionInstrumentation` as wrapping sessions through an `instrumentedSession(...)` API. The official package documents initialization of `URLSessionInstrumentation(configuration:)` to capture URLSession calls globally, and no `instrumentedSession` API exists in the checked sources. Updated all snippets to initialize and retain `URLSessionInstrumentation`, then create normal `URLSession` instances.
- The customization example used nonexistent `spanCustomizer` and a closure shape that received span, request, and response together. The official configuration exposes `spanCustomization`, `createdRequest`, `receivedResponse`, and `receivedError`. Updated the example to add request attributes through `spanCustomization` and response attributes through `receivedResponse`.
- The authentication example used a nonexistent `sanitizeHeaders` configuration hook. The URLSession instrumentation does not record arbitrary request headers by default. Removed the invalid sanitizer code and added guidance not to add sensitive headers through custom callbacks.
- The generated attribute list included an incorrect `http.response_content_length` attribute and implied response sizes are always captured. Current URLSession instrumentation sets `http.response.body.size` when the HTTP response has a `Content-Length` header. Updated the attribute example and surrounding explanation.
- The post did not mention the current `semanticConvention` option. Added a short caveat that current versions can emit legacy, stable, or duplicate HTTP semantic attributes.
- The upload example passed `self` as a URLSession delegate before `super.init()` in an `NSObject` subclass. Updated the snippet to initialize the delegate-backed `URLSession` after `super.init()`.
- The upload progress calculation divided by `totalBytesExpectedToSend` without guarding against unknown or zero expected size. Added a guard before computing progress.
- The parent-span example set an active span but did not remove it on completion. Added `removeContextForSpan` calls after ending the checkout span.

## Review Notes
The snippets were reviewed against official package sources and Apple documentation. They were not compiled in this Linux workspace because `URLSessionInstrumentation` is conditionally exposed for Darwin platforms in the Swift package.
