# Validation Summary: How to Configure GCP Storage Bucket Lifecycle Rules in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Google provider
- Google Cloud Storage buckets
- Cloud Storage Object Lifecycle Management
- Cloud Storage object versioning and storage classes

## Sources Consulted
- Google Cloud Storage Object Lifecycle Management: https://cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage storage classes: https://cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage lifecycle management with Terraform: https://cloud.google.com/storage/docs/managing-lifecycles
- Terraform Registry `google_storage_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket

## Issues Found
- The post claimed it covered every lifecycle rule type. Changed this to "common lifecycle rules" because the article does not cover every supported condition, such as `matches_storage_class`, `custom_time_before`, `noncurrent_time_before`, and `days_since_noncurrent_time` before the fixes.
- The `age` explanation implied age could be based on last modification time and that transitions happen within 24 hours. Corrected it to state that `age` is measured from object creation time and lifecycle actions are asynchronous with no fixed timing guarantee.
- The version cleanup examples used `age` for non-current version retention. Corrected these examples to use `days_since_noncurrent_time` with `with_state = "ARCHIVED"` so the retention clock starts when an object version becomes non-current.
- The reusable versioned-bucket example omitted `with_state` on age-based rules. Added `with_state = "LIVE"` to make the live-object transitions and deletion explicit.
- The best-practices section said lifecycle deletions cannot be undone and deleted objects are gone unless versioning saves them. Updated it to account for Cloud Storage soft delete retention while still warning that permanently deleted versions are gone.
- The version cleanup best practice referred to combining `num_newer_versions` with `age` for non-current versions. Updated it to refer to `days_since_noncurrent_time`.

## Review Notes
The Terraform resource structure, lifecycle action names, storage class values, prefix/suffix condition usage, custom time condition, `force_destroy`, `public_access_prevention`, bucket versioning, and output examples are consistent with current provider and Google Cloud documentation. The post still intentionally uses `~> 5.0` for the Google provider; the current latest provider is newer, but the covered lifecycle fields are supported in the 5.x provider line.
