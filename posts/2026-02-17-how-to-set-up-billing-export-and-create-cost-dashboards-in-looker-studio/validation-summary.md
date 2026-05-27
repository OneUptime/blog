# Validation Summary: How to Set Up Billing Export and Create Cost Dashboards in Looker Studio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Billing export
- BigQuery datasets, tables, views, and Standard SQL
- bq command-line tool
- Looker Studio reports, controls, calculated fields, scheduling, and data freshness

## Sources Consulted
- Google Cloud Billing: Set up Cloud Billing data export to BigQuery: https://cloud.google.com/billing/docs/how-to/export-data-bigquery-setup
- Google Cloud Billing: Understand the Cloud Billing data tables in BigQuery: https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables
- Google Cloud Billing: Structure of Standard data export: https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage
- BigQuery: Manage datasets: https://cloud.google.com/bigquery/docs/managing-datasets
- Looker Studio: Connect to Google BigQuery: https://cloud.google.com/looker/docs/studio/connect-to-google-bigquery
- Looker Studio: Schedule automatic report delivery: https://cloud.google.com/looker/docs/studio/schedule-automatic-report-delivery
- Looker Studio: Manage data freshness: https://cloud.google.com/looker/docs/studio/manage-data-freshness
- Looker Studio: Dates and times: https://cloud.google.com/looker/docs/studio/dates-and-times
- Looker Studio: About controls: https://cloud.google.com/looker/docs/studio/about-controls

## Issues Found
- The post described the BigQuery and Looker Studio setup as "free." Official Google Cloud documentation notes that BigQuery storage and query costs can apply, including when accessed from Looker Studio. Changed the wording to "low-cost" and added a BigQuery cost caveat in the conclusion.
- The export setup step told readers to enable both Standard and Detailed exports, but the SQL examples query the Standard usage cost export table (`gcp_billing_export_v1_<BILLING_ACCOUNT_ID>`). Updated the instruction to enable Standard usage cost export, with Detailed usage cost export only when resource-level data is needed.
- The Looker Studio field setup described `team` and `environment` as "Dimension types." Looker Studio field types should be Text for these string fields; they are used as dimensions in charts. Updated the wording.
- The Cost Per Day Average calculated field used `DATE_DIFF(MAX(date), MIN(date))`. Current Looker Studio guidance recommends `DATETIME_DIFF` for Date and Date & Time fields and requires a date part such as `DAY`. Updated the formula to `SUM(net_cost) / (DATETIME_DIFF(MAX(date), MIN(date), DAY) + 1)`.
- The caching best practice used generic "enable caching" language. Looker Studio documents this setting as data freshness. Updated the wording to "set BigQuery data freshness to 12 hours."

## Review Notes
- The BigQuery SQL examples use fields documented in the Cloud Billing Standard usage cost export schema, including `usage_start_time`, `project.name`, `service.description`, `sku.description`, `usage.amount_in_pricing_units`, `usage.pricing_unit`, `labels`, and `credits`.
- The `bq mk --dataset --location --description` dataset creation pattern is consistent with BigQuery dataset creation documentation, but the local environment did not have the `bq` CLI installed, so command verification was performed against official documentation rather than local `bq --help` output.
- Billing export data availability depends on dataset location. Multi-region datasets such as `US` can receive retroactive current and previous month data, while supported regional locations start from enablement time.
