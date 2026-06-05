# Validation Summary: How to Monitor Fastify Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Fastify
- OpenTelemetry JavaScript
- Node.js
- `@fastify/otel`
- OpenTelemetry HTTP and Node auto-instrumentation
- OTLP trace export
- Fastify plugins and lifecycle hooks

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript instrumentation libraries documentation: https://opentelemetry.io/docs/languages/js/libraries/
- Fastify hooks documentation: https://fastify.dev/docs/latest/Reference/Hooks/
- Fastify v5 migration guide: https://fastify.dev/docs/v5.7.x/Guides/Migration-Guide-V5/
- `@fastify/otel` README and package metadata: https://github.com/fastify/otel
- `@opentelemetry/instrumentation-fastify` package README and metadata: https://www.npmjs.com/package/@opentelemetry/instrumentation-fastify
- `@opentelemetry/instrumentation-http` package types and README: https://www.npmjs.com/package/@opentelemetry/instrumentation-http
- npm package metadata for current Fastify, `@fastify/cors`, `@fastify/helmet`, `fastify-plugin`, and OpenTelemetry packages.

## Issues Found
- The post recommended `@opentelemetry/instrumentation-fastify`, which is deprecated in favor of the Fastify-maintained `@fastify/otel` package and stopped publishing after June 30, 2025. Replaced the dependency and instrumentation setup with `@fastify/otel`.
- The OpenTelemetry resource snippet used `Resource.default()` and `new Resource()`, which are no longer exported by the current `@opentelemetry/resources` package. Updated the example to use `resourceFromAttributes()`.
- The semantic convention constants used `SemanticResourceAttributes`, which is outdated for current `@opentelemetry/semantic-conventions`. Updated the snippet to use `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- The instrumentation setup manually registered HTTP and Fastify instrumentation while also using `getNodeAutoInstrumentations()`, which can duplicate instrumentation. Moved HTTP options into `getNodeAutoInstrumentations()` and disabled the deprecated Fastify instrumentation there while registering `@fastify/otel`.
- The install commands omitted `fastify-plugin`, even though the plugin example requires it. Added the dependency.
- The server example used `reply.getResponseTime()`, which was removed in Fastify v5. Updated it to `reply.elapsedTime`.
- The database plugin used an `async` `onClose` hook with a `done` callback. Fastify documents that callback style must not be mixed with async/promise hooks. Updated it to the async-only form.
- The database plugin metadata specified `fastify: '4.x'` while the unpinned install command now resolves to Fastify 5. Updated the plugin metadata to `fastify: '5.x'`.
- The external API example required `node-fetch` without installing it, and current `node-fetch` is ESM-only. Removed the `require('node-fetch')` line so the CommonJS example uses the global `fetch` available in modern Node.js.
- The custom span examples used raw numeric status codes. Replaced them with `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api`.

## Review Notes
- The examples include custom attributes such as email addresses and connection strings. They are technically valid, but production implementations should consider redaction and data minimization policies before sending those values to telemetry backends.
