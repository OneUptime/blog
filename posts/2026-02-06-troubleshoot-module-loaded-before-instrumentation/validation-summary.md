# Validation Summary: How to Troubleshoot the 'Module Has Been Loaded Before Instrumentation' Error

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry Node.js SDK
- OpenTelemetry auto-instrumentation
- Node.js CommonJS and ESM module loading
- TypeScript runtime preloading
- Jest setup configuration

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript instrumentation package API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- OpenTelemetry JavaScript instrumentation source for preload warning and patch debug messages: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation/src/platform/node/instrumentation.ts
- Node.js command-line API documentation for `--require`, `--import`, and `NODE_OPTIONS`: https://nodejs.org/api/cli.html
- Node.js ECMAScript modules documentation: https://nodejs.org/api/esm.html
- Jest configuration documentation for `setupFiles` and `globalSetup`: https://jestjs.io/docs/configuration

## Issues Found
- The post stated that auto-instrumentation "will not work" and that no spans will be emitted whenever the warning appears. Changed this to "may not work" because OpenTelemetry's warning and implementation describe the hook as potentially ineffective rather than universally impossible for every later code path.
- The TypeScript section incorrectly claimed that two static imports in source order are broken because both are hoisted and dependency-graph order ignores the written order. Replaced the example with the real failure mode: static imports run before the containing module body, so tracing setup code in the same file is too late.
- The TypeScript command examples included a questionable `ts-node --require ./tracing.ts app.ts` form and did not mention the OpenTelemetry ESM loader hook. Replaced them with documented `tsx --import`, `ts-node/register` preload, and compiled ESM loader-hook examples.
- The Jest section recommended `globalSetup` for tracing initialization. Changed this because Jest's `globalSetup` runs once before test suites and does not make globals or module state available to test suites; `setupFiles` or Node `NODE_OPTIONS=--require ...` is the appropriate preload mechanism for modules loaded by tests.
- The verification section showed debug messages that did not match current OpenTelemetry instrumentation debug text. Updated the examples to match the current "nodejs core module" and generic "module" require-hook messages.
- The transitive dependency section overgeneralized that SDK packages import `http` and `https` internally. Reworded it to refer to SDK, exporter, or custom tracing setup code that can import those modules depending on configuration.

## Review Notes
The post is technically relevant and useful. The `Module._load` debugging example uses a private Node.js API, which is acceptable for temporary troubleshooting but should not be treated as production instrumentation.
