# Validation Summary: How to Use Server-Side Encryption with Customer-Managed Keys

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Storage
- Customer-managed encryption keys (CMEK)
- Cloud KMS
- Google Cloud CLI
- Python `google-cloud-storage` client library
- Terraform Google provider
- Cloud Audit Logs

## Sources Consulted
- Google Cloud Storage: Customer-managed encryption keys: https://docs.cloud.google.com/storage/docs/encryption/customer-managed-keys
- Google Cloud Storage: Use customer-managed encryption keys: https://docs.cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- Google Cloud Storage bucket locations: https://docs.cloud.google.com/storage/docs/bucket-locations
- Google Cloud SDK: `gcloud kms keys create`: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud SDK: `gcloud kms keys update`: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/update
- Google Cloud SDK: `gcloud kms keys versions create`: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/versions/create
- Google Cloud SDK: `gcloud kms keys versions destroy`: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/versions/destroy
- Google Cloud SDK: `gcloud storage cp`: https://docs.cloud.google.com/sdk/gcloud/reference/storage/cp
- Google Cloud SDK: `gcloud storage objects update`: https://docs.cloud.google.com/sdk/gcloud/reference/storage/objects/update
- Google Cloud KMS key version states: https://docs.cloud.google.com/kms/docs/key-states
- Google Cloud KMS best practices for CMEK: https://cloud.google.com/kms/docs/cmek-best-practices
- Python Cloud Storage `Blob.rewrite` reference: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob
- Terraform `google_storage_bucket` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket

## Issues Found
- The post said disabling or destroying the key makes objects inaccessible. Updated this to say the encrypted object data becomes unreadable, because Cloud Storage can still expose some metadata and allow some non-read operations even when the CMEK cannot decrypt object data.
- The post described key usage as always logged with a complete trail of who accessed encrypted data. Updated this to clarify that Cloud KMS audit logs can track key activity, Data Access audit logs must be enabled for encrypt/decrypt operations, and CMEK calls are made by the Cloud Storage service agent rather than the individual end user.
- The post said a `us-central1` KMS key works for a `US` multi-region bucket. Updated this because Cloud Storage CMEK key ring locations must match the bucket data location; `US` buckets need `US` key rings, and predefined dual-region buckets such as `NAM4` need matching `NAM4` key rings.
- The post described key destruction as having a 24-hour waiting period. Updated this to the current Cloud KMS behavior: scheduled destruction duration is configurable, defaults to 30 days, and has a 24-hour minimum for most keys.
- The performance note implied a simple KMS call latency impact for normal operations. Updated it to the documented caveat that listing CMEK-encrypted objects can require additional metadata requests to retrieve object hashes.

## Review Notes
The CLI commands, Terraform configuration, KMS role, object update/rewrite approach, and Python `Blob.rewrite` return handling were checked against official references and are technically valid. `gcloud` was not installed in the workspace, so command validation was performed against official Google Cloud SDK documentation rather than local `--help` output.
