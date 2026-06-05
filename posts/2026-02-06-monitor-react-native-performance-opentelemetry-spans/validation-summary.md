# Validation Summary: How to Monitor React Native App Performance with OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- OpenTelemetry JavaScript
- OpenTelemetry tracing spans
- OTLP HTTP trace export
- React components and hooks
- React Navigation
- JavaScript fetch instrumentation
- React Native native modules

## Sources Consulted
- OpenTelemetry React Native demo documentation: https://opentelemetry.io/docs/demo/services/react-native-app/
- OpenTelemetry JavaScript API TypeDoc: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api._opentelemetry_api.html
- OpenTelemetry JavaScript Tracer API: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Tracer.html
- OpenTelemetry WebTracerProvider TypeDoc: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-web.WebTracerProvider.html
- React Native Hermes documentation: https://reactnative.dev/docs/hermes
- React Native JavaScript Environment documentation: https://reactnative.dev/docs/javascript-environment
- React Native New Architecture announcement: https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here
- React Native 0.84 release notes: https://reactnative.dev/blog/2026/02/11/react-native-0.84
- npm registry checks for @opentelemetry/react-native, @opentelemetry/instrumentation-fetch-node, @opentelemetry/instrumentation-fetch, @opentelemetry/sdk-trace-web
- Current npm package type exports for @opentelemetry/resources, @opentelemetry/core, and @opentelemetry/semantic-conventions

## Issues Found
- The installation commands referenced unpublished packages: `@opentelemetry/react-native` and `@opentelemetry/instrumentation-fetch-node`. Removed them and added the current web tracing/resource packages used by OpenTelemetry's React Native demo.
- The provider setup used outdated APIs: `new Resource(...)`, `SemanticResourceAttributes`, `provider.addSpanProcessor(...)`, and `registerGlobals(provider)`. Updated it to use `resourceFromAttributes`, current semantic convention constants, `spanProcessors` in `WebTracerProvider`, and `provider.register(...)` with W3C propagators.
- Several snippets used `trace.SpanKind` and `trace.SpanStatusCode`, but these are exported as `SpanKind` and `SpanStatusCode` from `@opentelemetry/api`. Updated imports and usages.
- The component HOC attempted to call wrapped component lifecycle methods via `super`, which would not invoke the wrapped component. Removed those calls and used React `Profiler` for render-duration measurement.
- Parent span relationships were represented as `{ parent: span }`, which is not a valid OpenTelemetry JS `startSpan` option. Updated child span creation to pass a context containing the parent span.
- The hooks example left async fetch work outside the traced span. Changed the usage to trace the async loading callback and trigger it from a normal React effect.
- The traced callback helper could become unstable when passed inline callbacks. Updated it to keep the latest callback in a ref while preserving dependency-driven memoization.
- The effect cleanup helper could call non-function return values. Restricted cleanup tracing to function cleanups.
- The navigation example used React hooks outside a component in `createInstrumentedNavigator` and missed imports. Replaced the hook ref with a plain ref object and added the needed imports.
- The navigation focus handler could create duplicate active screen spans. Added a guard before starting a new screen span.
- The fetch wrapper manually built a `traceparent` header and hard-coded flags. Replaced it with `propagation.inject(...)`.
- The native module example used `AsyncStorage` through `NativeModules`, which is not the current community package usage. Replaced the example with a generic native module.
- The post described React Native communication only as bridge-based. Updated the wording to account for current React Native New Architecture, JSI, TurboModules, and Fabric while preserving legacy bridge caveats.

## Review Notes
OpenTelemetry's official documentation states that JavaScript OpenTelemetry packages are supported for Node.js and web environments and can work in React Native, but React Native support is not explicitly guaranteed and may require workarounds. Future revisions could add version-pinned examples for a specific React Native and OpenTelemetry JS release pair.
