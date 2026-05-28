# Validation Summary: How to Create a Key Ring and Symmetric Encryption Key in Google Cloud KMS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud KMS
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- IAM roles for Cloud KMS
- Cloud HSM
- Secret Manager CMEK

## Sources Consulted
- Google Cloud SDK reference for `gcloud kms keys create`: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Cloud KMS key creation guide: https://docs.cloud.google.com/kms/docs/create-key
- Cloud KMS locations guide: https://docs.cloud.google.com/kms/docs/locations
- Cloud KMS key purposes and algorithms: https://docs.cloud.google.com/kms/docs/algorithms
- Cloud KMS key rotation guide: https://docs.cloud.google.com/kms/docs/key-rotation
- Cloud KMS key version states and destruction behavior: https://docs.cloud.google.com/kms/docs/key-states
- Cloud KMS destroy and restore key versions guide: https://docs.cloud.google.com/kms/docs/destroy-restore
- Cloud HSM overview: https://docs.cloud.google.com/kms/docs/hsm
- Secret Manager CMEK guide: https://docs.cloud.google.com/secret-manager/docs/cmek
- Terraform Google provider `google_kms_crypto_key` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key

## Issues Found
- The introduction said a crypto key holds the actual key material. Updated it to say a crypto key contains key versions that hold the actual key material, matching the Cloud KMS resource model.
- The automatic rotation example used a fixed `--next-rotation-time` value of `2026-05-17T00:00:00Z`, which is in the past as of the validation date. Removed it and used `--rotation-period=90d`; Cloud KMS can schedule the first rotation from the rotation period when no next rotation time is provided.
- The rotation text said the rotation period is in seconds and that Google recommends rotating keys at least every 365 days. Updated it to note that `gcloud` accepts duration units such as seconds or days and that Google recommends regular automatic rotation, with 90 days as a documented example.
- The destruction section said key versions have a 24-hour scheduled destruction period. Updated it to the current Cloud KMS behavior: the default scheduled destruction duration is 30 days, and 24 hours is the minimum configurable duration for most keys.

## Review Notes
The local environment did not have `gcloud` or `terraform` installed, so command and Terraform validation was performed against official Google Cloud and HashiCorp documentation instead of local CLI help.
