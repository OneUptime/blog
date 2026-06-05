# Validation Summary: Troubleshoot NestJS Failing to Initialize OpenTelemetry Before Module Loading

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- NestJS
- Node.js module preloading
- TypeScript
- RxJS
- Docker

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript instrumentation libraries docs: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript instrumentation API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- Node.js CLI documentation for `--require` and `--import`: https://nodejs.org/download/release/v22.18.0/docs/api/cli.html
- NestJS CLI usage docs for `nest start --exec`: https://docs.nestjs.com/cli/usages
- NestJS core source for `NestFactory` and adapter loading: https://github.com/nestjs/nest/blob/master/packages/core/nest-factory.ts
- ts-node options docs for `--require`: https://typestrong.org/ts-node/docs/options

## Issues Found
- The post used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript docs use `resourceFromAttributes(...)`, so the tracing example was updated to use that API.
- The post claimed that importing `NestFactory` directly loads Express and other instrumented modules. Nest's source shows the default Express adapter is loaded when `NestFactory.create()` creates the HTTP adapter, while static imports in `main.ts` still mean application modules are evaluated before `bootstrap()` runs. The explanation was corrected.
- The post described `--require` as the only reliable preload option. Node.js and OpenTelemetry docs also support ESM preload paths, so the wording now scopes `--require` to CommonJS tracing files and mentions the equivalent ESM preload path.
- The TypeScript service example referenced `this.usersRepository` without declaring or injecting it. The constructor now includes an injected repository token so the example is structurally complete.
- The interceptor example used `startSpan()` without making the span active and ended the span on the first `next` notification. It now sets the OpenTelemetry context for the downstream observable subscription and ends the span with `finalize()`, while recording errors in `tap()`.
- The TypeScript compilation section said a CommonJS tracing file can simply be `.js`. It now notes that `.cjs` is needed when the package uses `"type": "module"`.

## Review Notes
The article is technically relevant and the core recommendation to initialize OpenTelemetry before NestJS/application imports is correct. For ESM-first NestJS applications, a future version could include a dedicated `--import` or loader-hook example, but the corrected CommonJS preload flow is valid.
