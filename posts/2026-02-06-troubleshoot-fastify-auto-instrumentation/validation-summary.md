# Validation Summary: How to Troubleshoot Fastify Instrumentation Not Being Applied by

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry Node SDK
- `@opentelemetry/auto-instrumentations-node`
- `@opentelemetry/instrumentation-fastify`
- `@opentelemetry/instrumentation-http`
- Fastify
- Node.js CommonJS and ES modules
- npm

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript instrumentation libraries docs: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry Node.js getting started docs: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry instrumentation package API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- `@opentelemetry/auto-instrumentations-node` npm README and package metadata: https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node
- `@opentelemetry/instrumentation-fastify` npm README and package metadata: https://www.npmjs.com/package/@opentelemetry/instrumentation-fastify
- Node.js CLI documentation for `--require`, `--import`, and loader flags: https://nodejs.org/api/cli.html

## Issues Found
- The post said current `getNodeAutoInstrumentations()` includes Fastify instrumentation. Current `@opentelemetry/auto-instrumentations-node` no longer includes it; the README says Fastify instrumentation was removed in March 2026 after deprecation in favor of `@fastify/otel`. Updated the introduction and Cause 1 to reflect that users must explicitly register `@opentelemetry/instrumentation-fastify` or migrate to `@fastify/otel`.
- The post said Fastify instrumentation was an optional peer dependency of `@opentelemetry/auto-instrumentations-node`. Current package metadata does not list it as an optional peer dependency. Replaced that claim with current removed/missing instrumentation guidance.
- The compatibility command used `npm info @opentelemetry/instrumentation-fastify peerDependencies`, but Fastify support is not exposed through that package's peer dependencies. Updated the command to inspect the package README and added the supported Fastify range `>=3.0.0 <6`.
- The SDK initialization and test examples used only `getNodeAutoInstrumentations()`, which does not register Fastify instrumentation in current versions. Added explicit `FastifyInstrumentation` registration.
- The test example used the deprecated `spanProcessor` NodeSDK option. Updated it to `spanProcessors`.
- The ESM command used an unexplained second `--import ./register.mjs`. Replaced it with the documented OpenTelemetry ESM loader hook command.
- The manual instrumentation section claimed Fastify instrumentation produces no spans without HTTP instrumentation. The official README says HTTP instrumentation is needed so spans are connected. Updated the wording to say spans may be disconnected.
- The custom `requestHook` used only `info.request.routerPath`, which is not the route source used by newer Fastify versions. Added a `routeOptions?.url` fallback before `routerPath`.

## Review Notes
The post is now technically accurate for current OpenTelemetry package behavior, but it still covers a deprecated OpenTelemetry Fastify instrumentation package. Future updates should consider rewriting the guide around `@fastify/otel`.
