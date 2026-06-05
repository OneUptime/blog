# Validation Summary: Create a Custom Collector Exporter That Writes to Your Proprietary Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector custom exporters
- Go
- Collector exporterhelper
- Collector pdata traces and logs
- HTTP client configuration
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter
- OpenTelemetry Collector exporterhelper package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector configretry package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configretry
- OpenTelemetry Collector configoptional package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configoptional
- OpenTelemetry Collector confighttp package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/confighttp
- OpenTelemetry Collector component package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/component
- OpenTelemetry Collector pdata pcommon package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/pcommon
- OpenTelemetry Collector pdata ptrace package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/ptrace
- OpenTelemetry Collector confighttp source: https://github.com/open-telemetry/opentelemetry-collector/tree/main/config/confighttp

## Issues Found
- The factory snippet used outdated exporterhelper types, `exporterhelper.RetrySettings` and `exporterhelper.QueueConfig`. Current Collector APIs use `configretry.BackOffConfig` with `exporterhelper.WithRetry` and `configoptional.Optional[exporterhelper.QueueBatchConfig]` with `exporterhelper.WithQueue`. Updated the snippet to use `configretry.NewDefaultBackOffConfig()`, `exporterhelper.NewDefaultQueueConfig()`, and `configoptional.Some(...)`.
- The factory snippet used `time.Second` without importing `time`. Added the missing import.
- The factory snippet now initializes the embedded `confighttp.ClientConfig` with `confighttp.NewDefaultClientConfig()` so the HTTP client config uses Collector defaults.
- The exporter implementation used `pcommon.Value` without importing `go.opentelemetry.io/collector/pdata/pcommon`. Added the missing import.
- The exporter embedded `confighttp.ClientConfig` in configuration but ignored it at runtime by constructing a bare `http.Client`. Updated `start` to call `ClientConfig.ToClient(ctx, host.GetExtensions(), settings.TelemetrySettings)` so TLS, auth, headers, proxy, timeout, and related Collector HTTP settings are honored.
- The logs exporter did not register `WithStart` or `WithShutdown`, so its `http.Client` would never be initialized before `pushLogs` called `sendBatch`. Added the same lifecycle hooks used by the traces exporter.

## Review Notes
The snippets are now aligned with current OpenTelemetry Collector package documentation as of the review date. The local environment did not have the Go toolchain installed, so I could not compile the snippets directly; verification was performed against official package documentation and Collector source.
