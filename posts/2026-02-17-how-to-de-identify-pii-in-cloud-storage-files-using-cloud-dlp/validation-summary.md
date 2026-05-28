# Validation Summary: How to De-Identify PII in Cloud Storage Files Using Cloud DLP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Sensitive Data Protection / Cloud DLP
- Cloud Storage
- DLP API and REST requests
- Google Cloud CLI authentication
- Python Google Cloud DLP client library
- Cloud Functions
- Cloud KMS wrapped keys

## Sources Consulted
- Google Cloud Sensitive Data Protection: De-identification of sensitive Cloud Storage data: https://docs.cloud.google.com/sensitive-data-protection/docs/concepts-deidentify-storage
- Google Cloud Sensitive Data Protection: Create de-identified copies of data stored in Cloud Storage using the API: https://docs.cloud.google.com/sensitive-data-protection/docs/deidentify-storage
- Google Cloud Sensitive Data Protection REST reference: Action and Deidentify action: https://docs.cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/Action
- Google Cloud Sensitive Data Protection REST reference: InspectJobConfig and CloudStorageOptions: https://docs.cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/InspectJobConfig
- Google Cloud Sensitive Data Protection REST reference: FileType enum: https://docs.cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/FileType
- Google Cloud Sensitive Data Protection REST reference: Create deidentifyTemplates: https://docs.cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/projects.locations.deidentifyTemplates/create
- Google Cloud Sensitive Data Protection IAM roles: https://docs.cloud.google.com/sensitive-data-protection/docs/iam-roles
- Google Cloud IAM service agents reference: https://docs.cloud.google.com/iam/docs/service-agents
- Google Cloud Sensitive Data Protection pricing: https://cloud.google.com/sensitive-data-protection/pricing

## Issues Found
- The original `gcloud dlp jobs create` command used unsupported flags for Cloud Storage de-identification. Replaced it with a documented REST `projects.dlpJobs.create` request that creates an inspection job with a `deidentify` action.
- The original examples placed `deidentify_config` directly on the storage inspection job. Cloud Storage de-identification jobs use the `Deidentify` action and reference de-identify templates through `transformation_config`; updated the REST and Python examples accordingly.
- The reusable de-identification configuration was shown as a standalone `deidentifyConfig` object without explaining how storage jobs use it. Converted it into a `deidentifyTemplates.create` request body and added the API call to create the template.
- The bucket IAM example used an incorrect placeholder service account format and granted only object creation permission. Updated it to the documented DLP service agent format `service-PROJECT_NUMBER@dlp-api.iam.gserviceaccount.com` and a Cloud Storage role that can write output objects.
- The prerequisites did not mention template creation permissions or that Cloud Storage de-identification output must be in a different bucket from the input. Added those requirements.
- The post claimed JSON is handled as a separate structured de-identification format and that Avro/Parquet are supported for storage de-identification. Updated the file-type section to reflect that Cloud Storage de-identification supports CSV, image, text, and TSV groups; JSON files are part of the text file group.
- The file-type example included `JSON` and `AVRO`, and set `bytes_limit_per_file`. `JSON` is not a FileType enum value, Avro is not supported for Cloud Storage de-identification output, and byte limits cannot be set when de-identification is requested. Updated the example.
- The Cloud Function example created a de-identification job without limiting transformed file types. Added `file_types_to_transform` with supported values.
- The cost note said de-identification scans the data twice. Reworded it to reflect documented inspection and transformation charges without asserting a two-pass implementation.

## Review Notes
Cloud DLP is now part of Sensitive Data Protection, but the DLP API name and Python client package remain in use. The post still uses the familiar Cloud DLP naming, which is acceptable but could be refreshed in a future editorial pass.
