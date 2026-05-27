# Validation Summary: How to Use CMEK to Encrypt Cloud Storage Buckets with Cloud KMS Keys in GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- Cloud Storage
- Cloud KMS
- Customer-managed encryption keys (CMEK)
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Cloud Audit Logs

## Sources Consulted
- Google Cloud Storage CMEK documentation: https://cloud.google.com/storage/docs/encryption/customer-managed-keys
- Google Cloud Storage CMEK usage guide: https://cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- Google Cloud Storage bucket locations documentation: https://cloud.google.com/storage/docs/locations
- `gcloud storage service-agent` reference: https://cloud.google.com/sdk/gcloud/reference/storage/service-agent
- `gcloud storage buckets create` reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- `gcloud storage buckets update` reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- `gcloud storage objects describe` reference: https://cloud.google.com/sdk/gcloud/reference/storage/objects/describe
- `gcloud storage objects update` reference: https://cloud.google.com/sdk/gcloud/reference/storage/objects/update
- `gcloud kms keys create` reference: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Cloud KMS destroy and restore documentation: https://cloud.google.com/kms/docs/destroy-restore
- Cloud KMS audit logging documentation: https://cloud.google.com/kms/docs/audit-logging
- Google Cloud Data Access audit logging documentation: https://cloud.google.com/logging/docs/audit/configure-data-access
- Terraform `google_storage_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform `google_storage_project_service_account` data source documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/storage_project_service_account

## Issues Found
- The post said that with CMEK "you hold the keys." Updated this to say you control the key lifecycle and access permissions, which more accurately reflects Cloud KMS-managed CMEK behavior.
- The post described the Cloud Storage service account as reading and writing objects. Updated this to describe the Cloud Storage service agent as the identity used for Cloud KMS operations.
- The post stated that Cloud KMS key version destruction has a 24-hour default scheduled destruction period. Updated this to 30 days, which matches current Cloud KMS documentation.
- The post said every Cloud Storage use of the key generates an audit log entry. Updated this to clarify that Cloud KMS Encrypt/Decrypt entries require Data Access audit logs to be enabled.

## Review Notes
The command examples and Terraform resource fields were otherwise consistent with current official documentation. The `date -d "+90 days"` command assumes GNU `date`, which is available in common Linux/Cloud Shell environments but may need adjustment on macOS.
