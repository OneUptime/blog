# Validation Summary: How to Trace Mobile App API Calls with OpenTelemetry Context Propagation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry context propagation
- W3C Trace Context
- iOS / Swift
- Android / Kotlin
- OkHttp
- Flutter / Dart
- Dio
- Node.js / Express
- OpenTelemetry JavaScript instrumentation

## Sources Consulted
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry Swift repository and URLSession instrumentation docs: https://github.com/open-telemetry/opentelemetry-swift
- OpenTelemetry Swift Core API source: https://github.com/open-telemetry/opentelemetry-swift-core
- OpenTelemetry Java TextMapPropagator and Kotlin coroutine extension source: https://github.com/open-telemetry/opentelemetry-java
- OpenTelemetry JavaScript Node.js documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript source for NodeTracerProvider and W3CTraceContextPropagator: https://github.com/open-telemetry/opentelemetry-js
- Dart opentelemetry package and API reference: https://pub.dev/packages/opentelemetry and https://pub.dev/documentation/opentelemetry/latest/api/

## Issues Found
- The Swift propagation snippet used a non-current `OpenTelemetryContext.current.withSpan(span)` style API and injected a full context into the propagator. Updated it to use the current `TextMapPropagator.inject(spanContext:carrier:setter:)` API from `opentelemetry-swift-core`.
- The Swift snippet used `span.setStatus(...)`, but current Swift spans expose `status` as a property. Updated status assignments to `span.status = ...`.
- The second Swift snippet used the `Tracer` type without importing `OpenTelemetryApi`. Added the missing import.
- Several snippets used deprecated HTTP semantic convention attributes such as `http.method`, `http.url`, `http.status_code`, `http.host`, and `http.target`. Updated them to current stable names such as `http.request.method`, `url.full`, `http.response.status_code`, `server.address`, and `url.path`.
- The Android OkHttp client created a manual span while also installing an interceptor, but the span was not made current during the request. Updated the request execution to run under `span.makeCurrent()` so the interceptor can avoid double instrumentation.
- The Android automatic interceptor created spans but did not inject trace context headers. Added propagator injection into a rebuilt OkHttp request.
- The Android repository snippet used `asContextElement()` without importing the Kotlin OpenTelemetry extension. Added `io.opentelemetry.extension.kotlin.asContextElement`.
- The Flutter snippet used a non-existent Dart `spanBuilder` API and string-based `setAttribute` overloads. Updated it to use `tracer.startSpan(...)`, `SpanKind.client`, and `Attribute.from...` constructors from the current Dart API.
- The Node.js backend snippet referenced `express`, `tracer`, and `SpanStatusCode` without defining them. Added the missing imports and tracer creation.
- The Node.js backend snippet loaded Express before registering instrumentation, which can prevent instrumentation from patching the module. Moved `require('express')` after `registerInstrumentations(...)`.

## Review Notes
- The examples remain illustrative and omit production exporter, resource, and processor setup for brevity.
- OpenTelemetry Swift and Dart APIs are still evolving compared with the more mature Java and JavaScript APIs, so future SDK releases may require minor syntax updates.
