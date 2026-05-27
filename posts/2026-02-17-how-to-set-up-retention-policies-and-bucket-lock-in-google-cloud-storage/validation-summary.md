# Validation Summary: How to Set Up Retention Policies and Bucket Lock in Google Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Storage
- Google Cloud CLI
- Cloud Storage retention policies
- Cloud Storage Bucket Lock
- Cloud Storage object holds
- Python `google-cloud-storage` client library
- Terraform `google_storage_bucket` resource

## Sources Consulted
- Google Cloud Storage Bucket Lock documentation: https://docs.cloud.google.com/storage/docs/bucket-lock
- Google Cloud Storage "Use and lock retention policies" documentation: https://docs.cloud.google.com/storage/docs/using-bucket-lock
- Google Cloud SDK `gcloud storage buckets update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud SDK datetime and duration format reference: https://docs.cloud.google.com/sdk/gcloud/reference/topic/datetimes
- Google Cloud Storage Python `Bucket` API reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.bucket.Bucket
- Google Cloud Storage Python `Blob` API reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob
- Terraform Google provider `google_storage_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Google Cloud Storage object holds documentation: https://docs.cloud.google.com/storage/docs/object-holds
- Google Cloud Storage Object Retention Lock documentation: https://docs.cloud.google.com/storage/docs/object-lock

## Issues Found
- The post said a retention period could be increased but not decreased once set. Google Cloud documentation states that an unlocked bucket retention policy can be increased, decreased, or removed; only a locked policy cannot be reduced or removed. Updated the affected bullets and modification text to make the lock boundary clear.
- The post described `3m` as approximately 30 days per month. Google Cloud's retention period conversion treats a month as 31 days. Updated the explanation to 31 days per month.
- The Terraform example used `220898880` seconds for seven years. Google Cloud's year conversion is 365.25 days, so seven years is `220903200` seconds. Updated the value.
- The versioning note said noncurrent versions are subject to retention based on when they became noncurrent. Google Cloud documents that live object versions can still be made noncurrent and that existing versioned objects are protected by a retention policy. Updated the note to match the documented behavior.

## Review Notes
The local environment did not have `gcloud` or `terraform` installed, so command and Terraform validation were performed against official Google Cloud and Terraform provider documentation rather than local help output.
