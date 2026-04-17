# Validation Summary: How to Use Arrow Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Arrow and ArrowStream input/output formats)
- Apache Arrow IPC (file + stream formats, aka Feather v2)
- PyArrow (`pyarrow`, `pyarrow.ipc`)
- `clickhouse-client` CLI
- ClickHouse `file()` and `s3()` table functions
- `INTO OUTFILE ... FORMAT ...` syntax
- MergeTree engine, `LowCardinality`, `DateTime64`

## Sources Consulted
- ClickHouse Arrow format docs: https://clickhouse.com/docs/en/interfaces/formats/Arrow
- ClickHouse ArrowStream format docs: https://clickhouse.com/docs/en/interfaces/formats/ArrowStream
- ClickHouse `s3` table function docs: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse `file` table function docs: https://clickhouse.com/docs/en/sql-reference/table-functions/file
- Apache Arrow IPC / Feather v2 specification: https://arrow.apache.org/docs/format/Columnar.html#ipc-file-format
- PyArrow IPC API: https://arrow.apache.org/docs/python/ipc.html

## Issues Found
No technical issues found.

Verified in particular:
- Both `Arrow` (file/random-access) and `ArrowStream` (stream) are valid ClickHouse formats with matching descriptions in the official docs.
- Type mapping table is correct: ClickHouse `String` maps to Arrow `utf8` by default (the `output_format_arrow_string_as_string` setting defaults to `1`); `Date` → `date32`; `DateTime` → `timestamp[s]`; `DateTime64(3)` → `timestamp[ms]` (Arrow precision derived from the ClickHouse scale).
- PyArrow snippets use current APIs: `pyarrow.ipc.open_stream`, `pyarrow.ipc.new_file`, `pa.record_batch(data, schema=...)`, and `writer.write_batch(batch)` are all valid.
- CLI usage of `clickhouse-client --query "..." FORMAT Arrow` and `FORMAT ArrowStream` is valid, as is the `INTO OUTFILE '...' FORMAT Arrow` clause.
- `s3(url, access_key_id, secret_access_key, format)` positional argument order matches the documented `s3` table function signature, and glob patterns in the URL are supported.

## Review Notes
- The String → Arrow type mapping depends on the `output_format_arrow_string_as_string` setting; it has defaulted to `1` (i.e. `utf8`) for several ClickHouse versions, so the table is accurate for current releases. If readers use a very old ClickHouse build they may observe `binary` instead — not worth changing the post over.
- `Arrow Flight` is mentioned under the JVM side. ClickHouse itself does not implement an Arrow Flight server; the sentence only says client code can exchange data with ClickHouse at high throughput, which is fine, but some readers might infer native Flight support. Minor wording nit, not a technical error.
- The post uses `Float32`/`Float64` and maps them to `float32`/`float64`; Arrow's canonical names are `float` (32-bit) and `double` (64-bit) in the spec, but PyArrow exposes them as `pa.float32()`/`pa.float64()`, and ClickHouse's docs use the same form, so the mapping is consistent with the ecosystem the post targets.
