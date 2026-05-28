# Validation Summary: How to Enable and Configure Uniform Bucket-Level Access in Google Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Storage
- Uniform bucket-level access
- Google Cloud IAM and IAM Conditions
- gcloud CLI
- Terraform Google provider
- Python Google Cloud Storage client library

## Sources Consulted
- Google Cloud Storage uniform bucket-level access documentation: https://cloud.google.com/storage/docs/uniform-bucket-level-access
- Google Cloud Storage guide for using uniform bucket-level access: https://cloud.google.com/storage/docs/using-uniform-bucket-level-access
- gcloud storage buckets create reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- gcloud storage buckets describe reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/describe
- gcloud storage objects list reference: https://cloud.google.com/sdk/gcloud/reference/storage/objects/list
- Google Cloud Storage ACL management documentation: https://cloud.google.com/storage/docs/access-control/create-manage-lists
- Google Cloud Storage IAM roles documentation: https://cloud.google.com/storage/docs/access-control/iam-roles
- Google Cloud Storage IAM Conditions documentation: https://cloud.google.com/storage/docs/access-control/iam#conditions
- IAM Conditions resource attributes documentation: https://cloud.google.com/iam/docs/conditions-resource-attributes
- Google Cloud Storage public access prevention documentation: https://cloud.google.com/storage/docs/public-access-prevention
- Terraform Google provider `google_storage_bucket` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Python Cloud Storage `IAMConfiguration` API reference: https://cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.bucket.IAMConfiguration

## Issues Found
- The gcloud status example used JSON API field names without `--raw`. Changed it to the official standardized `--format="default(uniform_bucket_level_access)"` form.
- The lock-time example used JSON API field names without `--raw`. Added `--raw` so `iamConfiguration.uniformBucketLevelAccess.lockedTime` is a valid output path.
- The ACL audit command tried to list ACL fields from `gcloud storage objects list`. Changed it to list objects first and inspect ACLs with `gcloud storage objects describe --format="default(acl)"`, matching Google Cloud's documented ACL workflow.
- The IAM migration examples used non-equivalent roles for ACL-based access. Changed ACL reader migration examples to `roles/storage.legacyObjectReader` and object owner migration to `roles/storage.legacyObjectOwner`, matching Google's documented ACL-to-IAM equivalents.
- The IAM Conditions explanation said the role grants read access only to a prefix without caveat. Clarified that object read operations are prefix-limited, but `storage.objects.list` is checked at the bucket level and cannot be restricted by `resource.name`.

## Review Notes
The Terraform and Python examples use current field names and APIs. The conditional Terraform example uses `roles/storage.objectViewer`; this is valid, but users should remember the same object-listing caveat described in the IAM Conditions section.
