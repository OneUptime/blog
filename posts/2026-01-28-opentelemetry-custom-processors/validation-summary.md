# Validation Summary: How to Build OpenTelemetry Custom Processors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors
- OpenTelemetry Collector Builder (OCB)
- Go
- OTLP receiver and OTLP HTTP exporter
- Collector YAML configuration

## Sources Consulted
- OpenTelemetry Collector Builder documentation: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry Collector processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor
- OpenTelemetry Collector component package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/component
- OpenTelemetry Collector otelcol package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/otelcol
- OpenTelemetry Collector OTLP receiver package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/receiver/otlpreceiver
- OpenTelemetry Collector OTLP HTTP exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlphttpexporter
- OpenTelemetry Collector pdata/plog package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/plog
- OpenTelemetry Collector pdata/pmetric package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/pmetric
- OpenTelemetry Collector pdata/pcommon package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/pcommon

## Issues Found
- The setup commands used `@latest` across multiple Collector modules. I changed them to aligned current module versions so readers do not accidentally mix incompatible Collector APIs.
- The trace processor snippet used `component.Host` but did not import the `component` package, and it imported `pcommon` without using it. I corrected the imports.
- The log processor snippet passed `lr.Attributes()` into a helper whose parameter was incorrectly typed as `plog.LogRecord`. I changed the helper parameter to `pcommon.Map` and added the required import.
- The custom Collector example used outdated programmatic factory-map code and referenced helper functions that are no longer the current documented path for building custom distributions. I replaced it with the official OCB manifest flow.
- The configuration example used the deprecated `otlphttp` component alias. I changed it to the current `otlp_http` component name and updated the pipeline reference.

## Review Notes
The examples are tutorial snippets rather than a complete compilable repository. I could not run Go compilation in this environment because the `go` binary is not installed, so validation was performed against official documentation and static review.
