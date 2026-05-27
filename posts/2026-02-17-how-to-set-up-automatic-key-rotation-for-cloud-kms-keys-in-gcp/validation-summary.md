# Validation Summary: How to Set Up Automatic Key Rotation for Cloud KMS Keys in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud KMS
- Google Cloud CLI
- Terraform Google provider
- Python Cloud KMS client library
- Google Cloud CMEK-integrated services

## Sources Consulted
- Google Cloud KMS key rotation documentation: https://docs.cloud.google.com/kms/docs/key-rotation
- Google Cloud KMS create key documentation: https://docs.cloud.google.com/kms/docs/create-key
- Google Cloud SDK reference for `gcloud kms keys create`: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud SDK reference for `gcloud kms keys update`: https://cloud.google.com/sdk/gcloud/reference/kms/keys/update
- Google Cloud SDK reference for `gcloud kms keys versions create`: https://cloud.google.com/sdk/gcloud/reference/kms/keys/versions/create
- Google Cloud KMS key version states documentation: https://docs.cloud.google.com/kms/docs/key-states
- Google Cloud KMS destroy and restore key versions documentation: https://docs.cloud.google.com/kms/docs/destroy-restore
- Google Cloud KMS encrypt/decrypt Python documentation: https://docs.cloud.google.com/kms/docs/encrypt-decrypt
- Terraform Google provider `google_kms_crypto_key` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key
- Cloud Storage CMEK documentation: https://docs.cloud.google.com/storage/docs/encryption/customer-managed-keys
- BigQuery CMEK documentation: https://docs.cloud.google.com/bigquery/docs/customer-managed-encryption
- Cloud SQL CMEK documentation: https://docs.cloud.google.com/sql/docs/sqlserver/configure-cmek
- Secret Manager CMEK documentation: https://docs.cloud.google.com/secret-manager/docs/cmek
- PCI Security Standards Council document library for PCI DSS v4.0.1: https://www.pcisecuritystandards.org/document_library
- NIST SP 800-57 Part 1 Rev. 5: https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-57pt1r5.pdf

## Issues Found
- The `--next-rotation-time` examples used dates that are now in the past. Updated both examples to a future timestamp so the commands remain runnable.
- The rotation period description omitted the documented maximum and did not mention that `--next-rotation-time` can be omitted. Added the 100-year maximum and default first-rotation behavior.
- The key destruction section stated a mandatory 24-hour waiting period. Current Cloud KMS documentation says the scheduled destruction duration is configurable and defaults to 30 days. Updated the text and command comment.
- The BigQuery CMEK bullet implied all new writes to existing tables use the new key version. Current BigQuery documentation says existing tables are not automatically re-encrypted; updated the wording to distinguish new tables and explicit table updates.
- The Cloud SQL CMEK bullet was too broad. Updated it to state that existing backups keep their original key versions, new backups use the current primary version, and existing instances or replicas can be re-encrypted.
- The compliance section overstated PCI DSS as requiring annual rotation and overstated NIST as typically annual. Updated both to align with cryptoperiod-based guidance.

## Review Notes
The Google Cloud CLI is not installed in this workspace, so command syntax was verified against official Google Cloud SDK reference pages rather than local `gcloud --help` output.
