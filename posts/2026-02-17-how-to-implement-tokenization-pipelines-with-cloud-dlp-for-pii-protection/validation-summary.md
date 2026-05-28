# Validation Summary: How to Implement Tokenization Pipelines with Cloud DLP for PII Protection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Sensitive Data Protection / Cloud DLP
- Cloud KMS
- BigQuery
- Dataflow / Apache Beam
- Python client libraries
- gcloud CLI

## Sources Consulted
- Google Cloud KMS key creation documentation: https://docs.cloud.google.com/kms/docs/create-key
- gcloud kms keys create reference: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Sensitive Data Protection de-identifying sensitive data documentation: https://docs.cloud.google.com/sensitive-data-protection/docs/deidentify-sensitive-data
- Sensitive Data Protection deterministic encryption sample: https://docs.cloud.google.com/sensitive-data-protection/docs/samples/dlp-deidentify-deterministic
- Sensitive Data Protection FPE re-identification sample: https://docs.cloud.google.com/sensitive-data-protection/docs/samples/dlp-reidentify-fpe
- Sensitive Data Protection BigQuery integration documentation: https://cloud.google.com/sensitive-data-protection/docs/dlp-bigquery
- Sensitive Data Protection Cloud Storage de-identification API documentation: https://docs.cloud.google.com/sensitive-data-protection/docs/deidentify-storage
- google-cloud-dlp Python CryptoDeterministicConfig reference: https://docs.cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.CryptoDeterministicConfig
- google-cloud-dlp Python CryptoHashConfig reference: https://docs.cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.CryptoHashConfig
- Sensitive Data Protection template creation reference: https://docs.cloud.google.com/sensitive-data-protection/docs/creating-templates-deid

## Issues Found
- The introduction overstated that all tokenization preserves format and length. Updated it to distinguish format-preserving encryption from deterministic encryption and cryptographic hashing.
- The KMS command used a fixed `--next-rotation-time` of `2026-05-01T00:00:00Z`, which is in the past as of validation on 2026-05-28. Removed the fixed timestamp and kept `--rotation-period=90d`, which lets KMS schedule the first automatic rotation from creation time.
- The DLP Python template example passed the base64 wrapped key string directly to `wrapped_key`. Updated it to base64-decode the wrapped key before passing it to the Python client library.
- The DLP Python template example used camelCase `surrogateInfoType` fields. Updated them to the Python client library's snake_case `surrogate_info_type` field name.
- The BigQuery pipeline example configured a DLP inspection job with a Cloud Storage de-identification action but described writing to a BigQuery destination table. Replaced it with a BigQuery read, DLP `deidentify_content`, and BigQuery insert flow that matches the described behavior.
- The Dataflow example batched records with `BatchElements` but the `TokenizePII` DoFn expected a single dictionary record. Removed the batching transform so the sample data shape is consistent.
- The DLP content API calls used `us-central1` parents while referencing a `global` de-identification template. Updated the content API parent locations to `global`.
- The re-identification section implied all fields could be restored. Updated it to clarify that only reversible transformations can be re-identified; hashed and redacted fields cannot be restored.
- The post claimed the guide covered Cloud Storage, but the corrected implementation covers BigQuery and streaming data. Updated that sentence to match the actual tutorial scope.

## Review Notes
The corrected examples are technically aligned with the current APIs, but the BigQuery sample is a simple tutorial implementation. A production pipeline should batch DLP content requests, handle DLP and BigQuery quotas, preserve non-string schema types deliberately, and add retry/error handling.
