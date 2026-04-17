# Validation Summary: How to Handle Bulk Inserts in ClickHouse from Go

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ClickHouse (database)
- Go (programming language)
- `github.com/ClickHouse/clickhouse-go/v2` (official Go driver)
- ClickHouse `system.part_log` system table

## Sources Consulted
- Official ClickHouse Go driver v2 documentation: https://github.com/ClickHouse/clickhouse-go
- ClickHouse `system.part_log` reference: https://clickhouse.com/docs/en/operations/system-tables/part_log
- ClickHouse "Too many parts" error documentation and best practices: https://clickhouse.com/docs/en/optimize/bulk-inserts

## Issues Found
1. **Incorrect column name in `system.part_log` query**: The monitoring SQL snippet used `bytes_compressed_on_disk`, which is not a column in `system.part_log`. That column exists in `system.parts`, but the equivalent in `system.part_log` is `size_in_bytes`. Replaced `bytes_compressed_on_disk` with `size_in_bytes` so the query executes correctly.

## Review Notes
- The `clickhouse-go/v2` API usage is correct: `conn.PrepareBatch(ctx, query)` returns a `Batch`, which accepts rows via `Append(...)` and is flushed via `Send()`. The shortened `INSERT INTO events (...)` form (without `VALUES`) is the canonical format the v2 driver expects for `PrepareBatch`.
- `event_type = 'NewPart'` is a valid enum value for `system.part_log` (other values include `MergePartsStart`, `MergeParts`, `DownloadPart`, `RemovePart`, `MutatePartStart`, `MutatePart`, `MovePart`).
- The worker-pool example uses `sync.WaitGroup` but doesn't reprint the import block; this is a readability choice rather than a technical error, since the imports are shown in the first snippet. Readers copying only the later snippet should remember to add `"sync"` to imports.
- The `insertPipeline` reuses the `buffer` slice by slicing to zero length after a synchronous `bulkInsert` call. This is safe because the insert completes before the buffer is reset; if the flush were made asynchronous in the future, the code would need to copy the slice before handing it off.
- Batch-size recommendations (targeting 1–10 MB per insert) align with ClickHouse's official guidance that batches should contain at least 1,000 rows and ideally produce parts in the low-MB range to avoid excessive merge pressure.
