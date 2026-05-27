# Validation Summary: How to Use BigQuery Time Travel to Restore Accidentally Deleted Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- BigQuery time travel
- GoogleSQL
- bq command-line tool
- BigQuery Python client
- BigQuery table snapshots
- BigQuery fail-safe retention

## Sources Consulted
- BigQuery data retention with time travel and fail-safe: https://docs.cloud.google.com/bigquery/docs/time-travel
- BigQuery access historical data: https://docs.cloud.google.com/bigquery/docs/access-historical-data
- BigQuery restore deleted tables: https://docs.cloud.google.com/bigquery/docs/restore-deleted-tables
- BigQuery GoogleSQL query syntax, `FOR SYSTEM_TIME AS OF`: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
- BigQuery update dataset properties and `max_time_travel_hours`: https://cloud.google.com/bigquery/docs/updating-datasets
- BigQuery create table snapshots: https://docs.cloud.google.com/bigquery/docs/table-snapshots-create
- BigQuery GoogleSQL DDL statements: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language

## Issues Found
- The row-restore examples compared the current table with a historical version of the same table in a single query. BigQuery does not allow one query statement to reference a single table at multiple points in time. I changed the examples to stage the historical version in a temporary table before joining it to the current table.
- The `INSERT INTO ... SELECT ... FOR SYSTEM_TIME AS OF` restore examples read a historical version of the same table being modified. BigQuery DML statements operate on the current destination table and cannot also read that table at a historical point in time. I changed the examples to insert from staged temporary tables.
- The row-count comparison example used `UNION ALL` to query the same table at current, 24-hour, and 48-hour points in one query. I changed it to collect each count in separate statements and then select from a temporary results table.
- The dropped-table recovery section described the copy operation as using the table snapshot feature and said `@0` means "at the time of deletion." Official docs describe this as copying historical data with a time decorator, and `@0` means the oldest available historical data. I corrected the explanation and command comments.
- The dropped-table `bq cp` example mixed a `dropped_table` source with an `events_recovered` destination. I changed the destination to `dropped_table_recovered`.
- The Python recovery example used a naive `datetime`, which can convert using the local timezone. I changed it to an explicit UTC timestamp before converting to epoch milliseconds.
- The post stated that the time travel window is only dataset-level and that shorter windows save storage costs generally. Current docs note project-level defaults and that shorter windows save costs when using physical storage billing. I updated those statements.
- The fail-safe section said only Google Cloud Support can access fail-safe data through a support request. Current docs say fail-safe data cannot be queried or directly recovered and recovery requires contacting Cloud Customer Care. I updated the wording.

## Review Notes
The examples are accurate as BigQuery scripts that can use temporary tables. For very large recovery operations, a permanent staging table may be preferable to a temporary table so the intermediate result can be audited before reloading production data.
