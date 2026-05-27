# Validation Summary: How to Use Date Shifting for De-Identification in Cloud DLP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Sensitive Data Protection / Cloud DLP
- DateShiftConfig de-identification transformation
- Python Google Cloud DLP client library
- BigQuery
- Cloud KMS-wrapped cryptographic keys
- HIPAA de-identification considerations

## Sources Consulted
- Google Cloud Sensitive Data Protection date shifting overview: https://cloud.google.com/sensitive-data-protection/docs/concepts-date-shifting
- Google Cloud Sensitive Data Protection Python date shifting sample: https://cloud.google.com/sensitive-data-protection/docs/samples/dlp-deidentify-date-shift
- Google Cloud Python DLP DateShiftConfig reference: https://cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.DateShiftConfig
- Google Cloud Python DLP DlpServiceClient reference: https://cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.services.dlp_service.DlpServiceClient
- Google Cloud Sensitive Data Protection DlpJob / Action reference: https://cloud.google.com/sensitive-data-protection/docs/reference/rpc/google.privacy.dlp.v2
- HHS HIPAA de-identification guidance: https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html

## Issues Found
- The structured table example represented date fields as strings. Updated the DLP table rows to use `date_value` values so `date_shift_config` is applied to actual date values in record transformations.
- The examples passed a placeholder wrapped key as a string. Updated the Python examples to base64-decode the wrapped key before assigning it to the `kms_wrapped.wrapped_key` bytes field.
- The BigQuery section used an invalid DLP job shape: Sensitive Data Protection inspection jobs can scan BigQuery tables, but the `deidentify` job action for creating de-identified copies applies to Cloud Storage. Replaced the job example with a BigQuery pipeline pattern that reads rows, calls `deidentify_content`, and writes transformed rows to a destination table.
- The HIPAA Safe Harbor guidance was overstated. Updated the text to clarify that Safe Harbor generally requires dates directly related to an individual to be reduced to the year, and that date shifting needs to be evaluated under the applicable de-identification method and risk analysis.
- The summary claimed date shifting makes re-identification impossible. Reworded it to say date shifting makes identification harder, which is more technically accurate.

## Review Notes
The revised BigQuery example is intentionally a pipeline pattern. For production-sized tables, batch sizes should be chosen to stay within Sensitive Data Protection content limits, and operational pipelines should handle retries, schema preservation, and partial failures.
