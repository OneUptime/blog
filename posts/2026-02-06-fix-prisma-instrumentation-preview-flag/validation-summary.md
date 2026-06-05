# Validation Summary: How to Fix Prisma Instrumentation Not Generating Spans Because the Preview

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Prisma ORM
- Prisma Client
- OpenTelemetry JavaScript
- Node.js
- npm
- PostgreSQL

## Sources Consulted
- Prisma OpenTelemetry tracing documentation: https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/opentelemetry-tracing
- Prisma Client and schema preview features documentation: https://www.prisma.io/docs/orm/reference/preview-features/client-preview-features
- OpenTelemetry JavaScript `@opentelemetry/sdk-node` documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript instrumentation documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- npm registry metadata for `@prisma/instrumentation`: https://www.npmjs.com/package/@prisma/instrumentation
- npm registry lookup for `@opentelemetry/instrumentation-prisma`, which returned a 404 because the package is not published.

## Issues Found
- The post stated that Prisma generally requires the `tracing` preview feature flag. Updated this to specify that the flag is required for Prisma 4.2.0 through 6.0.x, while tracing is generally available in Prisma 6.1.0 and later.
- The post used `@opentelemetry/instrumentation-prisma`, which is not a published npm package. Replaced it with Prisma's official `@prisma/instrumentation` package in install commands, imports, and version-check commands.
- The post implied a Prisma Client tracing option or `$extends` setup may be needed. Updated the client initialization example to state that no Prisma Client tracing option is required when the instrumentation is registered.
- The span examples placed SQL details directly on `prisma:engine:query`. Updated the examples to show `prisma:engine:db_query` nested under `prisma:engine:query`, matching Prisma's documented trace structure.
- The version-compatibility note only mentioned Prisma 4.x and 5.x. Updated it to recommend compatible versions of `prisma`, `@prisma/client`, and `@prisma/instrumentation`, with the correct preview-feature caveat for older Prisma versions.

## Review Notes
The examples use CommonJS `require` syntax while Prisma's current documentation uses ESM examples, but `@prisma/instrumentation` publishes CommonJS output and the examples remain technically valid for CommonJS Node.js projects.
