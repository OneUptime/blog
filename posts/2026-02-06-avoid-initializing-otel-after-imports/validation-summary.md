# Validation Summary: How to Avoid the Anti-Pattern of Initializing OpenTelemetry SDK After Importing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- Node.js CommonJS preload flags
- Node.js ESM preload behavior
- Express
- OpenTelemetry Python SDK
- OpenTelemetry Python Flask instrumentation
- Python zero-code instrumentation

## Sources Consulted
- OpenTelemetry Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript resources API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- Node.js CLI documentation via local `node --help` for `--require`, `--import`, and loader flags.
- Current package import checks for `@opentelemetry/resources`, `@opentelemetry/sdk-node`, `@opentelemetry/semantic-conventions`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp-proto-http`, and `opentelemetry-instrumentation-flask`.

## Issues Found
- The Node.js setup snippet used `const { Resource } = require('@opentelemetry/resources')` and `new Resource(...)`. Current OpenTelemetry JavaScript exports `resourceFromAttributes(...)` instead of a public `Resource` constructor, so the snippet would fail with current packages. Changed it to `const { resourceFromAttributes } = require('@opentelemetry/resources')` and `resourceFromAttributes({ ... })`.
- The broken-pattern explanation said no HTTP spans are generated. A local check with current packages showed the expected server-side Express/HTTP spans were missing when Express was loaded before SDK startup, but unrelated client-side spans can still be generated. Changed the wording to "the expected server-side HTTP and Express spans may not be generated."
- The TypeScript trap recommended only the `--require` approach. Current OpenTelemetry documentation distinguishes CommonJS preload from ESM preload/loader behavior. Updated the note to recommend a preload file generally, using `--require` for CommonJS output and `--import` or the OpenTelemetry ESM loader hook for ESM output as appropriate.

## Review Notes
The Python manual Flask example is valid with current OpenTelemetry Python packages. The post intentionally uses CommonJS for the Node.js example, where `node --require ./tracing.js app.js` remains a valid preload pattern.
