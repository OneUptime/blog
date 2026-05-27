# Validation Summary: How to Monitor Inventory Levels Across Warehouses Using Supply Chain Twin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Supply Chain Twin
- BigQuery
- Cloud Pub/Sub
- Cloud Functions for Python
- Cloud Scheduler
- Python Google Cloud BigQuery client
- Python Google Cloud Pub/Sub client

## Sources Consulted
- Google Cloud Supply Chain and Logistics solution overview, which the Supply Chain Twin URL currently redirects to: https://cloud.google.com/solutions/supply-chain-twin
- BigQuery partitioned tables documentation: https://cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery clustered tables documentation: https://cloud.google.com/bigquery/docs/clustered-tables
- BigQuery GoogleSQL DML MERGE syntax: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax#merge_statement
- BigQuery mathematical functions, including SAFE_DIVIDE: https://cloud.google.com/bigquery/docs/reference/standard-sql/mathematical_functions#safe_divide
- Python BigQuery Client.insert_rows_json reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client#google_cloud_bigquery_client_Client_insert_rows_json
- Cloud Functions CloudEvents Pub/Sub sample for Python: https://cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- Cloud Scheduler HTTP target authentication documentation: https://cloud.google.com/scheduler/docs/http-target-auth
- Google Cloud CLI `gcloud scheduler jobs create http` reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http

## Issues Found
- The automated alerting example called `check_below_safety_stock()` but did not define it, so the Cloud Function would raise a `NameError` whenever it ran. Added the missing function using the same BigQuery and Pub/Sub alert pattern already used by the stockout check.
- The stockout alert SQL selected unqualified `product_id` after joining two tables that both contain `product_id`, which would be ambiguous in BigQuery. Qualified the selected columns as `ci.warehouse_id` and `ci.product_id`.

## Review Notes
The SQL DDL, partitioning and clustering clauses, MERGE statement, SAFE_DIVIDE usage, Pub/Sub CloudEvent decoding pattern, BigQuery JSON insert API, and Cloud Scheduler command are consistent with current Google Cloud documentation. The post uses placeholder resource names such as `project`, `YOUR_PROJECT`, and `monitoring-sa`, so readers must replace them with real project IDs, datasets, function names, and service accounts before running the examples.
