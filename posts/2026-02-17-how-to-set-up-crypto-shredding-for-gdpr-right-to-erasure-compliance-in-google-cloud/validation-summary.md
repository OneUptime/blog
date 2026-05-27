# Validation Summary: How to Set Up Crypto-Shredding for GDPR Right-to-Erasure Compliance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud KMS
- Google Cloud CLI
- Python
- Google Cloud KMS Python client library
- BigQuery
- Cloud Functions
- Pub/Sub
- Envelope encryption
- Crypto-shredding

## Sources Consulted
- Google Cloud KMS envelope encryption documentation: https://cloud.google.com/kms/docs/envelope-encryption
- Google Cloud KMS encrypt/decrypt documentation: https://cloud.google.com/kms/docs/encrypt-decrypt
- Google Cloud KMS destroy and restore key versions documentation: https://docs.cloud.google.com/kms/docs/destroy-restore
- Google Cloud KMS create key documentation: https://docs.cloud.google.com/kms/docs/create-key
- Google Cloud SDK reference for `gcloud kms keys create`: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud SDK reference for `gcloud kms keys versions destroy`: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/versions/destroy
- Google Cloud KMS quotas documentation: https://cloud.google.com/kms/quotas
- Google Cloud KMS pricing documentation: https://cloud.google.com/kms/pricing
- Google Cloud KMS Python client reference: https://docs.cloud.google.com/python/docs/reference/cloudkms/latest/google.cloud.kms_v1.services.key_management_service.KeyManagementServiceClient

## Issues Found
- The post stated that Cloud KMS key destruction has a fixed 24-hour delay before final destruction. Current Cloud KMS documentation says the scheduled destruction duration is configurable, defaults to 30 days, and has a 24-hour minimum for ordinary keys. Updated the explanation and limitations section accordingly.
- The examples described KMS destruction as immediate key destruction. Cloud KMS schedules key versions for destruction first. Updated the workflow, diagram label, comments, function docstrings, audit action, and log messages to use scheduled destruction terminology.
- The first Python example attempted to call `destroy_crypto_key_version` for every state except `DESTROYED`, which could include versions already scheduled for destruction or states that are not eligible for destruction. Updated it to schedule only `ENABLED` and `DISABLED` versions, matching Cloud KMS behavior.
- The automated erasure example skipped only `DESTROYED` and `DESTROY_SCHEDULED` versions. Updated it to schedule destruction only for `ENABLED` and `DISABLED` versions for the same reason.
- The erasure steps said encrypted data was "now unreadable" immediately after scheduling destruction. Updated the text to clarify optional data deletion should happen after key destruction completes.

## Review Notes
The code uses direct Cloud KMS encrypt/decrypt calls for wrapping Fernet DEKs, which is consistent with the envelope encryption pattern. For production hardening, Google recommends integrity verification with CRC32C on KMS encrypt/decrypt requests, but the omission does not make the illustrative sample technically incorrect.
