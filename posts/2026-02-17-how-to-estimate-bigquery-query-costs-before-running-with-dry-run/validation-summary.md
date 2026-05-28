# Validation Summary: How to Estimate BigQuery Query Costs Before Running with Dry Run

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery dry runs
- bq command-line tool
- BigQuery REST API
- Google Cloud Python BigQuery client
- BigQuery on-demand and capacity pricing
- BigQuery partitioning, clustering, wildcard tables, and DML

## Sources Consulted
- BigQuery "Run a query" dry run documentation: https://cloud.google.com/bigquery/docs/running-queries
- BigQuery "Estimate and control costs" documentation: https://cloud.google.com/bigquery/docs/best-practices-costs
- BigQuery pricing documentation: https://cloud.google.com/bigquery/pricing
- BigQuery REST Job resource documentation: https://cloud.google.com/bigquery/docs/reference/rest/v2/Job
- BigQuery Python `QueryJobConfig` reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.job.QueryJobConfig
- BigQuery clustered tables documentation: https://cloud.google.com/bigquery/docs/clustered-tables
- BigQuery wildcard tables documentation: https://cloud.google.com/bigquery/docs/querying-wildcard-tables
- BigQuery DML syntax and on-demand query size calculation: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery quotas and limits documentation: https://cloud.google.com/bigquery/quotas

## Issues Found
- The post claimed dry runs do not count against any quotas and can be run without limit. Updated this to the documented behavior: dry runs are free and do not use query slots, but BigQuery job and API quotas can still apply.
- The pricing example described `$6.25 per TB` as a universal 2026 on-demand price. Updated the wording to `$6.25 per TiB in many US regions` to match BigQuery pricing units and regional variation.
- The REST API section said `totalBytesProcessed` appears in the statistics field. Updated this to the precise path, `statistics.query`.
- The clustering section said clustering effects are partially reflected. Updated this to clarify that BigQuery cannot precisely estimate clustered-table bytes before execution, so estimates are usually conservative.
- The wildcard table section said estimates are based on all matched tables. Updated this to include the documented `_TABLE_SUFFIX` caveat: constant filters can reduce scanned tables, while dynamic filters do not.
- The DML limitation said dry runs cannot estimate DML accurately because DML costs depend on data modified. Updated this to match BigQuery's documented DML billing formulas, where costs are based on bytes processed and UPDATE, DELETE, and some MERGE statements can include the target table or affected partitions.

## Review Notes
The CLI, REST API, and Python dry-run examples use current documented flags and API fields. The examples use a hard-coded on-demand price for illustration; future updates should re-check BigQuery regional pricing before publishing or refreshing the post.
