# Validation Summary: How to Encrypt and Decrypt Data Using Cloud KMS API in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud KMS
- Google Cloud CLI (`gcloud kms encrypt` and `gcloud kms decrypt`)
- Python Google Cloud KMS client library
- Node.js Google Cloud KMS client library
- Go Google Cloud KMS client library
- Cloud Audit Logs / Cloud Logging
- Base64 encoding and Additional Authenticated Data (AAD)

## Sources Consulted
- Google Cloud KMS: Encrypting and decrypting data with a symmetric key: https://cloud.google.com/kms/docs/encrypt-decrypt
- Google Cloud SDK reference: `gcloud kms encrypt`: https://cloud.google.com/sdk/gcloud/reference/kms/encrypt
- Google Cloud SDK reference: `gcloud kms decrypt`: https://cloud.google.com/sdk/gcloud/reference/kms/decrypt
- Cloud KMS REST API: `cryptoKeys.encrypt`: https://cloud.google.com/kms/docs/reference/rest/v1/projects.locations.keyRings.cryptoKeys/encrypt
- Cloud KMS REST API: `cryptoKeys.decrypt`: https://cloud.google.com/kms/docs/reference/rest/v1/projects.locations.keyRings.cryptoKeys/decrypt
- Cloud KMS Additional Authenticated Data guide: https://cloud.google.com/kms/docs/additional-authenticated-data
- Cloud KMS audit logging documentation: https://cloud.google.com/kms/docs/audit-logging
- Cloud Audit Logs overview and Data Access logging behavior: https://cloud.google.com/logging/docs/audit

## Issues Found
- The post said every operation is logged in Cloud Audit Logs. Encrypt and decrypt operations are Cloud KMS Data Access audit logs, and Data Access audit logs are generally disabled by default, so I changed the wording to say these operations can be logged when Data Access audit logs are enabled.
- The post stated a blanket 64 KiB plaintext size limit. The current Cloud KMS API documentation says software, external, and external VPC keys support 64 KiB plaintext, while HSM keys have an 8 KiB combined plaintext and AAD limit. I updated the size-limit section to include that caveat.
- The monitoring section implied the log query would work without setup. I clarified that Cloud KMS Data Access audit logs must be enabled before tracking encrypt/decrypt usage this way.

## Review Notes
The gcloud commands and the Python, Node.js, and Go client-library examples match current Cloud KMS APIs and official sample patterns. The Go example includes request-side CRC32C for encryption but does not perform the optional response integrity verification shown in Google's full samples; this is not incorrect, but a future improvement could add full integrity checks for both encryption and decryption.
