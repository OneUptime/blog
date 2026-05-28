# Validation Summary: How to Design a Cloud Bigtable Schema for Time Series Data

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Bigtable
- Bigtable schema design for time-series data
- Bigtable row keys, column families, and garbage collection policies
- `cbt` CLI
- Python `google-cloud-bigtable` client library

## Sources Consulted
- Google Cloud Bigtable schema design for time series data: https://docs.cloud.google.com/bigtable/docs/schema-design-time-series
- Google Cloud Bigtable schema design best practices: https://docs.cloud.google.com/bigtable/docs/schema-design
- Google Cloud Bigtable garbage collection overview: https://docs.cloud.google.com/bigtable/docs/garbage-collection
- Google Cloud Bigtable `cbt` CLI reference: https://docs.cloud.google.com/bigtable/docs/cbt-reference
- Google Cloud Bigtable Python `Table` reference: https://docs.cloud.google.com/python/docs/reference/bigtable/latest/table
- Google Cloud Bigtable Python `DirectRow` reference: https://docs.cloud.google.com/python/docs/reference/bigtable/latest/google.cloud.bigtable.row.DirectRow
- Bigtable paper, "Bigtable: A Distributed Storage System for Structured Data": https://research.google.com/archive/bigtable-osdi06.pdf

## Issues Found
- The post said Bigtable reads data at the column family level in a way that implied unfiltered reads skip other families automatically. Updated the wording to clarify that Bigtable lets clients filter reads by column family; unfiltered `read_rows` calls read every column in each row.
- The Python examples passed string row keys to `table.direct_row`, but the current Python client documents row keys as bytes. Updated the write examples to encode row keys before creating `DirectRow` instances.
- The Python examples used `RowRange` directly as `row_set`, but `Table.read_rows` expects direct `start_key`/`end_key` arguments or a `RowSet`. Updated range scans to use documented `start_key`, `end_key`, `limit`, and `end_inclusive` parameters.
- The latest-reading prefix scan had no upper bound, so a missing sensor prefix could read the next sensor's first row. Added an end key based on the prefix plus `b'\xff'`.
- The write example used integer microsecond timestamps for `DirectRow.set_cell`, while the documented classic Python client parameter is a `datetime.datetime`. Updated the example to use a timezone-aware `datetime` and align microseconds to millisecond precision, matching Bigtable timestamp requirements.

## Review Notes
- The row-key design guidance, reverse timestamp recommendation, warning against timestamp row-key prefixes, column-family retention guidance, and `cbt setgcpolicy` examples align with current Google Cloud documentation.
- The Python snippets are illustrative and require a configured Bigtable `table` object, project, instance, table, and credentials to run against a real Bigtable instance.
