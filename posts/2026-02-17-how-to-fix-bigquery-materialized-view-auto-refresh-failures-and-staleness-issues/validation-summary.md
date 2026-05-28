# Validation Summary: How to Fix BigQuery Materialized View Auto-Refresh Failures and Staleness Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery materialized views
- BigQuery INFORMATION_SCHEMA views
- BigQuery bq command-line tool
- GoogleSQL DDL and queries

## Sources Consulted
- Google Cloud BigQuery: Manage materialized views - https://docs.cloud.google.com/bigquery/docs/materialized-views-manage
- Google Cloud BigQuery: Create materialized views - https://docs.cloud.google.com/bigquery/docs/materialized-views-create
- Google Cloud BigQuery: Use materialized views - https://docs.cloud.google.com/bigquery/docs/materialized-views-use
- Google Cloud BigQuery: Monitor materialized views - https://docs.cloud.google.com/bigquery/docs/materialized-views-monitor
- Google Cloud BigQuery: INFORMATION_SCHEMA MATERIALIZED_VIEWS view - https://docs.cloud.google.com/bigquery/docs/information-schema-materialized-views
- Google Cloud BigQuery: INFORMATION_SCHEMA JOBS view - https://docs.cloud.google.com/bigquery/docs/information-schema-jobs
- Google Cloud BigQuery: Streaming data into BigQuery - https://docs.cloud.google.com/bigquery/docs/streaming-data-into-bigquery
- Google Cloud BigQuery: bq command-line tool reference - https://cloud.google.com/bigquery/docs/reference/bq-cli-reference

## Issues Found
- The post used `INFORMATION_SCHEMA.TABLES.last_modified_time` as the materialized view refresh timestamp. BigQuery exposes refresh state through `INFORMATION_SCHEMA.MATERIALIZED_VIEWS` using `last_refresh_time`, `refresh_watermark`, and `last_refresh_status`, so the refresh and health-check queries were updated.
- The auto-refresh timing description implied a guaranteed refresh within a few minutes. BigQuery documents automatic refresh as best-effort, with default behavior attempting to start within 5 minutes when the previous refresh is outside the frequency cap, so the wording was corrected.
- The streaming buffer section implied materialized view queries may be stale and should be bypassed for real-time accuracy. BigQuery materialized view queries can return fresh results by combining cached data with base table changes, although cost or latency can increase, so the guidance was revised.
- The unsupported SQL section said unsupported definitions could be created but later fail auto-refresh. Unsupported incremental materialized view SQL generally fails at creation time; later refresh failures are more commonly detected through `last_refresh_status`, so this was corrected.
- The unsupported features list treated all outer joins and all union forms as unsupported. Current BigQuery documentation notes Preview support for `LEFT OUTER JOIN` and `UNION ALL` in incremental materialized views, with smart tuning limitations, so the list was updated.
- The refresh job query filtered on `statement_type = 'MATERIALIZED_VIEW_REFRESH'`. Official monitoring guidance identifies automatic refresh jobs by the `materialized_view_refresh` job ID prefix, so the query was updated accordingly.
- The schema-change diagnostic query only listed materialized views from `INFORMATION_SCHEMA.TABLES`. It now checks `INFORMATION_SCHEMA.MATERIALIZED_VIEWS.last_refresh_status` for invalid or failed refreshes.

## Review Notes
The examples remain generic and assume the dataset location matches the query execution location. For production monitoring, users should replace `region-us` and dataset qualifiers with the actual BigQuery dataset region.
