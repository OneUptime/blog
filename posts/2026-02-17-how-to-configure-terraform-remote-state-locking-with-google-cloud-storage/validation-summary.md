# Validation Summary: How to Configure Terraform Remote State Locking with Google Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform GCS backend
- Google Cloud Storage
- Google Cloud Audit Logs
- Google Cloud Build
- Google Cloud Terraform provider
- gsutil and gcloud CLI

## Sources Consulted
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform apply command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform force-unlock command documentation: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform state backends documentation: https://developer.hashicorp.com/terraform/language/state/backends
- Terraform releases: https://github.com/hashicorp/terraform/releases
- Google Cloud Storage bucket creation documentation: https://docs.cloud.google.com/storage/docs/creating-buckets
- Google Cloud Storage uniform bucket-level access documentation: https://docs.cloud.google.com/storage/docs/uniform-bucket-level-access
- Google Cloud Storage audit logging documentation: https://docs.cloud.google.com/storage/docs/audit-logging
- Google Cloud SDK gcloud storage buckets create reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Terraform provider google_storage_bucket documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket

## Issues Found
- The post described `plan`, `apply`, and `destroy` as "state-modifying" operations. `terraform plan` does not apply infrastructure changes, though it can still require a state lock. Updated the wording to describe operations that require a state lock.
- The post said Terraform retries lock acquisition for a short period by default. Terraform's `-lock-timeout` option is what instructs Terraform to retry acquiring a lock for a duration. Updated the section to say Terraform can fail immediately unless a lock timeout is configured.
- The Cloud Build example used `hashicorp/terraform:1.7`, which is outdated relative to the current Terraform 1.15.x release line. Updated the example image tags and sample lock version to `1.15.4`.
- The Cloud Build saved-plan apply command included `-auto-approve`. Terraform treats passing a saved plan file as approval, so that flag is ignored in saved plan mode. Removed it from the example.
- The monitoring section said GCS operations are logged by default. Cloud Storage Data Access audit logs, which are needed for object create operations such as `.tflock` creation, are disabled by default unless explicitly enabled. Updated the wording to state that Data Access audit logs must be enabled.

## Review Notes
The GCS backend documentation confirms that the backend supports state locking and recommends enabling Cloud Storage Object Versioning for state recovery. The exact `.tflock` implementation details are consistent with Terraform GCS backend behavior, but HashiCorp's public backend documentation documents support for locking rather than every internal lock-file detail.
