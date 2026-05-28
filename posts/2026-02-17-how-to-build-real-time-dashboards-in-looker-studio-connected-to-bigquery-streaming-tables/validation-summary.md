# Validation Summary: How to Build Real-Time Dashboards in Looker Studio Connected to BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Looker Studio
- BigQuery
- BigQuery Storage Write API
- BigQuery streaming inserts
- BigQuery materialized views
- BigQuery BI Engine
- BigQuery scheduled queries
- Python
- GoogleSQL
- bq command-line tool

## Sources Consulted
- BigQuery Storage Write API overview: https://cloud.google.com/bigquery/docs/write-api
- Stream data using the BigQuery Storage Write API: https://cloud.google.com/bigquery/docs/write-api-streaming
- BigQuery JSON data and Storage Write API JSON handling: https://cloud.google.com/bigquery/docs/json-data
- BigQuery materialized views introduction: https://cloud.google.com/bigquery/docs/materialized-views-intro
- BigQuery materialized view creation and query limitations: https://cloud.google.com/bigquery/docs/materialized-views-create
- BigQuery BI Engine capacity reservations: https://cloud.google.com/bigquery/docs/bi-engine-reserve-capacity
- Looker Studio auto refresh: https://cloud.google.com/looker/docs/studio/manage-auto-refresh-for-a-report
- Looker Studio data freshness: https://cloud.google.com/looker/docs/studio/manage-data-freshness
- BigQuery scheduled queries: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery ERROR debugging function: https://cloud.google.com/bigquery/docs/reference/standard-sql/debugging_functions
- BigQuery Python Client insert_rows_json reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client

## Issues Found
- The table creation comment said the table was partitioned by ingestion time, but the SQL partitions by `DATE(event_timestamp)`. Updated the comment to say event time.
- The Storage Write API Python example attempted to create a `DEFAULT` write stream and append rows without the required writer schema. Updated it to use the `_default` stream with an `AppendRowsStream`, a proto descriptor, and serialized proto rows.
- The Storage Write API example did not account for BigQuery's proto representation of `TIMESTAMP` and `JSON` fields. Added normalization for epoch-microsecond timestamps and JSON strings.
- The simple streaming insert example used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware `datetime.now(UTC)`.
- The Looker Studio refresh instructions confused report auto refresh with data source freshness and described a 1-minute report auto-refresh interval. Updated the text to state that auto refresh is a Looker Studio Pro report setting with a 5-minute minimum, while BigQuery data freshness can be set as low as 1 minute.
- The materialized view example used `CURRENT_TIMESTAMP()` in the `WHERE` clause and `COUNT(DISTINCT ...)`, which are not supported in BigQuery materialized view definitions. Removed the rolling time predicate and changed the distinct count to `APPROX_COUNT_DISTINCT`.
- The BI Engine `bq update` command used `--bi_reservation_size=2GB`, but the documented flag value is a number of gigabytes. Changed it to `--bi_reservation_size=2`.
- The alerting section claimed that a scheduled query sends an alert via Cloud Monitoring. Updated it to say the scheduled query fails on threshold breach and that Cloud Monitoring or another notification workflow should alert on that failure.

## Review Notes
The tutorial is technically relevant and valid after the corrections. The Storage Write API Python example still assumes the reader has compiled a matching `event_pb2.Event` proto module, which is appropriate for a concise blog snippet but should be expanded in a production-ready sample.
