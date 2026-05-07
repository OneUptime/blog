# Validation Summary: How to Back Up Rancher to Google Cloud Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Backup Operator
- Kubernetes
- Google Cloud Storage (GCS)
- Cloud Storage XML API / S3 interoperability
- Google Cloud IAM
- Google Cloud CLI

## Sources Consulted
- Rancher Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Backing up Rancher guide: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher
- Google Cloud Storage interoperability: https://cloud.google.com/storage/docs/interoperability
- Cloud Storage HMAC keys: https://cloud.google.com/storage/docs/authentication/hmackeys
- Manage HMAC keys for service accounts: https://cloud.google.com/storage/docs/authentication/managing-hmackeys
- gcloud storage buckets create reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- gcloud storage buckets update reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- gcloud storage hmac create reference: https://cloud.google.com/sdk/gcloud/reference/storage/hmac/create
- gcloud storage hmac list reference: https://cloud.google.com/sdk/gcloud/reference/storage/hmac/list
- gcloud storage buckets add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- gcloud storage buckets get-iam-policy reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/get-iam-policy
- Set and manage IAM policies on buckets: https://cloud.google.com/storage/docs/access-control/using-iam-permissions
- IAM roles for Cloud Storage: https://cloud.google.com/storage/docs/access-control/iam-roles
- Use Object Versioning: https://cloud.google.com/storage/docs/using-object-versioning
- Manage object lifecycles: https://cloud.google.com/storage/docs/managing-lifecycles
- Use and lock retention policies: https://cloud.google.com/storage/docs/using-bucket-lock

## Issues Found
- The post used the legacy `gsutil` CLI throughout, even though current Google Cloud documentation recommends `gcloud storage` as the preferred Cloud Storage CLI. I replaced the bucket creation, versioning, HMAC, IAM, listing, lifecycle, and retention commands with current `gcloud storage` equivalents.
- The Rancher Backup YAML used `resourceSetName: rancher-resource-set`. Current Rancher documentation requires `rancher-resource-set-full` or `rancher-resource-set-basic`, and older documentation states `rancher-resource-set` was deprecated and removed in Rancher v2.12. I updated both Backup examples to use `rancher-resource-set-full`.
- Step 2 suggested using “default project keys” from the Interoperability page. Current Google Cloud documentation distinguishes user-account HMAC keys from service-account HMAC keys, and the supported production flow here is a service-account HMAC. I corrected the instructions to create a key for a service account.
- The “Enable Bucket Lock” step only set a retention policy. Bucket Lock in Cloud Storage requires locking the retention policy separately. I added the `--lock-retention-period` command and corrected the explanation to reflect actual retention-policy behavior and the irreversibility of locking.
- The troubleshooting note about region selection said any valid GCS region string would work. That claim is not documented by Rancher or Google Cloud. I replaced it with conservative guidance to use the bucket’s actual location, which matches the documented Rancher `region` field requirement and the bucket created in the example.

## Review Notes
- The article now uses `rancher-resource-set-full`, which includes essential secrets in the backup. Rancher documentation recommends enabling encryption when storing that resource set, but the original post does not cover encrypted backups, so I left that scope unchanged.
- Google Cloud documentation now recommends soft delete over Object Versioning for protection against accidental or malicious deletions. The versioning step is still technically valid, so I kept it, but this may be worth revisiting in a future revision.
- I did not execute the cloud commands, because the review environment does not have project credentials or the Google Cloud CLI installed. Validation was done against official documentation and command references.
