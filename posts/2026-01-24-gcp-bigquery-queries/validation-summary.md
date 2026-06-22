# Validation Summary: How to Handle BigQuery Queries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud BigQuery
- GoogleSQL
- BigQuery bq command-line tool
- Python BigQuery client library
- Terraform Google provider
- BigQuery scheduled queries
- BigQuery INFORMATION_SCHEMA

## Sources Consulted
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- BigQuery estimate and control costs: https://docs.cloud.google.com/bigquery/docs/best-practices-costs
- BigQuery optimize query computation: https://docs.cloud.google.com/bigquery/docs/best-practices-performance-compute
- BigQuery dry run Python sample: https://docs.cloud.google.com/bigquery/docs/samples/bigquery-query-dry-run
- BigQuery bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery scheduled queries: https://docs.cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery cached query results: https://docs.cloud.google.com/bigquery/docs/cached-results
- BigQuery partitioned tables: https://docs.cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery clustered tables: https://docs.cloud.google.com/bigquery/docs/clustered-tables
- BigQuery JSON functions: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- BigQuery INFORMATION_SCHEMA JOBS view: https://docs.cloud.google.com/bigquery/docs/information-schema-jobs
- Terraform Google provider google_bigquery_data_transfer_config resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_data_transfer_config

## Issues Found
- The pricing section used outdated on-demand pricing and "flat-rate" terminology. Updated it to current on-demand pricing of $6.25 per TiB processed and capacity-based reservations/slots.
- The Python dry-run cost estimate used $5 per TiB. Updated the calculation to use $6.25 per TiB and corrected the displayed unit from GB to GiB because the code divides by powers of 1024.
- The partitioning examples used `PARTITION BY DATE(order_date)` while the rest of the post treats `order_date` as a DATE column. Updated those examples to `PARTITION BY order_date`.
- Several examples used `DATE(order_date)` even though `order_date` is treated as a DATE column. Updated those queries to reference `order_date` directly.
- The LIMIT exploration section could imply that LIMIT controls query cost. Added a caveat that LIMIT does not reduce bytes read or query cost for non-clustered tables.
- The JSON example used deprecated `JSON_EXTRACT_SCALAR`. Replaced it with the current `JSON_VALUE` function.
- The "Set Project-Level Quotas" heading described a per-query `maximum_bytes_billed` example, not a project-level quota. Updated the heading to "Set Query-Level Byte Limits."
- The labels example was fenced as SQL while containing Python code and SQL-style comments. Updated the code fence and comments to Python.
- The INFORMATION_SCHEMA cost query estimated cost from `total_bytes_processed` and used outdated pricing. Updated it to estimate on-demand cost from `total_bytes_billed` at $6.25 per TiB while still reporting processed TiB.

## Review Notes
The examples remain illustrative and use placeholder project, dataset, and table names. Actual BigQuery costs can vary by region, pricing model, free-tier eligibility, reservations, editions, and cache behavior.
