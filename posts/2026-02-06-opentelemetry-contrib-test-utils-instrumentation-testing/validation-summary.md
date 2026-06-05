# Validation Summary: How to Use @opentelemetry/contrib-test-utils for Instrumentation Library Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript
- @opentelemetry/contrib-test-utils
- @opentelemetry/sdk-trace-node
- @opentelemetry/sdk-trace-base
- @opentelemetry/semantic-conventions
- Mocha
- TypeScript / Node.js

## Sources Consulted
- OpenTelemetry contrib-test-utils README: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/contrib-test-utils
- OpenTelemetry contrib-test-utils package metadata on npm: https://www.npmjs.com/package/@opentelemetry/contrib-test-utils
- OpenTelemetry contrib-test-utils source for `registerInstrumentationTesting`, `registerInstrumentationTestingProvider`, `getTestSpans`, and Mocha hooks: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/contrib-test-utils/src/instrumentations
- OpenTelemetry JS `NodeTracerProvider` and `BasicTracerProvider` source: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node
- OpenTelemetry JS `ReadableSpan` source: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/export/ReadableSpan.ts
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry semantic-conventions JavaScript package metadata: https://www.npmjs.com/package/@opentelemetry/semantic-conventions

## Issues Found
- The post described an `InstrumentationTestHelper` pattern that is not an exported contrib-test-utils API. Updated the wording to reference the actual Mocha root hook plugin and exported helpers.
- The setup example used `provider.addSpanProcessor(...)`, which is not part of the current OpenTelemetry JS 2.x provider API. Updated it to pass `spanProcessors` in the `NodeTracerProvider` constructor.
- The post implied `registerInstrumentationTesting` sets up the tracer provider and exporter by itself. Corrected this to explain that the Mocha root hook performs provider/exporter setup and `registerInstrumentationTesting` stores a singleton instrumentation instance.
- The examples checked deprecated HTTP attributes such as `http.method`, `http.url`, and `http.status_code`. Updated them to use current semantic convention constants for `http.request.method`, `url.full`, and `http.response.status_code`.
- The context propagation example used `ReadableSpan.parentSpanId`, which was removed from current OpenTelemetry JS in favor of `parentSpanContext`. Updated the assertion accordingly.
- The configuration and hook examples attempted to register new instrumentation instances after one was already registered. Since `registerInstrumentationTesting` returns the existing singleton, updated the examples to call `instrumentation.setConfig(...)` on the registered instance.
- The module-loading example used a static ES import after registration, but static imports are evaluated before module body code. Updated the example to use `require()` after registration and mention dynamic `import()` for ES modules.
- The post stated Jest works directly with the same setup. Clarified that the root hook is Mocha-specific and other test runners need manual provider/exporter lifecycle setup.
- Added the package caveat from the official README that contrib-test-utils is an internal utility package for OpenTelemetry contrib packages and gives no guarantees for outside use.

## Review Notes
The examples remain hypothetical because `HttpClientInstrumentation`, `makeHttpRequest`, and option names such as `ignoreUrls` are not tied to a specific published instrumentation package. The corrected OpenTelemetry APIs and semantic convention names match the current OpenTelemetry JS package line reviewed on 2026-06-05.
