# Validation Summary: How to Set Up ACLs and IAM Permissions for Google Cloud Storage Buckets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Storage
- Google Cloud IAM
- Cloud Storage ACLs
- gcloud CLI
- Terraform Google provider
- Python Google Cloud Storage client library

## Sources Consulted
- Google Cloud Storage uniform bucket-level access documentation: https://cloud.google.com/storage/docs/uniform-bucket-level-access
- Google Cloud Storage use uniform bucket-level access documentation: https://cloud.google.com/storage/docs/using-uniform-bucket-level-access
- Google Cloud Storage IAM roles documentation: https://cloud.google.com/storage/docs/access-control/iam-roles
- Google Cloud Storage IAM policy documentation: https://cloud.google.com/storage/docs/access-control/using-iam-permissions
- Google Cloud Storage ACL documentation: https://cloud.google.com/storage/docs/access-control/lists
- gcloud storage buckets add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- gcloud storage buckets update reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- gcloud storage objects update reference: https://cloud.google.com/sdk/gcloud/reference/storage/objects/update
- gcloud storage cp reference: https://cloud.google.com/sdk/gcloud/reference/storage/cp
- Google Cloud Storage Python Bucket API reference: https://cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.bucket.Bucket
- Terraform google_storage_bucket resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform google_storage_bucket_iam documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket_iam

## Issues Found
- The uniform bucket-level access status command used `--format="json(iamConfiguration)"`, which matches the JSON API field shape rather than the current documented `gcloud storage` output field. Changed it to `--format="default(uniform_bucket_level_access)"`.
- The predefined ACL list did not mention that `publicReadWrite` applies only to buckets, while `bucketOwnerRead` and `bucketOwnerFullControl` apply only to objects. Updated the descriptions and added the documented `projectPrivate` predefined ACL.

## Review Notes
The examples use current `gcloud storage` commands and current Terraform resource names. The Python IAM policy examples match the documented Python client library pattern, but production code should also account for concurrent IAM policy updates and avoid duplicating equivalent bindings.
