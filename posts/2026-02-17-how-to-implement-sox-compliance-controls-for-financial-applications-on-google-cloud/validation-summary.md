# Validation Summary: How to Use SOX Compliance Controls for Financial Applications on Google Cloud

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud IAM and IAM Conditions
- Google Cloud Asset Inventory
- Cloud Functions / Cloud Run functions with Python Functions Framework
- Cloud Build
- Cloud Logging and log-based metrics
- Cloud Monitoring uptime checks and alert policies
- Cloud SQL for PostgreSQL
- Compute Engine snapshot schedules
- BigQuery and GoogleSQL
- Terraform Google provider

## Sources Consulted
- Google Cloud IAM Conditions overview: https://docs.cloud.google.com/iam/docs/conditions-overview
- BigQuery IAM Conditions documentation: https://docs.cloud.google.com/bigquery/docs/conditions
- Google Cloud SDK reference for `gcloud projects add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud SDK reference for `gcloud builds triggers create github`: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud SDK reference for `gcloud artifacts docker images scan`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/scan
- Google Cloud SDK reference for `gcloud logging metrics create`: https://cloud.google.com/logging/docs/reference/tools/gcloud-logging
- Google Cloud SDK reference for `gcloud sql instances patch`: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud SDK reference for `gcloud compute resource-policies create snapshot-schedule`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/resource-policies/create/snapshot-schedule
- Google Cloud SDK reference for `gcloud monitoring uptime create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud SQL metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- BigQuery `INFORMATION_SCHEMA.TABLE_STORAGE` reference: https://docs.cloud.google.com/bigquery/docs/information-schema-table-storage
- Terraform Google provider `google_sql_database_instance` reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Google Cloud organization policy constraints reference: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints

## Issues Found
- The BigQuery IAM condition restricted `roles/bigquery.admin` only to `bigquery.googleapis.com/Dataset`, which would not cover child table resources as the text implied. Changed the expression to use `resource.service == "bigquery.googleapis.com"` with the dataset resource-name prefix.
- The access review CSV writer used `report_data[0].keys()`, which fails when no IAM bindings are returned. Replaced it with a fixed field list.
- The Artifact Registry image scan omitted `--remote` for a registry image. Added `--remote` to match the Cloud SDK reference for scanning remote images.
- The deployment log metric filter lacked parentheses, so operator precedence could include unrelated Cloud Run revision logs. Added parentheses around the resource-type disjunction.
- The Cloud SQL backup command mixed PostgreSQL point-in-time recovery with the MySQL-only binary log flag. Removed `--enable-bin-log` and added PostgreSQL-compatible transaction log retention.
- The uptime check command used obsolete/incorrect flags (`--display-name`, `--monitored-resource`, `--check-interval`). Updated it to the current `gcloud monitoring uptime create` syntax with positional display name, `--resource-labels`, and `--period`.
- The alert policy command used invalid threshold flags and referenced a nonexistent `cloudsql.googleapis.com/database/error_count` metric. Added a Cloud Logging log-based metric for Cloud SQL error logs and changed the alert policy to use `--if` and `--duration`.
- The BigQuery row-count query used the legacy `__TABLES__` metadata table in a Python client query. Replaced it with a GoogleSQL-compatible `UNION ALL` of `COUNT(*)` queries.
- The balance verification query could return `NULL` and fail when no rows matched. Wrapped the sums with `COALESCE`.
- The data integrity snippet called an undefined `send_alert()` function. Replaced it with structured error logging via `print(json.dumps(...))`.

## Review Notes
The examples are still illustrative and use placeholder project IDs, groups, buckets, notification channels, and table names. The SOX process claims are appropriately framed as implementation guidance rather than a guarantee of compliance.
