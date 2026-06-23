# Validation Summary: How to Send Go Application Logs to OneUptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- OpenTelemetry Go Logs API and SDK
- OTLP/HTTP log exporter
- OneUptime telemetry ingestion
- Zap
- Logrus
- log/slog

## Sources Consulted
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry Go getting started documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Go `otlploghttp` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp
- OpenTelemetry Go `log` API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/log
- OpenTelemetry Go `sdk/log` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/log
- OpenTelemetry Go `otelslog` bridge documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/bridges/otelslog
- Go `log/slog` package documentation: https://pkg.go.dev/log/slog
- Zap and zapcore package documentation: https://pkg.go.dev/go.uber.org/zap and https://pkg.go.dev/go.uber.org/zap/zapcore

## Issues Found
- The post used `https://otlp.oneuptime.com` and custom endpoint/service environment variables. Updated examples to use OneUptime's documented `https://oneuptime.com/otlp` endpoint and standard `OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_SERVICE_NAME` variables.
- The OTLP HTTP exporter example passed a full URL to `WithEndpoint` and also called `WithInsecure()` for the default HTTPS endpoint. Updated it to use `WithEndpointURL()` and removed `WithInsecure()`.
- Several examples chained `log.Record` setter methods. The OpenTelemetry Go API documents these setters as void pointer methods, so the examples would not compile. Rewrote them to create a record, call setters, then emit it.
- Updated the Go prerequisite from Go 1.21 to Go 1.23 to match current OpenTelemetry Go getting-started guidance.
- Updated semantic convention usage to a current package version and replaced the old deployment environment helper with `DeploymentEnvironmentName`.
- Fixed missing imports in the Zap, Logrus, slog, and sampling snippets.
- Fixed Zap `Float64Type` conversion to decode the stored bits with `math.Float64frombits`.
- Added the `MultiHandler` helper used by the slog example.
- Fixed the Zap usage example so it logs an actual database error instead of the already-checked initialization error variable.
- Fixed the database example to select explicit columns matching the three scanned fields and added the `User` struct used by the snippet.

## Review Notes
The local environment did not have the `go` binary installed, so snippets could not be compiled locally. Validation was performed against official package documentation and current OneUptime/OpenTelemetry docs.
