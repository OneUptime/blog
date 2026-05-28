# Validation Summary: How to Configure CMEK for Secret Manager in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Secret Manager
- Customer-managed encryption keys (CMEK)
- Cloud KMS
- Google Cloud CLI
- Terraform Google provider
- Cloud IAM service agents and roles

## Sources Consulted
- Google Cloud Secret Manager CMEK documentation: https://docs.cloud.google.com/secret-manager/docs/cmek
- Google Cloud CLI reference for `gcloud secrets create`: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud CLI reference for `gcloud kms keys create`: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud CLI reference for `gcloud kms keys versions create`: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/versions/create
- Google Cloud KMS key creation documentation: https://docs.cloud.google.com/kms/docs/create-key
- Google Cloud KMS key version states documentation: https://docs.cloud.google.com/kms/docs/key-states
- Google Cloud KMS enable and disable key versions documentation: https://docs.cloud.google.com/kms/docs/enable-disable
- Terraform Google provider documentation for `google_secret_manager_secret`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret
- Terraform Google provider documentation for `google_kms_crypto_key`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key

## Issues Found
- The KMS key creation command used `date -u -v+90d`, which is a BSD/macOS `date` option and fails on typical Linux shells. Removed `--next-rotation-time`; Cloud KMS allows it to be omitted and schedules the first rotation one rotation period after key creation.
- The service agent step only derived the service agent email from the project number. Replaced it with the documented `gcloud beta services identity create --service="secretmanager.googleapis.com"` command, which creates or retrieves the Secret Manager service identity.
- The post referred to disabling a KMS key, but Cloud KMS states are on key versions, not keys. Updated the explanation and emergency revocation section to say key version, and clarified that revoking access to all protected secret versions requires disabling every enabled key version that protected those versions.

## Review Notes
- The Terraform example is syntactically consistent with the current Google provider schema, but storing `secret_data` in Terraform means the secret value is stored in Terraform state. This is operationally important but not a correctness error in the CMEK configuration.
- The workspace does not have `gcloud` or `terraform` installed, so command validation was performed against official Google Cloud and Terraform provider documentation rather than local CLI execution.
