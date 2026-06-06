# Validation Summary: How to Auto-Instrument NestJS with Express, TypeORM,

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- NestJS
- Express
- TypeORM
- Prisma ORM
- OTLP HTTP trace export
- TypeScript

## Sources Consulted
- OpenTelemetry JavaScript Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript semantic conventions package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry HTTP instrumentation configuration API: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_instrumentation-http.HttpInstrumentationConfig.html
- Published `@opentelemetry/instrumentation-http` 0.218.0 TypeScript definitions from npm
- Published `@opentelemetry/instrumentation-express` 0.66.0 TypeScript definitions from npm
- Published `@opentelemetry/instrumentation-typeorm` 0.18.0 TypeScript definitions from npm
- Prisma OpenTelemetry tracing documentation: https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/opentelemetry-tracing
- Published `@prisma/instrumentation` 7.8.0 TypeScript definitions and README from npm
- NestJS package peer dependency metadata for `@nestjs/core` and `@nestjs/typeorm` from npm

## Issues Found
- The base package installation omitted direct dependencies used in the examples. Added `@opentelemetry/api`, `@opentelemetry/resources`, and `@opentelemetry/semantic-conventions` to the install commands.
- The resource setup used deprecated or outdated OpenTelemetry JavaScript APIs (`new Resource()` and `SemanticResourceAttributes`). Updated the example to `resourceFromAttributes()` with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- The HTTP instrumentation examples used non-current option names (`ignoreIncomingPaths` and `ignoreOutgoingUrls`). Replaced them with `ignoreIncomingRequestHook` and `ignoreOutgoingRequestHook`, matching the current HTTP instrumentation configuration.
- The HTTP request and response hooks assumed server-only object shapes and set attributes from possibly undefined values. Added type guards and value checks for request IDs and response content length.
- The TypeORM `responseHook` example treated the second argument as the raw response. Updated it to use the current hook info object and read `info.response`.
- The Prisma instrumentation example used a `middleware: true` option that is not part of the current `@prisma/instrumentation` configuration. Replaced it with `new PrismaInstrumentation()` and used `ignoreSpanTypes` in the tuning example.
- The Prisma schema enabled the `tracing` preview feature unconditionally. Removed it from the current Prisma example because tracing is generally available in Prisma ORM 6.1.0 and later.
- The Prisma transaction comment claimed transactions are traced as a single unit. Adjusted it to say interactive transactions are included in the trace with child query spans.
- The advanced tuning example attempted to inspect `span.startTime` and `span.endTime`, which are not part of the public `Span` API. Replaced that with supported TypeORM and Prisma configuration options.
- The application initialization example relied on calling instrumentation from `main.ts`. Updated it to the official preload pattern using Node.js `--require` or `--import`, and made the instrumentation module start at module load time.
- The test example expected a `traceparent` response header, which OpenTelemetry HTTP server instrumentation does not add by default. Changed the test to send a valid `traceparent` request header and describe exporter or collector verification separately.
- The Prisma troubleshooting note was outdated. Updated it to recommend Prisma ORM 6.1.0 or higher and mention the tracing preview feature only for Prisma ORM versions from 4.2.0 up to 6.1.0.

## Review Notes
The post is technically relevant and salvageable. The code examples now follow current OpenTelemetry JavaScript, TypeORM instrumentation, and Prisma instrumentation APIs.
