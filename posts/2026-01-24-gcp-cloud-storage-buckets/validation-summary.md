# Validation Summary: How to Handle Cloud Storage Buckets in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Storage
- Google Cloud CLI (`gcloud storage`, Pub/Sub, KMS, Cloud Monitoring)
- Terraform Google provider
- IAM
- Cloud KMS customer-managed encryption keys
- Object Lifecycle Management
- CORS
- Pub/Sub notifications

## Sources Consulted
- Google Cloud SDK reference: `gcloud storage buckets create` - https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud SDK reference: `gcloud storage buckets update` - https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud SDK reference: `gcloud storage cp` - https://docs.cloud.google.com/sdk/gcloud/reference/storage/cp
- Google Cloud SDK reference: `gcloud storage rsync` - https://docs.cloud.google.com/sdk/gcloud/reference/storage/rsync
- Google Cloud SDK reference: `gcloud storage buckets notifications create` - https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/notifications/create
- Google Cloud Storage documentation: Storage classes - https://docs.cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage documentation: Object Lifecycle Management - https://docs.cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage documentation: Lifecycle configuration examples - https://docs.cloud.google.com/storage/docs/lifecycle-configurations
- Google Cloud Storage documentation: Manage object lifecycles - https://docs.cloud.google.com/storage/docs/managing-lifecycles
- Google Cloud Storage JSON API bucket resource - https://docs.cloud.google.com/storage/docs/json_api/v1/buckets
- Google Cloud Storage documentation: CORS configuration examples - https://docs.cloud.google.com/storage/docs/cors-configurations
- Google Cloud Storage documentation: Set up and view CORS configurations - https://docs.cloud.google.com/storage/docs/using-cors
- Google Cloud Storage documentation: Pub/Sub notifications - https://docs.cloud.google.com/storage/docs/pubsub-notifications
- Google Cloud Storage documentation: Customer-managed encryption keys - https://docs.cloud.google.com/storage/docs/encryption/customer-managed-keys
- Google Cloud Storage documentation: Use customer-managed encryption keys - https://docs.cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- Google Cloud Storage documentation: Usage logs and storage logs - https://docs.cloud.google.com/storage/docs/access-logs
- Google Cloud SDK reference: `gcloud monitoring dashboards create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Terraform Registry: `google_storage_bucket` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform Registry: `google_storage_notification` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_notification

## Issues Found
- The `gcloud storage buckets create` examples used `--storage-class`, but the current `gcloud storage` command documents `--default-storage-class`. Updated the three bucket creation commands so they use the current flag.
- The lifecycle JSON for `gcloud storage buckets update --lifecycle-file` used the JSON API bucket-resource wrapper (`{"lifecycle": {"rule": [...]}}`). The current CLI expects the lifecycle configuration object directly (`{"rule": [...]}`). Removed the top-level `lifecycle` wrapper.
- The CORS verification command queried `json(cors)`, but current `gcloud storage buckets describe` examples use `cors_config`. Updated the command to `--format="json(cors_config)"`.
- The CMEK example created a KMS key and immediately used it as the bucket default encryption key, but Cloud Storage's service agent must be authorized to use the key. Added the `gcloud storage service-agent --authorize-cmek` command before bucket creation.
- The access logging example enabled logging but omitted the required IAM grant that lets Cloud Storage write log objects to the log bucket. Added the documented `cloud-storage-analytics@google.com` object creator binding.

## Review Notes
The Terraform examples are syntactically consistent with the current Google provider documentation, but `google_storage_bucket_iam_binding` is authoritative for each role and can replace other members for that role if used alongside separately managed bindings. The post does not cover newer special-purpose storage options such as Rapid storage, but the common Standard, Nearline, Coldline, and Archive guidance remains accurate.
