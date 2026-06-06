# Validation Summary: How to Build a Custom Receiver for the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector custom receivers
- OpenTelemetry Collector Builder (OCB)
- Go
- Collector `pdata` metrics APIs
- Collector YAML configuration

## Sources Consulted
- OpenTelemetry Collector receiver build guide: https://opentelemetry.io/docs/collector/extend/custom-component/receiver/
- OpenTelemetry Collector Builder guide: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry Collector configuration guide: https://opentelemetry.io/docs/collector/configuration/
- Go package documentation for `go.opentelemetry.io/collector/receiver`: https://pkg.go.dev/go.opentelemetry.io/collector/receiver
- Go package documentation for `go.opentelemetry.io/collector/component`: https://pkg.go.dev/go.opentelemetry.io/collector/component
- Go package documentation for `go.opentelemetry.io/collector/component/componenttest`: https://pkg.go.dev/go.opentelemetry.io/collector/component/componenttest
- Go package documentation for `go.opentelemetry.io/collector/consumer/consumertest`: https://pkg.go.dev/go.opentelemetry.io/collector/consumer/consumertest
- Go package documentation for `github.com/cenkalti/backoff/v4`: https://pkg.go.dev/github.com/cenkalti/backoff/v4

## Issues Found
- The receiver factory used a plain string for the component type. Current Collector APIs expect `component.Type`, so the post now uses `component.MustNewType("custom")` and converts it with `String()` only where a string attribute is needed.
- The factory and receiver structs used the older `receiver.CreateSettings` type. Current receiver creation functions use `receiver.Settings`, so the code and tests were updated accordingly.
- The configuration embedded `confighttp.HTTPServerSettings` and also declared an `endpoint` field, creating a conflicting `mapstructure` key. The data source setting is now `data_source_endpoint`, and health checks use a separate `health_check_endpoint`.
- The test used `receivertest.NewNopCreateSettings()`, which no longer matches current receiver test helpers. It now uses `receivertest.NewNopSettings(component.NewID(typeStr))`.
- The OCB manifest used the outdated `otelcol_version` field and old v0.95.0 component versions. The manifest now follows the current documented `dist.version` style and uses v0.153.0 component modules.
- The OCB manifest and Collector config used the removed/deprecated `loggingexporter`. They now use `debugexporter` and a `debug` exporter configuration.
- The OCB build command used `builder --config=builder-config.yaml`; the documented command is `builder --config builder-config.yaml`, and the install command now pins `cmd/builder` to v0.153.0.
- The advanced resource-detection snippet referenced `os` and `detectCloudProvider()` without defining them. The import and a placeholder helper were added.
- The advanced health-check snippet referenced the removed `HTTPServerSettings.Endpoint`, did not store the server for shutdown, and referenced `isReady()` without defining it. It now uses `HealthCheckEndpoint`, stores the HTTP server, shuts it down, and includes a simple `isReady()` placeholder.
- Background collection now creates its cancellation context from `context.Background()`, matching Collector component lifecycle guidance for long-running background work.

## Review Notes
The post is technically relevant and was corrected to current Collector APIs and current OCB documentation. I could not run `go test` locally because the `go` binary is not installed in this environment, so validation was based on official OpenTelemetry documentation and Go package documentation.
