# Validation Summary: How to Debug BigQuery DML Quota Exceeded Errors for High-Frequency Table Updates

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google BigQuery
- BigQuery DML
- BigQuery INFORMATION_SCHEMA
- BigQuery streaming inserts
- BigQuery Storage Write API
- BigQuery load jobs and partition decorators
- Apache Beam / Cloud Dataflow
- Python Google Cloud client libraries

## Sources Consulted
- BigQuery quotas and limits: https://cloud.google.com/bigquery/quotas
- BigQuery DML guide and concurrency behavior: https://cloud.google.com/bigquery/docs/data-manipulation-language
- BigQuery DML syntax reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery Python client `insert_rows_json` reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- BigQuery Storage Write API overview: https://cloud.google.com/bigquery/docs/write-api
- BigQuery Storage Write API streaming guide: https://cloud.google.com/bigquery/docs/write-api-streaming
- BigQuery load data into partitioned tables: https://cloud.google.com/bigquery/docs/load-data-partitioned-tables
- BigQuery batch loading data: https://cloud.google.com/bigquery/docs/batch-loading-data
- Apache Beam BigQuery I/O connector documentation: https://beam.apache.org/documentation/io/built-in/google-bigquery/

## Issues Found
- The post described `INSERT` DML as limited to 1,500 per table per day. Current BigQuery documentation says DML statements per day are unlimited; the first 1,500 `INSERT` DML statements per table in a 24-hour period run immediately, then table-level INSERT concurrency is limited and additional statements may queue. Updated the quota explanation and micro-batch comment.
- The post described `UPDATE`/`DELETE`/`MERGE` DML as limited to 20 per table per day, with differences by on-demand versus flat-rate pricing. Current documentation describes a per-table concurrency limit of 2 mutating DML statements and a queue length of 20. Updated the quota explanation.
- The post called the legacy streaming insert API and the Storage Write API the same thing. `insert_rows_json` uses the legacy `tabledata.insertAll` path, while the Storage Write API is a separate ingestion API. Updated the wording.
- The Storage Write API sample created a `PENDING` stream while describing a streaming workload. Pending streams are for batch-style writes that become visible only after commit. Changed the sample to use a `COMMITTED` stream and removed an unused import.
- The batched `MERGE` example generated invalid GoogleSQL for the `UNNEST` source rows. Changed it to generate an array of `STRUCT(... AS id, ... AS value)` values and use `USING UNNEST([...])`.
- The post said each DML operation rewrites entire column files. Current BigQuery docs describe mutating DML as file-group-level rewrites without fine-grained DML, and fine-grained DML can reduce rewritten data. Updated the explanation.
- The partition load example mixed a partition decorator with a `--time_partitioning_field` flag. Simplified the example to the documented `bq load` partition decorator form for an existing partitioned table.
- The append-only example used `id` in comments but `order_id` in the view. Updated the comments to use `order_id`.
- The post said load jobs have a limit of 100,000 per table per day. Current BigQuery documentation lists 100,000 load jobs per project per day and 1,500 load jobs per table per day. Updated the statement.
- The monitoring query treated stale DML numbers as daily limits and calculated misleading percentages. Simplified it to report DML counts by day, table, and statement type.

## Review Notes
The Python examples still interpolate values into SQL strings for brevity. In production, use query parameters or load/stream structured rows to avoid quoting bugs and SQL injection risks. The Storage Write API sample remains intentionally simplified and does not show protobuf or Arrow serialization.
