# Validation Summary: How to Instrument Apollo GraphQL Server with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apollo Router / GraphOS Router
- Apollo Server plugins
- Apollo Federation subgraphs
- OpenTelemetry JavaScript API and SDK
- OTLP tracing export over gRPC
- Distributed tracing and custom metrics

## Sources Consulted
- Apollo Router OTLP trace exporter documentation: https://www.apollographql.com/docs/graphos/routing/observability/router-telemetry-otel/telemetry-pipelines/trace-exporters/otlp
- Apollo Router span configuration documentation: https://www.apollographql.com/docs/graphos/routing/observability/router-telemetry-otel/enabling-telemetry/spans
- Apollo Router OpenTelemetry standard attributes documentation: https://www.apollographql.com/docs/graphos/routing/observability/router-telemetry-otel/enabling-telemetry/standard-attributes
- Apollo Router selectors documentation: https://www.apollographql.com/docs/graphos/routing/observability/router-telemetry-otel/enabling-telemetry/selectors
- Apollo Router events documentation: https://www.apollographql.com/docs/graphos/routing/observability/router-telemetry-otel/enabling-telemetry/events
- Apollo Router query plan debugging documentation: https://www.apollographql.com/docs/graphos/routing/observability/router-telemetry-otel/enabling-telemetry/usage-guides/debugging-subgraph-requests
- Apollo Router standard instruments documentation: https://www.apollographql.com/docs/graphos/routing/observability/router-telemetry-otel/enabling-telemetry/standard-instruments
- Apollo Server custom plugin documentation: https://www.apollographql.com/docs/apollo-server/integrations/plugins
- Apollo Federation OpenTelemetry documentation: https://www.apollographql.com/docs/federation/v1/opentelemetry
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/

## Issues Found
- The Router span configuration used `graphql.document` under the `router` service with a `request_header` selector and used `operation_name: string` for `graphql.operation.type`. Apollo documents `graphql.document`, `graphql.operation.name`, and `graphql.operation.type` as supergraph standard attributes, and `subgraph.name` plus subgraph GraphQL attributes as subgraph standard attributes. Updated the YAML to use documented standard attributes with boolean enablement.
- The Router query plan example attempted to create a span event with an unsupported `query_plan` selector. Replaced it with Apollo's documented `Apollo-Expose-Query-Plan: true` debugging header and referenced the Router's standard query-planning duration metrics for timing.
- The Apollo Server plugin created field spans with `startSpan` but did not set the operation span as the parent context, so resolver spans would not reliably appear beneath the operation span. Added `context` import and passed a context containing the operation span to field span creation.
- The `__resolveReference` example used `SpanStatusCode` without importing it. Added the missing import from `@opentelemetry/api`.
- The `__resolveReference` example ended the span only on the success path. Wrapped the resolver body in `try/catch/finally` so errors are recorded, status is set, and the span is always ended.

## Review Notes
The `graphql.document` attribute is valid but Apollo warns against enabling it broadly because full GraphQL documents can create high cardinality, expose sensitive data, and add telemetry overhead. The post now flags that it should only be enabled when safe for the application's data.
