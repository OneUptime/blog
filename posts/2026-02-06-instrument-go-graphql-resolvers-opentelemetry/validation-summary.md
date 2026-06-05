# Validation Summary: How to Instrument Go GraphQL Resolvers with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- gqlgen
- GraphQL
- OpenTelemetry Go SDK
- OTLP trace gRPC exporter
- GraphQL resolver tracing
- DataLoader-style batching
- PostgreSQL access from Go

## Sources Consulted
- gqlgen GraphQL package API documentation: https://pkg.go.dev/github.com/99designs/gqlgen/graphql
- gqlgen handler package API documentation: https://pkg.go.dev/github.com/99designs/gqlgen/graphql/handler
- gqlgen server source and `NewDefaultServer` deprecation note: https://github.com/99designs/gqlgen/blob/master/graphql/handler/server.go
- gqlgen executor source for operation and response middleware flow: https://github.com/99designs/gqlgen/blob/master/graphql/executor/executor.go
- gqlgen DataLoader reference: https://gqlgen.com/reference/dataloaders/
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry OTLP trace gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry GraphQL semantic conventions: https://opentelemetry.io/docs/specs/semconv/graphql/graphql-spans/
- OpenTelemetry sensitive data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- GraphQL specification execution and response sections: https://spec.graphql.org/

## Issues Found
- The operation interceptor ended the root operation span immediately after `next(ctx)` returned. In gqlgen, `OperationInterceptor` returns a `ResponseHandler`, and the actual response execution happens when that handler is invoked. Updated the code to wrap the response handler and end the span after the normal response or end-of-stream signal.
- The operation span name used `{operation.type} {operation.name}` by default. Current OpenTelemetry GraphQL semantic conventions recommend using only `graphql.operation.type` by default because client-provided operation names can have high cardinality. Updated the default span name to the operation type while still recording `graphql.operation.name` as an attribute when present.
- The example used the non-standard `graphql.query` attribute and recorded the raw GraphQL document. Current OpenTelemetry conventions use `graphql.document` as an opt-in attribute and warn that it should be redacted first. Removed the raw document attribute and recorded document length instead.
- The examples stored names, email addresses, and full DataLoader ID lists as span attributes. OpenTelemetry guidance warns that telemetry can contain sensitive data and should be redacted or avoided. Replaced those attributes with lower-risk booleans and counts.
- The examples represented errors only as string attributes. Updated resolver, field, DataLoader, and response handling examples to use `span.RecordError` and `span.SetStatus(codes.Error, ...)`, matching OpenTelemetry error-recording guidance.
- The setup used `handler.NewDefaultServer`, which gqlgen now documents as deprecated and example-only. Updated the server setup to use `handler.New` and explicitly add `Options`, `GET`, and `POST` transports.
- The semantic conventions import used the older `go.opentelemetry.io/otel/semconv/v1.21.0` package. Updated it to `go.opentelemetry.io/otel/semconv/v1.37.0`, matching current OpenTelemetry Go documentation.
- The DataLoader efficiency calculation divided by `len(ids)` without guarding against an empty batch. Added a zero-length guard.

## Review Notes
The post is technically relevant and the corrected examples match current gqlgen interceptor APIs and OpenTelemetry Go APIs. The local environment did not have the Go toolchain installed, so snippet compilation could not be run locally; validation was performed against official documentation and source references. The repository and generated gqlgen types are intentionally schematic in the post, so readers still need to adapt package paths, model types, SQL driver imports, and generated resolver wiring to their own project.
