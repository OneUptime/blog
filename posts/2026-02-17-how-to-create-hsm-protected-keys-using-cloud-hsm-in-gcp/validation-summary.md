# Validation Summary: How to Create HSM-Protected Keys Using Cloud HSM in GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud KMS
- Cloud HSM
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Python Cloud KMS client library
- Cloud Storage CMEK
- BigQuery CMEK

## Sources Consulted
- Google Cloud KMS Cloud HSM overview: https://docs.cloud.google.com/kms/docs/hsm
- Google Cloud KMS key purposes and algorithms: https://docs.cloud.google.com/kms/docs/algorithms
- Google Cloud KMS locations: https://docs.cloud.google.com/kms/docs/locations
- Google Cloud KMS REST `CryptoKey` reference: https://docs.cloud.google.com/kms/docs/reference/rest/v1/projects.locations.keyRings.cryptoKeys
- Google Cloud KMS audit logging documentation: https://docs.cloud.google.com/kms/docs/audit-logging
- Google Cloud SDK `gcloud kms keys create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud SDK `gcloud kms keys versions get-certificate-chain` reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/versions/get-certificate-chain
- Google Cloud KMS attestation verification guide: https://docs.cloud.google.com/kms/docs/attest-key
- Google Cloud Storage `gcloud storage buckets update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- BigQuery dataset CMEK documentation: https://docs.cloud.google.com/bigquery/docs/customer-managed-encryption
- Google Cloud KMS Python `AsymmetricSignRequest` reference: https://docs.cloud.google.com/python/docs/reference/cloudkms/latest/google.cloud.kms_v1.types.AsymmetricSignRequest
- Terraform Google provider `google_kms_crypto_key` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/kms_crypto_key

## Issues Found
- The symmetric key creation command used a fixed `--next-rotation-time` of `2026-05-17T00:00:00Z`, which is in the past as of this review date and would not be a valid next rotation time. Changed it to compute a UTC timestamp 90 days in the future.
- The Cloud HSM guarantees list said all cryptographic operations including `verify` happen inside the HSM. Asymmetric signature verification uses public keys outside the HSM, while private-key and secret-key operations are the relevant HSM-backed operations. Reworded the bullet to avoid overstatement.
- The attestation retrieval command used JSON formatting and `jq`, but the official offline verification workflow uses `gcloud kms keys versions describe --attestation-file` to write the attestation data. Updated the command accordingly.
- The offline verification command was described as downloading attestation content, but `get-certificate-chain` retrieves certificate chains. Updated the comment and added `--output-file=certificates.pem`.
- The post said operations are logged in Cloud Audit Logs without noting that cryptographic operations are Data Access audit logs. Clarified that administrative activity is logged and cryptographic operation logging requires Data Access audit logs to be enabled.
- The post said offline attestation verification uses the HSM manufacturer's root certificate. Updated it to match Google's documented workflow, which uses certificate chains and Google's attestation verification script.

## Review Notes
- The Google Cloud CLI was not installed in the local environment, so command validation was performed against the official Google Cloud SDK command reference instead of local `--help` output.
- Cloud HSM CMEK usage requires exact location matching between the key and the protected Google Cloud resource; the post's examples use `us-central1` consistently.
