# Validation Summary: How to Fix 'No Traces Appearing' When Your OpenTelemetry SDK Initialization

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- Node.js CommonJS module loading and preloading
- Docker
- Kubernetes
- Jest
- AWS Lambda

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/js/
- OpenTelemetry JavaScript zero-code configuration documentation: https://opentelemetry.io/docs/zero-code/js/configuration/
- OpenTelemetry JavaScript serverless documentation: https://opentelemetry.io/docs/languages/js/serverless/
- OpenTelemetry JavaScript instrumentation source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-js/main/experimental/packages/opentelemetry-instrumentation/src/platform/node/instrumentation.ts
- Node.js CLI documentation for `--require` and `NODE_OPTIONS`: https://nodejs.org/api/cli.html
- Node.js CommonJS module caching documentation: https://nodejs.org/api/modules.html#caching
- Jest configuration documentation for `setupFiles`: https://jestjs.io/docs/configuration#setupfiles-array
- Current `@opentelemetry/resources` package export metadata from npm

## Issues Found
- The `tracing.js` example imported `Resource` from `@opentelemetry/resources` and constructed it with `new Resource(...)`. Current OpenTelemetry JavaScript documentation uses `resourceFromAttributes()`, and the current package exports `Resource` only as a type, not a runtime constructor. Changed the example to import and use `resourceFromAttributes()`.
- The example "loaded before" diagnostic warning omitted the rest of the current OpenTelemetry warning text. Updated the warning to match the instrumentation source more closely.
- The second fix was labeled "Dynamic Import" even though it used CommonJS `require()`, not JavaScript dynamic `import()`. Renamed it to "Require Tracing in Application Entry Point" and adjusted the sentence below it.
- The Jest gotcha said to use `jest.setup.js`, which is ambiguous and can map to `setupFilesAfterEnv` in many projects. Changed it to recommend Jest `setupFiles`, which runs before test files load.
- The AWS Lambda gotcha said tracing belongs in the handler wrapper "not in module scope." Official OpenTelemetry JavaScript serverless docs preload a Lambda wrapper before the handler using `NODE_OPTIONS`. Changed the note to recommend a preloaded wrapper.

## Review Notes
The main diagnosis and fix are correct for CommonJS-based Node.js applications: OpenTelemetry instrumentation must be initialized before instrumented modules are loaded. For ESM applications, future revisions could add a separate note about Node's `--import` preloading path, but the post's CommonJS examples are now technically accurate.
