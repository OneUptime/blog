# Validation Summary: How to Troubleshoot BigQuery Slow Queries Using INFORMATION_SCHEMA

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google BigQuery
- BigQuery INFORMATION_SCHEMA views
- BigQuery query execution graph and query plan API fields
- BigQuery SQL
- bq command-line tool
- Python JSON parsing

## Sources Consulted
- BigQuery INFORMATION_SCHEMA JOBS view: https://cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery INFORMATION_SCHEMA JOBS_TIMELINE view: https://cloud.google.com/bigquery/docs/information-schema-jobs-timeline
- BigQuery query plan and timeline documentation: https://cloud.google.com/bigquery/docs/query-plan-explanation
- BigQuery query performance insights documentation: https://cloud.google.com/bigquery/docs/query-insights
- BigQuery REST Job resource documentation: https://cloud.google.com/bigquery/docs/reference/rest/v2/Job
- BigQuery bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery partitioned table query documentation: https://cloud.google.com/bigquery/docs/querying-partitioned-tables
- BigQuery query computation best practices: https://cloud.google.com/bigquery/docs/best-practices-performance-compute

## Issues Found
- The `bq show` example used `<job-id>` as a shell placeholder. In an actual shell, the angle brackets would be parsed as input redirection, so it was changed to `JOB_ID`.
- The post referred to the Cloud Console "Execution Details" UI. Current BigQuery documentation describes opening the completed job and using the "Execution graph" tab, so the wording was updated.
- The explanation of low average slot usage and `waitMsAvg` implied slot contention too strongly. The text now distinguishes scheduling delays from confirmed slot contention and points to `JOBS_TIMELINE.period_estimated_runnable_units` for confirmation.
- The partition pruning example claimed that `EXTRACT` does not enable partition pruning. The wording was narrowed to say that wrapping the partitioning column can prevent pruning, matching BigQuery's documented guidance to isolate the partition column in filters.

## Review Notes
The remaining SQL examples are syntactically valid GoogleSQL patterns for BigQuery diagnostics. In practice, users should replace `region-us`, dataset names, table names, column names, and `JOB_ID` with values matching the job location and project environment.
