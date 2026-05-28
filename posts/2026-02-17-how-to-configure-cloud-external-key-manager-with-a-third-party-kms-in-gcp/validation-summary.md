# Validation Summary: How to Configure Cloud External Key Manager with a Third-Party KMS in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud External Key Manager (Cloud EKM)
- Google Cloud KMS
- Google Cloud CLI
- Service Directory and Cloud EKM over VPC
- Terraform Google provider
- Customer-managed encryption keys (CMEK)

## Sources Consulted
- Google Cloud KMS: Cloud External Key Manager overview: https://docs.cloud.google.com/kms/docs/ekm
- Google Cloud KMS: Create an external key: https://docs.cloud.google.com/kms/docs/create-external-key
- Google Cloud KMS: Create an EKM connection: https://docs.cloud.google.com/kms/docs/create-ekm-connection
- Google Cloud SDK reference: gcloud kms ekm-connections create: https://docs.cloud.google.com/sdk/gcloud/reference/kms/ekm-connections/create
- Google Cloud SDK reference: gcloud kms keys create: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud SDK reference: gcloud kms keys versions create: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/versions/create
- Terraform Google provider: google_kms_ekm_connection: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_ekm_connection
- Terraform Google provider: google_kms_crypto_key: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key
- Terraform Google provider: google_kms_crypto_key_version: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key_version

## Issues Found
- The supported external KMS provider list was outdated. Replaced Equinix SmartKey, Ionic Security, and Unbound CORE with the currently documented supported providers: Fortanix, Futurex, and Thales.
- The Cloud EKM explanation implied that the external KMS performs the whole encryption/decryption operation. Updated it to reflect Google Cloud's documented model for symmetric Cloud EKM keys: Cloud KMS also uses internal key material, and data encrypted with Cloud EKM requires both the internal and external key material.
- The VPC EKM connection command used `--server-certificates-pem-file`, which is not the current gcloud flag. Changed it to `--server-certificates-files` and added `--key-management-mode=manual`.
- The VPC-based key version command used `--external-key-uri`, which is for `EXTERNAL` keys over the internet. Changed it to `--ekm-connection-key-path`, which is the documented flag for `EXTERNAL_VPC` keys.
- The prerequisites and setup text only referred to an external key URI. Updated it to distinguish internet-based key URIs from VPC-based key paths.
- The Terraform example created a crypto key with `skip_initial_version_creation = true` but did not create a key version. Added a `google_kms_crypto_key_version` resource with `external_protection_level_options.ekm_connection_key_path`.
- The "kill switch" section overstated immediacy and said all access stops immediately. Revised it to state that disabling the external key cuts off future cryptographic operations and that decryption requires both the Cloud EKM key version and external key material.
- The text said Google never had "the key material" without distinguishing Cloud KMS internal key material from external key material. Updated those statements to specifically refer to external key material.

## Review Notes
The local environment does not have `gcloud` installed, so CLI validation was performed against the current official Google Cloud SDK reference documentation rather than local `--help` output.
