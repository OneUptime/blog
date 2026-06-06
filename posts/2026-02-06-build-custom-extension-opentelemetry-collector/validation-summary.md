# Validation Summary: How to Build a Custom Extension for the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector extensions
- OpenTelemetry Collector Builder (OCB)
- Go
- HTTP handlers and middleware
- Collector YAML configuration

## Sources Consulted
- OpenTelemetry Collector extension docs: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry custom extension docs: https://opentelemetry.io/docs/collector/extend/custom-component/extension/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry custom Collector / OCB docs: https://opentelemetry.io/docs/collector/custom-collector/
- Go package docs for `go.opentelemetry.io/collector/extension`: https://pkg.go.dev/go.opentelemetry.io/collector/extension
- Go package docs for `go.opentelemetry.io/collector/component`: https://pkg.go.dev/go.opentelemetry.io/collector/component
- Go package docs for `go.opentelemetry.io/collector/extension/extensiontest`: https://pkg.go.dev/go.opentelemetry.io/collector/extension/extensiontest
- OpenTelemetry Collector release information: https://github.com/open-telemetry/opentelemetry-collector/releases
- OpenTelemetry Collector Contrib release information: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases

## Issues Found
- The factory example used a string component type and `extension.CreateSettings`, which is outdated for current Collector APIs. Updated it to use `component.MustNewType("custom")` and `extension.Settings`, matching the current official package docs.
- The tests used `extensiontest.NewNopCreateSettings()`, which has been replaced by `extensiontest.NewNopSettings(typ)`. Updated all test examples accordingly.
- The metrics handler calculated uptime with `time.Since(time.Now())`, which always returns approximately zero. Added `startTime` to the extension state and calculate uptime from that value.
- The HTTP server startup used `ListenAndServe` inside a goroutine, so bind failures would only be logged after `Start` returned success. Updated the example to create the listener before returning from `Start`, so startup failures are returned to the Collector.
- The project setup omitted dependencies used by the test examples. Added `componenttest`, `extensiontest`, and `testify` to the dependency commands.
- The OCB manifest used an outdated v0.95.0 example and the deprecated `loggingexporter`. Updated component modules to v0.153.0, switched to `debugexporter`, and added current config provider modules following the official OCB docs.
- The Collector configuration used the deprecated `logging` exporter and `loglevel` option. Updated it to use the `debug` exporter with `verbosity: basic`.

## Review Notes
Local compilation could not be run because the workspace environment does not have the `go` binary installed. The review was completed against official OpenTelemetry documentation and current package API references.
