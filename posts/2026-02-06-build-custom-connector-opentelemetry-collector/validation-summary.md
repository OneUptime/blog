# Validation Summary: How to Build a Custom Connector for the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector connectors
- OpenTelemetry Collector Builder (OCB)
- Go
- OTLP receiver and exporter
- Debug exporter
- Batch processor

## Sources Consulted
- OpenTelemetry Collector connector documentation: https://opentelemetry.io/docs/collector/configuration/#connectors
- OpenTelemetry custom connector guide: https://opentelemetry.io/docs/collector/extend/custom-component/connector/
- OpenTelemetry Collector Builder guide: https://opentelemetry.io/docs/collector/extend/ocb/
- Go package documentation for `go.opentelemetry.io/collector/connector`: https://pkg.go.dev/go.opentelemetry.io/collector/connector
- Go package documentation for `go.opentelemetry.io/collector/component`: https://pkg.go.dev/go.opentelemetry.io/collector/component
- Go package documentation for `go.opentelemetry.io/collector/connector/connectortest`: https://pkg.go.dev/go.opentelemetry.io/collector/connector/connectortest
- Go package documentation for `go.opentelemetry.io/collector/consumer/consumertest`: https://pkg.go.dev/go.opentelemetry.io/collector/consumer/consumertest
- Go package documentation for `go.opentelemetry.io/collector/pdata/pcommon`: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/pcommon
- OneUptime linked article: https://oneuptime.com/blog/post/2026-02-06-environment-variables-opentelemetry-collector-configuration/view

## Issues Found
- Removed an unused `component` import from the `config.go` snippet because it would make the Go file fail to compile.
- Changed the connector logger type from the nonexistent `component.Logger` to `*zap.Logger`, matching Collector telemetry settings.
- Restored the `connector` import in `connector.go` because the snippet uses `connector.Settings`.
- Updated dimension handling so `span.kind` and `status.code` are read from intrinsic span fields, not only from attributes. This makes the default dimensions and the example configuration behave as described.
- Updated the OCB builder configuration from outdated v0.91.0 Collector components to v0.153.0 and replaced the invalid local `path` field with an official `replaces` entry for local component development.
- Updated the builder install command to use `go.opentelemetry.io/collector/cmd/builder@v0.153.0`, keeping the builder version aligned with the manifest.
- Fixed the unit test snippet to call `connectortest.NewNopSettings(factory.Type())`, matching the current API.
- Fixed the unit test snippet to check `len(sink.AllMetrics()) > 0` instead of the nonexistent `MetricsSink.MetricCount()` method.
- Updated the test span to set intrinsic span kind and status code fields instead of storing `span.kind` as an attribute.

## Review Notes
The local environment does not have the Go toolchain installed, so the snippets could not be compiled directly here. API checks were performed against official OpenTelemetry docs and pkg.go.dev references. For a production connector, the example would still need more robust error handling, downstream backpressure strategy, and tests for bucket counts and attributes.
