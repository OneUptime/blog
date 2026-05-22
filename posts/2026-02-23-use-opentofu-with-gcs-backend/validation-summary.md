# Validation Summary: How to Use OpenTofu with GCS Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform backend configuration
- Google Cloud Storage
- Google Cloud CLI
- Google Cloud IAM
- Cloud KMS
- Workload Identity Federation

## Sources Consulted
- OpenTofu GCS backend documentation: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu state storage and locking documentation: https://opentofu.org/docs/language/state/backends/
- Google Cloud SDK `gcloud storage buckets create` reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud SDK `gcloud storage buckets update` reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud Storage lifecycle management documentation: https://cloud.google.com/storage/docs/managing-lifecycles
- Google Cloud SDK `gcloud storage ls` reference: https://cloud.google.com/sdk/gcloud/reference/storage/ls
- Google Cloud SDK `gcloud storage cp` reference: https://cloud.google.com/sdk/gcloud/reference/storage/cp
- Google Cloud audit logging Data Access configuration documentation: https://cloud.google.com/logging/docs/audit/configure-data-access
- Terraform Google provider `google_storage_bucket` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket

## Issues Found
- The introduction described encryption and versioning as built-in GCS backend features. Updated the wording to clarify that OpenTofu's GCS backend provides remote state storage and locking, while Cloud Storage provides encryption and optional object versioning.
- The state locking section described the mechanism as "Cloud Storage object locking," which can be confused with Cloud Storage retention/object lock features. Updated it to the documented claim that the GCS backend supports automatic state locking without extra resources.
- The CMEK backend example used `encryption_key = ""`, which is the customer-supplied encryption key field and expects a 32-byte base64-encoded CSEK. Replaced it with `kms_encryption_key` using a Cloud KMS key resource name.
- Added the documented impersonation requirement that the caller needs `roles/iam.serviceAccountTokenCreator` on the impersonated service account.
- The version recovery example used `gcloud storage objects list --all-versions`, but `--all-versions` is documented for `gcloud storage ls`. Updated the command accordingly.
- The audit logging example used `gcloud projects add-iam-audit-config`, which is not a current documented `gcloud projects` command. Replaced it with Google Cloud's documented get/edit/set IAM policy flow for Data Access audit log configuration.

## Review Notes
The service account key workflow is technically valid but less secure than Workload Identity Federation or service account impersonation for CI/CD. The post already presents those stronger options.
