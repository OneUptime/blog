# Validation Summary: How to Trace GraphQL Queries and Mutations with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry GraphQL instrumentation
- GraphQL
- Node.js
- DataLoader
- OpenTelemetry Collector
- OTLP HTTP exporting

## Sources Consulted
- OpenTelemetry GraphQL instrumentation README: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-graphql
- OpenTelemetry GraphQL instrumentation source and generated package files for span names and attributes: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-graphql/src
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- npm package metadata for @opentelemetry/instrumentation-graphql and @opentelemetry/resources.

## Issues Found
- The post claimed OpenTelemetry GraphQL instrumentation tracks query complexity. The official GraphQL instrumentation creates parse, validate, execute, and resolver spans and supports a `depth` option, but it does not calculate query complexity. Updated the wording to avoid that overclaim and clarified that query complexity scores must come from the GraphQL server or another library.
- The tracing setup used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JS resources documentation uses `resourceFromAttributes(...)`, and the latest package exports `Resource` as a type/interface rather than a constructible class. Updated the import and SDK configuration.
- The DataLoader example claimed to track cache hit rates, but the code only recorded batch name, batch size, and keys. Updated the description to match the code.
- The DataLoader example used numeric span status codes. The values are correct, but using `SpanStatusCode.OK` and `SpanStatusCode.ERROR` is clearer and matches the API. Updated the import and status calls.
- The subscription example stored an injected carrier but never extracted it when resolving events, so event spans would not actually continue that subscription context. Updated the example to inject the setup span context and extract it for event delivery spans.
- The Collector filter processor was configured but not included in the trace pipeline, so it would not run. Added it to the pipeline before `batch`.
- The Collector filter condition checked `graphql.operation.type == "parse"`, but parse and validate spans are named `graphql.parse` and `graphql.validate`; `graphql.operation.type` is used on execute spans for operation types such as query or mutation. Updated the filter condition to match span names and added `error_mode: ignore`.
- The Collector exporter used `otlp` while pointing at an HTTP-style `:4318` endpoint. Updated it to `otlphttp` to match the OTLP HTTP endpoint style used earlier in the post.

## Review Notes
The GraphQL instrumentation package is currently a contrib instrumentation and supports `graphql` versions `>=14.0.0 <17`. Resolver span volume can be high on Apollo Server and complex schemas; the post already discusses depth and list item merging, but future revisions could mention `ignoreResolveSpans` and `ignoreTrivialResolveSpans`.
