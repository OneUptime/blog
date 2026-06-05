# Validation Summary: How to Initialize OpenTelemetry Before NestJS Module Loading

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- NestJS
- Node.js preload flags
- TypeScript
- RxJS
- TypeORM and database driver instrumentation
- GraphQL resolvers

## Sources Consulted
- OpenTelemetry JavaScript Node.js getting started: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript instrumentation libraries: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript resources API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript NodeSDK API: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry JavaScript NodeTracerProvider API: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.node.NodeTracerProvider.html
- OpenTelemetry JavaScript propagation docs: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript instrumentation package docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- NestJS CLI usage docs: https://docs.nestjs.com/cli/usages
- NestJS HTTP module docs: https://docs.nestjs.com/techniques/http-module
- NestJS lifecycle events docs: https://docs.nestjs.com/fundamentals/lifecycle-events
- TypeScript TSConfig reference: https://www.typescriptlang.org/tsconfig/
- Node.js CLI help output for `--require` / `--import`
- Current npm package metadata for `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/semantic-conventions`, and `@opentelemetry/sdk-trace-node`

## Issues Found
- The OpenTelemetry resource examples imported `Resource` from `@opentelemetry/resources` and instantiated it with `new Resource(...)`. Current OpenTelemetry JS documents resources as an interface and exposes `resourceFromAttributes(...)` as the public factory, so both resource examples were updated.
- The examples used older `SEMRESATTRS_*` semantic convention constants. They were replaced with current `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME` constants.
- The database section stated that TypeORM instrumentation creates database spans. The current `@opentelemetry/auto-instrumentations-node` bundle includes NestJS core and database driver instrumentations, but not a TypeORM-specific instrumentation package. The wording was narrowed to automatic database driver instrumentation.
- The distributed tracing example imported `HttpService` from `@nestjs/common`. NestJS documents `HttpService` as exported by `@nestjs/axios`, so the import was corrected.
- The distributed tracing example used numeric span status code `2`. It was changed to `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- The testing example called `provider.addSpanProcessor(...)`, which is not present on the current `NodeTracerProvider` API. The example now passes `spanProcessors` to the provider constructor.

## Review Notes
The corrected OpenTelemetry/NestJS snippets were type-checked against current npm packages in a scratch project. The post intentionally uses CommonJS compilation and Node's `--require` preload path; ESM applications may need OpenTelemetry's ESM loader hook or Node's `--import` flow instead.
