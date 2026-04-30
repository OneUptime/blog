# Validation Summary: How to Configure GCS Buckets with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- Google Cloud Storage (GCS)
- Google Cloud IAM
- Google Cloud KMS
- Google Cloud Pub/Sub

## Sources Consulted
- Google Cloud Storage uniform bucket-level access docs: https://cloud.google.com/storage/docs/uniform-bucket-level-access
- Google Cloud Storage public access prevention docs: https://cloud.google.com/storage/docs/public-access-prevention
- Google Cloud Storage Bucket Lock docs: https://cloud.google.com/storage/docs/bucket-lock
- Google Cloud Storage bucket locations docs: https://cloud.google.com/storage/docs/locations
- Google Cloud Storage storage classes docs: https://cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage Object Versioning docs: https://cloud.google.com/storage/docs/object-versioning
- Google Cloud Storage Pub/Sub notifications docs: https://cloud.google.com/storage/docs/pubsub-notifications
- Google Cloud Storage projects and service agents docs: https://cloud.google.com/storage/docs/projects#service-accounts
- Google Cloud Storage CMEK docs: https://cloud.google.com/storage/docs/encryption/customer-managed-keys
- Google provider `google_storage_bucket` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Google provider `google_storage_notification` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_notification
- Google provider `google_storage_project_service_account` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/storage_project_service_account

## Issues Found
- The lifecycle example used `num_newer_versions` and `with_state = "ARCHIVED"` without enabling bucket versioning. I added `versioning { enabled = true }` because noncurrent-version lifecycle management only applies to versioned buckets.
- The retention policy example labeled `220752000` seconds as seven years. I corrected it to `220903200` to match Google Cloud's documented year-based retention conversion and clarified the inline lock comment.
- The dual-region example mixed configurable dual-region placement with an outdated/incorrect setup. I changed the example to use `storage_class = "STANDARD"`, clarified that `location = "US"` is the location code for a configurable dual-region, and replaced the predefined-only `US-EAST1` + `US-CENTRAL1` pairing with `US-EAST1` + `US-WEST1`.
- The CMEK example referenced the Cloud Storage service agent without defining it. I added `data "google_storage_project_service_account"` and updated the reference accordingly.
- The CMEK example was missing an explicit dependency to ensure the KMS IAM grant exists before the bucket tries to use the key. I added `depends_on = [google_kms_crypto_key_iam_member.storage_kms]`.
- The Pub/Sub notification example referenced the Cloud Storage service agent without defining it. I added a `google_storage_project_service_account` data source to make the snippet workable as written.
- The conclusion overstated several behaviors. I changed `uniform_bucket_level_access` from a hard requirement to a general recommendation, narrowed the public-access-prevention wording to IAM policies and ACLs, removed the time-sensitive storage-cost percentage claim, and clarified that Bucket Lock prevents reducing or removing the retention policy rather than all modifications.
- The post description claimed coverage of VPC Service Controls, but the post did not discuss that topic. I corrected the description to match the actual content.

## Review Notes
- The Google provider still documents legacy storage class values such as `MULTI_REGIONAL` and `REGIONAL`, but Google Cloud documentation treats them as legacy equivalents of Standard storage. For new examples, `STANDARD`, `NEARLINE`, `COLDLINE`, and `ARCHIVE` are clearer.
- Google Cloud now recommends soft delete over Object Versioning for protection against accidental deletions, but the versioning-based lifecycle example in this post remains technically valid once versioning is enabled.
