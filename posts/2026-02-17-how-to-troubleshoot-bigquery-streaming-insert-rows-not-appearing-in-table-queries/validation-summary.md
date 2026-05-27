# Validation Summary: How to Troubleshoot BigQuery Streaming Insert Rows Not Appearing

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery legacy streaming inserts (`tabledata.insertAll`)
- BigQuery streaming buffer
- BigQuery Python client library
- BigQuery `bq` CLI
- GoogleSQL `EXPORT DATA` and time travel queries

## Sources Consulted
- BigQuery legacy streaming API documentation: https://docs.cloud.google.com/bigquery/docs/streaming-data-into-bigquery
- BigQuery Python client `Client.insert_rows_json` reference: https://docs.cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- BigQuery DML limitations documentation: https://docs.cloud.google.com/bigquery/docs/data-manipulation-language
- BigQuery quotas and limits documentation: https://docs.cloud.google.com/bigquery/quotas
- BigQuery `EXPORT DATA` statement reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/export-statements
- BigQuery table decorators documentation: https://docs.cloud.google.com/bigquery/docs/table-decorators
- BigQuery table snapshots introduction: https://cloud.google.com/bigquery/docs/table-snapshots-intro
- BigQuery export documentation: https://docs.cloud.google.com/bigquery/docs/exporting-data

## Issues Found
- The post described `insertAll` and the Storage Write API as if they shared all streaming buffer, DML, and `insertId` behavior. I narrowed the main explanation to the legacy `tabledata.insertAll` API and added a caveat that Storage Write API behavior differs.
- The post described query visibility as a buffer delay of a few seconds. BigQuery documents `insertAll` rows as available to queries immediately after successful acknowledgement, so I updated that section to focus on waiting for the insert acknowledgement and on asynchronous producer or test timing.
- The DML limitation was stated too broadly. I changed it to match the documented `tabledata.insertAll` limitation: recently streamed rows cannot be modified with `UPDATE`, `DELETE`, `MERGE`, or `TRUNCATE` for about 30 minutes.
- The streaming insert size limits listed a 1 MB per-row limit. BigQuery's current documented limit is 10 MB per request and 10 MB per row, so I corrected the row limit.
- The Python snippet for disabling deduplication created a `TableRow` object but did not call the supported `insert_rows_json` API. I changed it to pass plain JSON rows and explicit `row_ids=[None] * len(rows)`, which the Python client documents as disabling explicit insert IDs for those rows.
- Removed an unused `uuid` import from the deduplication example.

## Review Notes
The remaining examples are illustrative and assume an authenticated BigQuery client, an existing table, compatible schema, and an appropriate project or default project context. The Python client currently auto-generates insert IDs by default for `insert_rows_json`, but Google recommends omitting insert IDs for maximum streaming throughput when best-effort deduplication is not needed.
