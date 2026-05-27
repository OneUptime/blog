# Validation Summary: How to Use CMEK to Encrypt BigQuery Datasets with Cloud KMS Keys in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud BigQuery
- Google Cloud KMS
- Customer-managed encryption keys (CMEK)
- Google Cloud CLI and `bq` command-line tool
- Terraform Google provider
- Cloud Audit Logs and Cloud Monitoring

## Sources Consulted
- BigQuery customer-managed Cloud KMS keys documentation: https://cloud.google.com/bigquery/docs/customer-managed-encryption
- BigQuery `bq` command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Google Cloud SDK `gcloud kms keyrings create` reference: https://cloud.google.com/sdk/gcloud/reference/kms/keyrings/create
- Google Cloud SDK `gcloud kms keys create` reference: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud KMS key rotation documentation: https://cloud.google.com/kms/docs/key-rotation
- Google Cloud KMS enable and disable key versions documentation: https://cloud.google.com/kms/docs/enable-disable
- Google Cloud KMS resource hierarchy documentation: https://cloud.google.com/kms/docs/resource-hierarchy
- Terraform `google_bigquery_default_service_account` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/bigquery_default_service_account
- Terraform `google_bigquery_dataset` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset
- Terraform `google_kms_crypto_key` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The `bq cp` example for copying a table to itself omitted `-f`. BigQuery's CMEK documentation shows `bq cp -f` when overwriting the original table, so the command was updated to avoid an overwrite prompt/failure in scripted use.
- The existing dataset update example did not include `--dataset`. The `bq` CMEK documentation shows `bq update --default_kms_key ... --dataset DATASET_ID`, so the flag was added for explicit dataset updates.
- The BigQuery service account lookup comment told readers to replace `PROJECT_NUMBER`, but that command does not contain a `PROJECT_NUMBER` placeholder. The inaccurate comment was removed.
- The dataset default encryption claim said every table would use the key. BigQuery dataset defaults apply to newly created tables unless another CMEK key is specified, so the wording was corrected.
- The revocation section referred to disabling a Cloud KMS key, but Cloud KMS disables key versions. The heading and explanation were updated to say key version and to scope inaccessibility to data encrypted with that version.

## Review Notes
The tutorial is technically relevant and broadly accurate after the fixes. The installed environment did not include local `gcloud` or `bq` binaries, so CLI verification was performed against official Google Cloud documentation instead of local `--help` output.
