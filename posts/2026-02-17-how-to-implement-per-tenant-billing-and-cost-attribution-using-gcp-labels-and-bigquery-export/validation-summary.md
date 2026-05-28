# Validation Summary: How to Use Per-Tenant Billing and Cost Attribution Using GCP Labels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Billing export
- BigQuery and BigQuery scheduled queries
- Google Cloud labels
- Terraform Google provider
- Cloud Asset Inventory
- Cloud Pub/Sub
- Google Kubernetes Engine cost allocation

## Sources Consulted
- Google Cloud Billing detailed usage export schema: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/detailed-usage
- Google Cloud Billing standard usage export schema and query examples: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/standard-usage
- BigQuery scheduled queries documentation: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery dataset creation and bq CLI documentation: https://cloud.google.com/bigquery/docs/datasets and https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Terraform Google provider `google_bigquery_dataset`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset
- Terraform Google provider `google_bigquery_data_transfer_config`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_data_transfer_config
- Terraform Google provider `google_compute_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Google provider `google_container_node_pool`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Cloud Asset Inventory `searchAllResources` documentation: https://docs.cloud.google.com/asset-inventory/docs/reference/rest/v1/TopLevel/searchAllResources
- Cloud Asset Inventory Python client documentation: https://docs.cloud.google.com/python/docs/reference/cloudasset/latest/google.cloud.asset_v1.services.asset_service.AssetServiceClient
- Google Cloud label best practices: https://docs.cloud.google.com/resource-manager/docs/best-practices-labels
- GKE cost allocation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cost-allocations

## Issues Found
- The post instructed readers to choose the Detailed usage cost export but used the standard export table name. Updated all billing queries to use `gcp_billing_export_resource_v1_...`, which is the detailed export table name.
- The monthly tenant-cost query unnested `credits` as an inner join. That drops rows without credits and can duplicate `cost` when a row has multiple credits. Changed credit aggregation to a correlated `UNNEST(credits)` subquery with `IFNULL`, matching Google Cloud Billing query examples.
- The label audit section was titled as organization-policy enforcement, but the code only audits resources and publishes notifications. Renamed the step and wording to Cloud Asset Inventory auditing.
- The Cloud Asset Inventory query attempted to filter missing hyphenated labels directly in the query string. Reworked the sample to fetch supported resources and check `resource.labels` in Python, avoiding query-syntax ambiguity for hyphenated label keys.
- The GKE snippet said it labeled clusters and node pools but only showed a node pool. Corrected the comment and added the required GKE cost allocation caveat for Kubernetes namespace and pod-label attribution.
- The shared-cost allocation query could divide by zero when no direct tenant costs existed. Replaced raw division with `SAFE_DIVIDE`.
- The scheduled query used `INSERT INTO` while also specifying a destination table and `WRITE_APPEND`. BigQuery scheduled queries treat destination table and write preference as result-table options and DML queries should not use that write preference option. Changed the scheduled query to a `SELECT` with `destination_dataset_id`, `destination_table_name_template`, and `WRITE_APPEND`.

## Review Notes
The examples remain illustrative and still require callers to provide real project IDs, billing export table names, IAM permissions, and destination table schema. Cost data for labels only applies after labels are added to resources, and label availability can vary by service timing.
