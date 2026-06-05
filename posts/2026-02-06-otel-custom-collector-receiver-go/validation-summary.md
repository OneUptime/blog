# Validation Summary: How to Write a Custom OpenTelemetry Collector Receiver in Go from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector receiver API
- Go
- OTLP/pdata traces and logs
- Collector YAML configuration
- Go unit testing with Collector test helpers

## Sources Consulted
- OpenTelemetry official documentation: Build a receiver, https://opentelemetry.io/docs/collector/extend/custom-component/receiver/
- OpenTelemetry official documentation: Collector configuration, https://opentelemetry.io/docs/collector/configuration/
- Go package documentation: go.opentelemetry.io/collector/receiver, https://pkg.go.dev/go.opentelemetry.io/collector/receiver
- Go package documentation: go.opentelemetry.io/collector/pdata/ptrace, https://pkg.go.dev/go.opentelemetry.io/collector/pdata/ptrace
- Go package documentation: go.opentelemetry.io/collector/receiver/receivertest, https://pkg.go.dev/go.opentelemetry.io/collector/receiver/receivertest
- Go package documentation: go.opentelemetry.io/collector/consumer/consumertest, https://pkg.go.dev/go.opentelemetry.io/collector/consumer/consumertest
- OpenTelemetry specification overview, https://opentelemetry.io/docs/specs/otel/overview/

## Issues Found
- The `config.go` snippet imported `component` but used `fmt.Errorf`, so it would not compile. Replaced the unused `component` import with `fmt`.
- The `factory.go` and `receiver.go` snippets imported `time` without using it, which would cause Go compilation errors. Removed the unused imports.
- The trace conversion created spans without setting a trace ID or span ID. Added deterministic ID generation and calls to `span.SetTraceID` and `span.SetSpanID`, matching the OpenTelemetry span context model and current pdata APIs.
- The Collector config referenced `batch` and `otlp` in the pipeline without defining them. Added minimal `processors` and `exporters` sections.
- The environment variable syntax used `${WEBHOOK_SECRET}`. Updated it to the current Collector configuration syntax, `${env:WEBHOOK_SECRET}`.
- The test snippet omitted required imports and used the outdated zero-argument `receivertest.NewNopSettings()` call. Added the package/import block and updated the call to pass a receiver type.

## Review Notes
The receiver factory, `receiver.WithTraces`, `receiver.WithLogs`, `component.Config` validation pattern, `Start`/`Shutdown` lifecycle, consumer calls, and pdata trace/log construction are aligned with current OpenTelemetry Collector APIs. The example remains simplified: a production webhook receiver should also implement the configured secret/signature validation and use stronger HTTP server hardening.
