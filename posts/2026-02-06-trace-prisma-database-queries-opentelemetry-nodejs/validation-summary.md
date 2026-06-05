# Validation Summary: How to Trace Prisma Database Queries with OpenTelemetry in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript SDK
- Prisma ORM and Prisma Client
- Prisma OpenTelemetry instrumentation
- Node.js
- OTLP/HTTP trace export
- OpenTelemetry metrics API

## Sources Consulted
- Prisma ORM OpenTelemetry tracing documentation: https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/opentelemetry-tracing
- Prisma ORM v7 upgrade guide, client middleware removal: https://docs.prisma.io/docs/v6/orm/more/upgrades/to-v7
- Prisma ORM v6 Client API reference, `$use` transition guidance: https://www.prisma.io/docs/orm/v6/reference/prisma-client-reference
- Prisma ORM logging documentation: https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/logging
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry SDK configuration and sampling documentation: https://opentelemetry.io/docs/languages/sdk-configuration/general/

## Issues Found
- The post recommended Prisma Client middleware with `prisma.$use()` as the tracing integration point. Prisma ORM v6 documentation recommends transitioning from `$use` to query extensions, and Prisma ORM v7 removed the client middleware API, so the post now uses the official `@prisma/instrumentation` package.
- The dependency installation command omitted `@prisma/instrumentation` and `@opentelemetry/auto-instrumentations-node`, while the code used auto-instrumentation. The install command now includes the required packages.
- The OpenTelemetry resource setup used older `Resource` and `SemanticResourceAttributes` APIs. The example now uses `resourceFromAttributes` with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`, matching current OpenTelemetry JavaScript documentation.
- The OTLP trace exporter example read `OTEL_EXPORTER_OTLP_ENDPOINT` directly as a trace endpoint URL. The example now uses `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` when the configured URL includes `/v1/traces`.
- The complex tracing example used `SpanStatusCode` without importing it. The import was corrected.
- The complex tracing example placed `user.email` on a span while the post warns against sensitive telemetry attributes. It now uses a non-sensitive operation attribute.
- The connection pool metrics example used `prisma.$metrics.json()` and a Prisma metrics counter as if it represented active connections. Current Prisma documentation no longer exposes that as a current client metrics workflow, and `prisma_client_queries_active` represents active queries, not active database connections. The example now uses an external pool or database stats provider with OpenTelemetry observable gauges.
- The trace hierarchy and conclusion referred to custom Prisma middleware spans. They now describe Prisma's official span names such as `prisma:client:operation`, `prisma:client:transaction`, and `prisma:engine:db_query`.
- The performance section claimed Prisma batch operations create a single span. That was replaced with a correct OpenTelemetry production recommendation to use batch span processing.
- The context propagation example ended the span only on the success path. It now ends the span in a `finally` block.

## Review Notes
The post is now technically valid for current Prisma/OpenTelemetry guidance. The pool monitoring section remains intentionally generic because current Prisma tracing covers operation and query spans, while exact connection pool utilization should come from the database, driver adapter, external pooler, or infrastructure metrics source used by the application.
