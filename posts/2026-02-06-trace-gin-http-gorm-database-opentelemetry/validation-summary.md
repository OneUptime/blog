# Validation Summary: How to Trace Gin HTTP Requests and GORM Database Queries with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- OpenTelemetry Go SDK
- OTLP trace exporter
- Gin
- GORM
- GORM OpenTelemetry plugin
- MySQL and SQLite GORM drivers

## Sources Consulted
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Gin instrumentation package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin
- GORM OpenTelemetry tracing plugin documentation: https://pkg.go.dev/gorm.io/plugin/opentelemetry/tracing
- GORM OpenTelemetry plugin repository: https://github.com/go-gorm/opentelemetry
- GORM context documentation: https://gorm.io/docs/context.html
- GORM preload documentation: https://gorm.io/docs/preload.html
- GORM transaction documentation: https://gorm.io/docs/transactions.html
- GORM generic database interface documentation: https://gorm.io/docs/generic_interface.html

## Issues Found
- The post used the outdated/non-current GORM instrumentation import path `go.opentelemetry.io/contrib/instrumentation/gorm.io/gorm/otelgorm`. Updated dependency commands, imports, prose, diagram text, and plugin setup calls to use `gorm.io/plugin/opentelemetry/tracing` with `tracing.NewPlugin()`.
- The first tracer setup snippet imported `log` without using it. Removed the unused import.
- The database operations snippet imported `context` without using it and used `time.Time` without importing `time`. Replaced the unused import with the required `time` import.
- The nested preload example used an anonymous struct type for nested post comments, which is not a reliable GORM association model. Replaced it with a named `PostWithComments` type.
- The transaction section claimed the entire transaction is traced as a single operation. Adjusted the wording to state that queries inside the transaction are traced with the request context.
- The transaction example used a `Profile` model without defining it. Added a minimal `Profile` struct.
- The custom span snippet used `trace.WithAttributes` without importing `go.opentelemetry.io/otel/trace`. Added the missing import.
- The custom query explanation said each query builder part is traced. Clarified that the resulting SQL operation is traced by the GORM plugin.
- The connection pool section said to monitor pooling through spans. Adjusted the wording to reference DB stats metrics and query spans, and added missing imports for the snippet after switching to `tracing.NewPlugin()`.
- The complete working application imported the old GORM instrumentation package, ignored the `AutoMigrate` error, and referenced `s.db` inside a route handler where `s` was undefined. Updated the import, checked migration errors, and changed the query to use the `db` argument with error handling.

## Review Notes
Go is not installed in this environment, so local compilation of the examples could not be performed. The review was completed against current official documentation and package references.
