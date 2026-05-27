# Validation Summary: How to Store and Query IoT Time-Series Data in Google Cloud Bigtable for

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Bigtable
- Google Cloud CLI
- cbt CLI
- Python
- google-cloud-bigtable Python client library
- IoT time-series schema design

## Sources Consulted
- Google Cloud SDK reference for `gcloud bigtable instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/bigtable/instances/create
- Bigtable cbt CLI reference: https://docs.cloud.google.com/bigtable/docs/cbt-reference
- Bigtable cbt CLI overview and `.cbtrc` format: https://docs.cloud.google.com/bigtable/docs/cbt-overview
- Bigtable schema design best practices: https://docs.cloud.google.com/bigtable/docs/schema-design
- Bigtable schema design for time series data: https://docs.cloud.google.com/bigtable/docs/schema-design-time-series
- Bigtable Python client `Table` reference: https://docs.cloud.google.com/python/docs/reference/bigtable/latest/table
- Bigtable Python client `RowSet` and `RowRange` reference: https://cloud.google.com/python/docs/reference/bigtable/latest/row-set
- Bigtable read row range sample for Python: https://docs.cloud.google.com/bigtable/docs/samples/bigtable-reads-row-ranges
- Bigtable performance documentation: https://docs.cloud.google.com/bigtable/docs/performance
- Bigtable writes documentation: https://cloud.google.com/bigtable/docs/writes
- Bigtable quotas and limits: https://docs.cloud.google.com/bigtable/quotas

## Issues Found
- The instance creation command placed `storage-type=SSD` inside `--cluster-config`, but the current `gcloud bigtable instances create` syntax uses `--cluster-storage-type=SSD` for storage type. Updated the command accordingly.
- The row key example described `Long.MAX_VALUE - timestamp` but used a smaller hard-coded constant and did not pad the value. Updated the code to use `9223372036854775807` and fixed-width formatting so lexicographic sort order matches numeric reverse-timestamp order.
- The Python examples passed string row keys to `table.direct_row`, while the documented client API expects row keys as bytes. Updated `build_row_key` to return encoded bytes.
- The query examples imported `RowSet` and `RowRange` from `google.cloud.bigtable.row`, but the current Python client exposes them from `google.cloud.bigtable.row_set`. Updated the import and query code to use `RowSet`.
- The latest-read query used a range with only a start key, which could continue scanning beyond the target device prefix. Updated it to use `RowSet.add_row_range_with_prefix`.
- The time-range query used the wrong `RowSet`/`RowRange` APIs and an exclusive end key that could miss the exact `start_ms` row. Updated it to use `add_row_range_from_keys` with `end_inclusive=True`.
- The performance note said each SSD node handles about 10,000 reads/writes per second. Current Bigtable performance documentation lists up to about 17,000 reads per second or 14,000 writes per second for typical 1 KB rows under optimal conditions, so the note was updated.

## Review Notes
The remaining guidance is technically valid but simplified. For production IoT workloads, row-key design should still be validated against actual device cardinality and query patterns, and Bigtable's own time-series documentation notes that single-timestamp rows can still hotspot if write distribution is not broad enough.
