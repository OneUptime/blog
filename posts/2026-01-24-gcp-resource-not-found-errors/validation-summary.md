# Validation Summary: How to Fix 'Resource Not Found' Errors in GCP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud CLI
- Google Cloud Compute Engine
- Cloud Storage
- Cloud SQL
- Cloud Run
- IAM service accounts
- Cloud Logging
- Cloud Asset Inventory
- Terraform

## Sources Consulted
- Google Cloud CLI reference: gcloud compute instances list - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/list
- Google Cloud CLI reference: gcloud compute instances describe - https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/describe
- Google Cloud CLI reference: gcloud compute disks list - https://docs.cloud.google.com/sdk/gcloud/reference/compute/disks/list
- Google Cloud CLI reference: gcloud storage ls - https://docs.cloud.google.com/sdk/gcloud/reference/storage/ls
- Google Cloud CLI reference: gcloud storage buckets describe - https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/describe
- Cloud Storage bucket naming documentation - https://docs.cloud.google.com/storage/docs/buckets
- Google Cloud CLI reference: gcloud sql instances describe - https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/describe
- Google Cloud CLI reference: gcloud run services list - https://docs.cloud.google.com/sdk/gcloud/reference/run/services/list
- Google Cloud CLI reference: gcloud run services describe - https://docs.cloud.google.com/sdk/gcloud/reference/run/services/describe
- Google Cloud CLI reference: gcloud run regions list - https://docs.cloud.google.com/sdk/gcloud/reference/run/regions/list
- Google Cloud CLI reference: gcloud iam service-accounts describe - https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/describe
- Google Cloud CLI reference: gcloud services list - https://docs.cloud.google.com/sdk/gcloud/reference/services/list
- Google Cloud CLI reference: gcloud projects get-iam-policy - https://docs.cloud.google.com/sdk/gcloud/reference/projects/get-iam-policy
- Google Cloud CLI reference: gcloud logging read - https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud CLI reference: gcloud asset search-all-resources - https://docs.cloud.google.com/sdk/gcloud/reference/asset/search-all-resources
- Google Cloud CLI reference: gcloud asset search-all-iam-policies - https://docs.cloud.google.com/sdk/gcloud/reference/asset/search-all-iam-policies
- Google Cloud CLI reference: gcloud asset export - https://docs.cloud.google.com/sdk/gcloud/reference/asset/export
- Terraform refresh command documentation - https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform import command documentation - https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform data source documentation - https://developer.hashicorp.com/terraform/language/data-sources
- Terraform data block count documentation - https://developer.hashicorp.com/terraform/language/block/data

## Issues Found
- Replaced the comment that `gcloud compute regions list` lists regions with resources. The command lists available Compute Engine regions for a project, not only regions where resources exist.
- Corrected the Cloud Storage bucket-name note. Bucket names must be lowercase; they are not case-insensitive names that are stored as lowercase.
- Updated the Cloud Run section to avoid the obsolete `--platform=managed` example and to use `gcloud run regions list` for region discovery.
- Replaced `terraform refresh` with `terraform apply -refresh-only` because HashiCorp documents `terraform refresh` as deprecated.
- Removed the Terraform `try()` example for detecting a missing data source. A provider data-source read failure is not a reliable use case for `try()`; the post now shows conditional data-source reads with `count`.
- Fixed the "last 24 hours" log query, which used a fixed 2024 timestamp. The command now uses `gcloud logging read --freshness=1d`.

## Review Notes
The remaining examples are illustrative troubleshooting commands and require appropriate project, region, API, IAM, and audit-log availability in the reader's environment. Some audit-log method names can vary by API version, so filtering by resource name plus delete-like method names may be more robust for broad investigations.
