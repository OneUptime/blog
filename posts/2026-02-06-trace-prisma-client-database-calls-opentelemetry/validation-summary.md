# Validation Summary: How to Trace Prisma Client Database Calls with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prisma ORM
- Prisma Client
- Prisma Client query extensions
- OpenTelemetry JavaScript SDK
- OpenTelemetry Collector
- OTLP exporters
- Node.js
- TypeScript
- PostgreSQL
- Express
- OneUptime telemetry ingestion

## Sources Consulted
- Prisma OpenTelemetry tracing documentation: https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/opentelemetry-tracing
- Prisma generator documentation: https://www.prisma.io/docs/orm/prisma-schema/overview/generators
- Prisma Client generation documentation: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client
- Prisma config reference: https://www.prisma.io/docs/orm/reference/prisma-config-reference
- Prisma ORM 7 upgrade guide: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
- Prisma database driver adapter documentation: https://www.prisma.io/docs/orm/overview/databases/database-drivers
- Prisma Client query extensions documentation: https://www.prisma.io/docs/orm/prisma-client/client-extensions/query
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The post said tracing required the `tracing` preview feature for all Prisma versions. Updated the version guidance: tracing was added in Prisma ORM 4.2 as preview, is generally available in Prisma ORM 6.1 and later, and the examples now target Prisma ORM 7.
- The Prisma schema used `prisma-client-js`, which is deprecated as of Prisma ORM 7. Updated the primary example to use `provider = "prisma-client"` with an explicit generated-client output path.
- The Prisma schema kept `url = env("DATABASE_URL")` in the datasource block, which is no longer the Prisma ORM 7 configuration pattern. Added a `prisma.config.ts` example for the datasource URL.
- The application instantiated `new PrismaClient()` without a driver adapter. Updated the PostgreSQL example to use `@prisma/adapter-pg` and pass the adapter to `PrismaClient`.
- The OpenTelemetry setup imported and constructed `Resource` from `@opentelemetry/resources`, while current OpenTelemetry JS examples use `resourceFromAttributes`. Updated the imports and resource setup.
- The package list omitted required packages for the current examples, including Prisma packages, PostgreSQL adapter packages, `dotenv`, `@opentelemetry/api`, and the span processor/sampler packages used in snippets. Updated the install command.
- Several Prisma span descriptions treated `prisma:engine:query` as the SQL execution span. Updated the explanations and performance-debugging guidance to use `prisma:engine:db_query` for actual database query execution.
- The span list omitted `prisma:engine:response_json_serialization`. Added it to the diagram and span descriptions.
- The custom tracing example imported unused `SpanKind`. Removed the unused import.
- The post used Prisma middleware via `prisma.$use`, which was removed in Prisma ORM 7. Replaced that example with a Prisma Client query extension using `$allModels.$allOperations`.
- The collector filter configuration used an outdated/incorrect `spans.min_duration` shape and did not include the filter processor in the traces pipeline. Replaced it with OTTL `trace_conditions` and added `filter/slow` to the pipeline.
- The OneUptime exporter example used an incorrect gRPC endpoint. Updated it to the documented OTLP HTTP endpoint with JSON encoding and `x-oneuptime-token`.
- The connection pool guidance only mentioned the older `connection_limit` URL parameter. Updated it to mention Prisma ORM 7 driver adapter pool tuning, with the URL parameter caveat retained for Prisma ORM 6 and earlier.

## Review Notes
The article is now technically aligned with current Prisma ORM 7 and OpenTelemetry JS guidance. The Prisma tracing span names are version-sensitive, so future reviews should re-check Prisma's tracing documentation if the instrumentation package or generated client architecture changes again.
