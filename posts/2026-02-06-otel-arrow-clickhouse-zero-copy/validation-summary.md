# Validation Summary: How to Integrate OTel Arrow with Apache Arrow-Native Backends Like ClickHouse

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OTel Arrow / OpenTelemetry Protocol with Apache Arrow
- Apache Arrow IPC
- ClickHouse Arrow and ArrowStream input formats
- Go
- Apache Parquet

## Sources Consulted
- OpenTelemetry OTel Arrow project README: https://github.com/open-telemetry/otel-arrow
- OpenTelemetry Collector Contrib otelarrowreceiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/otelarrowreceiver/README.md
- OpenTelemetry Collector Contrib otelarrowreceiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/otelarrowreceiver/config.go
- OpenTelemetry Collector Contrib clickhouseexporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/README.md
- ClickHouse Arrow format documentation: https://clickhouse.com/docs/interfaces/formats/Arrow
- ClickHouse ArrowStream format documentation: https://clickhouse.com/docs/interfaces/formats/ArrowStream
- ClickHouse input and output formats list: https://clickhouse.com/docs/interfaces/formats
- Apache Arrow Go IPC package documentation: https://pkg.go.dev/github.com/apache/arrow/go/v18/arrow/ipc
- Apache Arrow Go Parquet pqarrow package documentation: https://pkg.go.dev/github.com/apache/arrow/go/v18/parquet/pqarrow

## Issues Found
- The post overstated the path as true zero-copy ingestion and complete elimination of serialization/deserialization. Updated the description and body text to describe reduced/lower-copy serialization overhead, because ClickHouse still parses Arrow input and casts it into ClickHouse columns.
- The post implied `FORMAT Arrow` avoided SQL parsing entirely. Updated the explanation to clarify that ClickHouse still parses the `INSERT` query, while the request body avoids JSON, CSV, and row-value parsing.
- The ClickHouse exporter code used `ipc.NewWriter`, which writes Arrow IPC stream format, while the query used `FORMAT Arrow`, which ClickHouse documents as Arrow file mode. Updated the exporter to use `FORMAT ArrowStream` and added a separate `ArrowStream` curl example.
- The Go exporter snippet imported unused `ptrace`, which would not compile, and did not URL-encode the ClickHouse query parameter. Removed the unused import and added `url.QueryEscape`.
- The Collector configuration nested `arrow.memory_limit_mib` under `grpc`; the OTel Arrow receiver config defines `arrow` as a sibling under `protocols`. Moved the config block to the correct level.
- The Collector pipeline implied a normal exporter can receive raw `arrow.Record` batches. Added a caveat that standard Collector pipelines pass `pdata`, so this requires a custom distribution or pipeline path that preserves Arrow batches.
- The schema text said the table matched the OTel Arrow schema directly. Updated it to clarify that OTel Arrow/OTAP uses multiple record batches and must be flattened or mapped to the chosen ClickHouse table schema.
- The trace ID columns assumed binary IDs without saying so. Added guidance for hexadecimal ID output.
- The Parquet snippet used the wrong Go import path for `pqarrow`, omitted the `os` and `arrow` imports, and ignored errors from `os.Create`, `NewFileWriter`, and `Write`. Updated the imports and error handling.
- Updated Apache Arrow Go imports from `v16` to current `v18` package paths used by the consulted documentation.
- Reframed the benchmark table as illustrative rather than verified benchmark data, because no source was provided for the exact numbers.

## Review Notes
The post is now technically defensible as a conceptual custom-integration guide. A future improvement would be to include a complete runnable custom Collector exporter implementation, because the current exporter method is a focused HTTP insert example rather than a full Collector component.
