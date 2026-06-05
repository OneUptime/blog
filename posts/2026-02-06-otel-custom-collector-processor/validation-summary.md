# Validation Summary: How to Build a Custom Collector Processor That Transforms Telemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors
- Go
- Collector YAML configuration
- OpenTelemetry Collector pdata APIs

## Sources Consulted
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry custom Collector documentation: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry Collector processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor
- OpenTelemetry Collector component package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/component
- OpenTelemetry Collector consumer test package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/consumer/consumertest
- OpenTelemetry Collector processor test package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/processortest
- OpenTelemetry Collector pdata pcommon package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/pcommon
- OpenTelemetry Collector pdata plog package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/plog

## Issues Found
- The post description claimed the sample processor applied transformation logic to traces, metrics, and logs, but the factory and implementation only supported traces and logs. I changed the description to say "traces and logs" so it matches the code.
- The `processor.go` example used `fmt.Errorf` without importing `fmt`, which would not compile. I added the missing `fmt` import.
- The Collector configuration snippet referenced `otlp`, `batch`, and `otlp` exporter components without defining them. I made the snippet self-contained by adding an OTLP receiver, a `batch` processor entry, and a debug exporter, then updated the pipelines to export to `debug`.
- The test snippet used `processortest.NewNopSettings()` with no arguments. Current Collector documentation shows `NewNopSettings` requires a `component.Type`, so I updated the call to `processortest.NewNopSettings(component.MustNewType(typeStr))`.

## Review Notes
The code examples now align with the current Collector factory interfaces and consumer test helper APIs. I could not run Go compilation locally because the `go` binary is not installed in the workspace environment.
