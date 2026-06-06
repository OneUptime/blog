# Validation Summary: How to Build a Custom Exporter for the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector exporter API
- Go
- OpenTelemetry Collector Builder (OCB)
- Collector YAML configuration
- exporterhelper retry, timeout, and queue settings
- Persistent queues with file storage

## Sources Consulted
- OpenTelemetry Collector exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter
- OpenTelemetry Collector exporterhelper package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector confighttp package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/confighttp
- OpenTelemetry Collector component package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/component
- OpenTelemetry Collector exportertest package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exportertest
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Builder documentation: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry Collector v0.153.0 source for exporterhelper queue configuration: https://github.com/open-telemetry/opentelemetry-collector/tree/v0.153.0/exporter/exporterhelper

## Issues Found
- The post used older Collector exporter APIs such as `exporter.CreateSettings`, `exporterhelper.NewTracesExporter`, `NewMetricsExporter`, and `NewLogsExporter`. Updated these to the current `exporter.Settings` and `exporterhelper.NewTraces`, `NewMetrics`, and `NewLogs` APIs.
- The factory used a string for the component type. Updated it to use `component.MustNewType("custom")`, matching the current `exporter.NewFactory` signature.
- The configuration example used `confighttp.HTTPClientSettings`, `exporterhelper.QueueSettings`, and `exporterhelper.TimeoutSettings`, which are no longer the current API names. Updated these to `confighttp.ClientConfig`, `configoptional.Optional[exporterhelper.QueueBatchConfig]`, and `exporterhelper.TimeoutConfig`.
- The example defined a separate `Endpoint` field while also embedding HTTP client settings, causing the default endpoint and configured endpoint to diverge. Updated validation and request construction to use `ClientConfig.Endpoint`.
- The manual compression field conflicted with `confighttp.ClientConfig`'s existing `compression` mapstructure key. Renamed the custom payload compression option to `payload_compression` and updated the Collector YAML.
- The exporter implementation omitted required imports for `component` and `pcommon`. Added them.
- The HTTP client was created before the Collector host was available, preventing auth or middleware extensions from being resolved. Moved client creation into `Start` and passed `host.GetExtensions()` to `ClientConfig.ToClient`.
- Protobuf requests were always sent with `Content-Type: application/json`. Updated the code to use `application/x-protobuf` when the configured format is `protobuf`.
- The test example used older factory and exportertest methods. Updated it to call `CreateTraces` and `exportertest.NewNopSettings`.
- The OCB example used outdated `0.95.0` component versions and `loggingexporter`. Updated the sample to `0.153.0`, replaced `loggingexporter` with `debugexporter`, and added standard confmap providers.
- The persistent queue example used outdated queue fields and `component.NewID("file_storage")`. Updated it to use `exporterhelper.NewDefaultQueueConfig`, `StorageID`, `configoptional.Some`, and `component.MustNewID`.
- The persistent queue section did not mention that a storage extension must be included in the custom distribution. Added the `filestorageextension` OCB entry.
- The metrics instrumentation snippet omitted imports for `context`, `time`, and `ptrace`. Added the missing imports.
- Removed custom `max_batch_size` and `flush_interval` fields because they were validated and documented but not used by the exporter implementation. Updated the Collector config to use `sending_queue.batch` settings instead.

## Review Notes
- I could not compile the snippets locally because the environment does not have the `go` command installed. The review was performed against official OpenTelemetry documentation and v0.153.0 source/API references.
