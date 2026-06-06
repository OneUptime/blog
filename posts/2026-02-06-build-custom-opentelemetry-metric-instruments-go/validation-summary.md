# Validation Summary: How to Build Custom OpenTelemetry Metric Instruments in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- OpenTelemetry Go API
- OpenTelemetry Go metrics SDK
- OTLP metrics exporter over gRPC
- OpenTelemetry metric instruments: counters, up-down counters, histograms, gauges, and observable gauges
- OpenTelemetry metric views and resource semantic conventions

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Go metric API package: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go SDK metric package: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Go OTLP metric gRPC exporter package: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/

## Issues Found
- The setup snippet imported `log` without using it and used an older semantic convention import with the deprecated `deployment.environment` attribute. Updated the import to `semconv/v1.34.0` and changed the resource attribute to `DeploymentEnvironmentNameKey`, which maps to `deployment.environment.name`.
- The up-down counter snippet imported `fmt` without using it. Removed the unused import.
- The histogram snippet used `fmt.Sprintf` in `MeasureOperation` without importing `fmt`. Added the missing import.
- The asynchronous gauge snippet imported `time` without using it. Removed the unused import.
- The GC pause example always had a non-empty `PauseNs` ring buffer and could report an initial zero value before any GC. Changed the guard to `memStats.NumGC > 0` and used `(memStats.NumGC-1)%256` for the most recent pause.
- The business metrics snippet created an `Int64ObservableGauge` for active users without registering a callback, so it would not report values. Changed it to a synchronous `Int64Gauge` and added `RecordActiveUsers`.
- The metric views snippet omitted required imports, used `attribute.NewSet` where a view `AttributeFilter` requires an attribute filter function, and matched `database.query.duration` even though the earlier histogram was named `db.query.duration`. Added the missing imports, changed the filter to `attribute.NewAllowKeysFilter(...)`, and corrected the instrument name.
- The complete example imported `fmt` without using it. Removed the unused import.
- The metrics observer snippet used `attribute.String` without importing `go.opentelemetry.io/otel/attribute`. Added the missing import.

## Review Notes
Go is not installed in this environment, so I could not run `go test` or compile extracted snippets. Validation was performed against official OpenTelemetry documentation and package references, with manual syntax and import review. The `MeasureOperation` helper still creates an instrument dynamically from the operation name; this can be acceptable for a small bounded set of operation names, but future edits should warn against unbounded names because they increase metric cardinality and instrument churn.
