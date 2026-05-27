# Validation Summary: How to Troubleshoot BigQuery BI Engine Reservation Not Accelerating Queries

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud
- BigQuery
- BigQuery BI Engine
- BigQuery INFORMATION_SCHEMA
- bq command-line tool
- GoogleSQL

## Sources Consulted
- Google Cloud documentation: Reserve BI Engine capacity - https://cloud.google.com/bigquery/docs/bi-engine-reserve-capacity
- Google Cloud documentation: Monitor BI Engine - https://cloud.google.com/bigquery/docs/bi-engine-monitor
- Google Cloud documentation: Introduction to BI Engine - https://cloud.google.com/bigquery/docs/bi-engine-intro
- Google Cloud documentation: BigQuery INFORMATION_SCHEMA JOBS view - https://cloud.google.com/bigquery/docs/information-schema-jobs
- Google Cloud documentation: bq command-line tool reference - https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Google Cloud documentation: BigQuery REST Job BiEngineStatistics reference - https://cloud.google.com/bigquery/docs/reference/rest/v2/Job#BiEngineStatistics

## Issues Found
- The post used non-current or incorrect BI Engine bq commands, including `bq ls --reservation --bi_reservation`, `gcloud alpha bq reservations list`, and `bq update --bi_reservation --reservation_size=...`. Replaced them with `INFORMATION_SCHEMA.BI_CAPACITIES` checks and the documented `bq update --reservation --bi_reservation_size=SIZE` syntax.
- The post stated that BI Engine reservation size for the bq command is in bytes. Updated this to GiB, matching the documented `--bi_reservation_size` behavior.
- The post said users cannot explicitly choose tables to cache, but BI Engine supports preferred tables. Updated the wording to mention preferred tables and clarified that preferred tables limit which tables are eligible for acceleration.
- The unsupported feature list was too broad for UDFs and too specific for `CROSS JOIN`. Updated it to refer to JavaScript and other non-SQL UDFs, and to unsupported join patterns.
- One SQL example mixed aggregation and a window function in a way that would not be valid as written. Simplified the example so it remains valid GoogleSQL while still illustrating a window-function pattern.
- The warm-up query used `SELECT * ... LIMIT 1`, which would not represent the workload that BI Engine should accelerate. Replaced it with a representative aggregate query.
- The post oversimplified reservation capacity by saying a 10 GB reservation caches exactly 20% of a 50 GB table. Reworded it to describe BI Engine's column, partition, and least-recently-used offloading behavior.
- The BI tool section implied tools must send queries in a special way for BI Engine to intercept them. Updated this to focus on the documented requirements: project, location, and supported query patterns.

## Review Notes
The post is technically relevant and now matches current BigQuery BI Engine documentation. Future improvements could include examples using Cloud Monitoring `bigquerybiengine` metrics, but that is outside the scope of a correctness-only edit.
