# Validation Summary: How to Monitor SQLite Operations in Mobile Apps with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing and metrics
- OpenTelemetry Java SDK for Android/Kotlin
- OpenTelemetry Swift SDK for iOS
- Android SQLiteDatabase
- SQLite C API on iOS
- OpenTelemetry Collector
- OTLP export to OneUptime

## Sources Consulted
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry Android documentation: https://opentelemetry.io/docs/platforms/client-apps/android/
- OpenTelemetry Java API and SDK documentation: https://opentelemetry.io/docs/languages/java/api/ and https://opentelemetry.io/docs/languages/java/exporters/
- OpenTelemetry Swift instrumentation documentation: https://opentelemetry.io/docs/languages/swift/instrumentation/
- OpenTelemetry Swift GitHub README: https://github.com/open-telemetry/opentelemetry-swift
- Android SQLiteDatabase API reference: https://developer.android.com/reference/android/database/sqlite/SQLiteDatabase
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- The post used older database semantic-convention attributes such as `db.system`, `db.operation`, `db.sql.table`, `db.statement`, and `db.row_count`. Updated the Android code, Swift code, attribute table, and analysis guidance to the current names: `db.system.name`, `db.operation.name`, `db.collection.name`, `db.query.text`, and `db.response.returned_rows`.
- The Android setup snippet configured only tracing, but the later health metrics snippet called `OpenTelemetrySetup.getMeter()`. Added `SdkMeterProvider`, `PeriodicMetricReader`, `OtlpGrpcMetricExporter`, and a `getMeter()` helper so the metrics example is connected to an SDK meter provider.
- The Android dependencies were outdated and included the alpha semantic conventions artifact even though the snippets use string attribute keys. Updated the OpenTelemetry Java artifacts to `1.62.0` and removed the unnecessary semantic-conventions dependency.
- The Android setup described mobile-optimized exporters in a way that conflated the OpenTelemetry Android agent with the Java OTLP exporters. Adjusted the wording to distinguish OpenTelemetry Android instrumentation from the Java SDK/exporter setup shown in the code.
- The Swift package comment used an old `opentelemetry-swift` version and omitted the `opentelemetry-swift-core` package used for `OpenTelemetryApi` and `OpenTelemetrySdk`. Updated the SPM comments to the current package layout and version shown by the official README.
- The Swift SQLite snippet used SQLite C APIs without importing `SQLite3`. Added the import.
- The Collector configuration included a filter processor block whose comments claimed it filtered spans below 1 ms, but the configuration only matched SQLite attributes and the processor was not included in the pipeline. Removed the misleading, unused filter block.
- The OneUptime exporter used an outdated/non-matching OTLP gRPC endpoint. Updated it to OneUptime's documented OTLP HTTP endpoint, JSON encoding, content type, and `x-oneuptime-token` header.

## Review Notes
- The examples still record `db.query.text` for raw SQL snippets. The post warns about PII, but production instrumentation should only send sanitized SQL text or static parameterized query text, consistent with the OpenTelemetry database semantic conventions.
