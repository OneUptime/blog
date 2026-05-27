# Validation Summary: How to Set Up Requester Pays on Google Cloud Storage Buckets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Storage
- Requester Pays
- gcloud CLI
- gsutil
- Python Google Cloud Storage client library
- Node.js Google Cloud Storage client library
- Terraform Google provider
- Google Cloud Billing budgets
- Cloud CDN

## Sources Consulted
- Google Cloud Storage Requester Pays overview: https://cloud.google.com/storage/docs/requester-pays
- Google Cloud Storage Use Requester Pays guide: https://cloud.google.com/storage/docs/using-requester-pays
- gcloud storage buckets create reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- gcloud storage buckets update reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud Storage Python Bucket API reference: https://cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.bucket.Bucket
- Google Cloud Storage Node.js API reference: https://cloud.google.com/nodejs/docs/reference/storage/latest/storage/storage
- Google Cloud Storage Node.js BucketOptions reference: https://cloud.google.com/nodejs/docs/reference/storage/latest/storage/bucketoptions
- Google Cloud Storage Node.js GetFilesOptions reference: https://cloud.google.com/nodejs/docs/reference/storage/latest/storage/getfilesoptions
- Terraform Google provider `google_storage_bucket` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- gcloud billing budgets create reference: https://cloud.google.com/sdk/gcloud/reference/billing/budgets/create
- Cloud CDN caching documentation: https://cloud.google.com/cdn/docs/caching

## Issues Found
- The new bucket example used `gcloud storage buckets create --requester-pays`, but the current `gcloud storage buckets create` reference does not include a `--requester-pays` flag. Changed the example to create the bucket first, then enable Requester Pays with `gcloud storage buckets update --requester-pays`.
- The disable example omitted a billing project. Google documents that disabling Requester Pays requires a billing project unless the caller has permission to bill the bucket owner's project. Added `--billing-project=my-billing-project` to the disable command.
- The access wording said every request must include a billing project. Google documents an exception for requesters with `resourcemanager.projects.createBillingAssignment` on the bucket owner's project. Updated the wording to reflect the normal case and the exception.
- The budget alert command used `--threshold-rule=percent=50`, `80`, and `100`, but the `gcloud billing budgets create` reference expects 1.0-based fractional values such as `0.50` for 50%. Updated the command to `0.50`, `0.80`, and `1.00`.
- The Cloud CDN note implied Cloud CDN can simply sit in front of Requester Pays buckets. Cloud CDN caching documentation recommends not storing cacheable objects in buckets with Requester Pays enabled. Updated the note to warn that Cloud CDN is not a good fit for Requester Pays buckets.
- The signed URL note was too vague. Updated it to specify that the billing project, such as `userProject`, must be part of the signed request.

## Review Notes
The Python, Node.js, Terraform, gsutil, and `gcloud storage` access examples align with current documented APIs and flags after the corrections above. The post could later mention Google Cloud's documented restrictions for Requester Pays buckets, such as Cloud SQL imports/exports and Pub/Sub exports, but that omission does not make the existing tutorial incorrect.
