# Validation Summary: How to Build a FinOps Practice on GCP Using Billing Export BigQuery

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Billing export
- BigQuery and GoogleSQL
- bq command-line tool
- Looker and LookML
- Cloud Functions for Python
- Cloud Scheduler
- Google Cloud labels
- Compute Engine and Google Kubernetes Engine
- Committed use discounts and sustained use discounts

## Sources Consulted
- Google Cloud Billing: Set up Cloud Billing data export to BigQuery: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-setup
- Google Cloud Billing: Understand the Cloud Billing data tables in BigQuery: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables
- Google Cloud Billing: Detailed usage cost data export schema: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/detailed-usage
- Google Cloud Billing: Standard usage cost data export schema: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage
- Google Cloud Billing: Pricing data export schema: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/pricing-data
- BigQuery: Manage datasets with the bq CLI: https://docs.cloud.google.com/bigquery/docs/managing-datasets
- BigQuery: INFORMATION_SCHEMA COLUMNS view: https://cloud.google.com/bigquery/docs/information-schema-columns
- BigQuery: GoogleSQL aggregate and window function reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate-function-calls
- Google Cloud SDK: gcloud compute instances update: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/update
- Google Cloud SDK: gcloud container clusters update: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Kubernetes Engine: GKE cost allocation and detailed billing export labels: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cost-allocations
- Looker: sql_table_name for views: https://cloud.google.com/looker/docs/reference/param-view-sql-table-name
- Looker: value_format_name: https://cloud.google.com/looker/docs/reference/param-field-value-format-name
- Google Cloud Functions: Python functions framework and environment variables: https://cloud.google.com/functions/docs
- Google Cloud Billing: Committed use discounts overview: https://docs.cloud.google.com/docs/cuds
- FinOps Foundation: FinOps Framework phases: https://www.finops.org/framework/

## Issues Found
- The setup created only the `billing_export` dataset, but later examples create views in `my-billing-project.finops`. Added a `bq mk --dataset` command for the `finops` dataset so the view examples have a destination dataset.
- The post described Standard Billing Export as daily summaries only. Updated the description to match the standard usage cost export schema, which contains usage cost records with service, SKU, project, label, location, usage, credit, and cost fields.
- The post said Detailed Billing Export is needed because it includes labels and project IDs. Standard export also includes those fields, while Detailed export adds resource-level cost data. Updated the wording accordingly.
- The `INFORMATION_SCHEMA.COLUMNS` query selected a `description` column, which is not part of BigQuery's COLUMNS view. Removed that column from the example.
- The Compute Engine optimization query was labeled as finding idle instances with low CPU utilization, but it only uses billing data and does not query Cloud Monitoring metrics. Renamed the view and comments to describe high-cost instance usage for right-sizing review.
- The persistent disk query was labeled as identifying unattached disks, but billing export alone does not expose attachment state. Updated the comment to describe persistent disk storage spend that should be investigated for unattached disks.
- The Cloud Function sample referenced `SLACK_WEBHOOK` without defining it. Added `os.environ["SLACK_WEBHOOK"]` so the example has a concrete source for the environment variable.

## Review Notes
The remaining SQL examples are illustrative and depend on replacing placeholder project, dataset, and billing account IDs. Current-day billing export queries can return incomplete data because Cloud Billing export and some discount credits have latency; production dashboards should account for that delay.
