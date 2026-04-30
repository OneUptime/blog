# Validation Summary: How to Configure GCS Bucket Retention Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Google provider
- Google Cloud Storage (GCS)
- Cloud Storage Bucket Lock / retention policies
- Cloud Storage IAM
- `gcloud storage` CLI

## Sources Consulted
- Google provider `google_storage_bucket` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Google provider `google_storage_bucket_iam_*` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket_iam
- Cloud Storage Bucket Lock overview: https://cloud.google.com/storage/docs/bucket-lock
- Use and lock retention policies: https://cloud.google.com/storage/docs/using-bucket-lock
- Object Lifecycle Management: https://cloud.google.com/storage/docs/lifecycle
- IAM roles for Cloud Storage: https://cloud.google.com/storage/docs/access-control/iam-roles
- Cloud Audit Logs with Cloud Storage: https://cloud.google.com/storage/docs/audit-logging
- Enable Data Access audit logs: https://cloud.google.com/logging/docs/audit/configure-data-access
- `gcloud storage buckets describe` reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/describe
- `gcloud storage cp` reference: https://cloud.google.com/sdk/gcloud/reference/storage/cp
- `gcloud storage rm` reference: https://cloud.google.com/sdk/gcloud/reference/storage/rm
- gsutil tool guidance: https://cloud.google.com/storage/docs/gsutil

## Issues Found
- The IAM example claimed to prevent deletes while granting `roles/storage.legacyBucketWriter`, which includes object delete permission. I changed the example to use `roles/storage.objectCreator` and updated the comment so it now accurately shows write-only uploads without delete permission.
- The verification commands used `gs://audit-logs-my-project`, which did not match the bucket name pattern created earlier in the post. I updated the commands to use `gs://company-audit-logs-my-project`.
- The verification example used `gsutil`, which Google now documents as the legacy Cloud Storage CLI and recommends replacing with `gcloud storage`. I updated the upload and delete commands accordingly.
- The retention-policy verification command used a generic JSON pipeline instead of the documented `gcloud storage buckets describe --format="default(retention_policy)"` pattern. I changed it to the documented form.
- The best-practices note said to enable audit logging "on the bucket", which is imprecise for Cloud Audit Logs. I changed it to recommend Cloud Audit Logs, including Data Access logs for access tracking.

## Review Notes
- The OpenTofu HCL snippets align with the current Google provider documentation for `google_storage_bucket`, including `retention_policy.is_locked`.
- The lifecycle examples are technically consistent with Cloud Storage behavior: delete actions do not take effect until retention requirements are fulfilled.
- `gsutil` still exists, but current Google Cloud documentation recommends `gcloud storage` for new examples.
