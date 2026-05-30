# Validation Summary: How to Analyze GCP Billing Data in BigQuery Using Example Queries

## Status
validated

## Post Type
Tutorial / Query cookbook

## Technologies Covered
- Google Cloud Billing export
- BigQuery
- GoogleSQL
- SQL cost analysis
- Looker Studio

## Sources Consulted
- Google Cloud Billing documentation: Understand the Cloud Billing data tables in BigQuery - https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables
- Google Cloud Billing documentation: Structure of Standard data export - https://cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage
- BigQuery GoogleSQL timestamp functions - https://cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions
- BigQuery GoogleSQL date functions - https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions
- BigQuery GoogleSQL aggregate functions - https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions
- BigQuery GoogleSQL mathematical functions - https://cloud.google.com/bigquery/docs/reference/standard-sql/mathematical_functions

## Issues Found
- The prerequisites described the billing export table name only as `gcp_billing_export_v1_XXXXXX`, which is correct for standard export but not detailed export. Updated the text to also mention the detailed export table name, `gcp_billing_export_resource_v1_XXXXXX`.
- The billing schema summary omitted `location.location`, which is part of the exported location struct. Updated the description to include it.
- Query 3 used `TIMESTAMP_SUB(..., INTERVAL 1 MONTH)`, but BigQuery `TIMESTAMP_SUB` does not support `MONTH`. Changed the previous-month calculation to use `PARSE_DATE`, `DATE_SUB`, and `FORMAT_DATE`.
- Query 5 divided by standard deviation with `/`, which can fail when the standard deviation is zero. Changed the z-score calculations to use `SAFE_DIVIDE`.
- Query 10 matched credit names with case-sensitive `LIKE` checks. Changed those checks to use `LOWER(c.name)` so sustained and committed discount credits are classified more reliably.

## Review Notes
The queries are suitable as example analysis queries for standard Cloud Billing export tables after the corrections above. For invoice reconciliation, a future improvement would be to add a note that invoice-month reporting should use `invoice.month`, because usage month and invoice month can differ.
