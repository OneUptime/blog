# Validation Summary: How to De-Identify DICOM Medical Images While Preserving Clinical Utility

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Healthcare API
- DICOM and DICOMweb
- DICOM store de-identification
- Cloud DLP / Sensitive Data Protection-backed text redaction
- Google Cloud CLI
- Python client library for Cloud Healthcare API
- IAM permissions for Cloud Healthcare API

## Sources Consulted
- Google Cloud Healthcare API: De-identifying DICOM data using DicomConfig: https://docs.cloud.google.com/healthcare-api/docs/how-tos/dicom-deidentify
- Google Cloud Healthcare API REST reference: dicomStores.deidentify: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1/projects.locations.datasets.dicomStores/deidentify
- Google Cloud Healthcare API DeidentifyConfig reference: https://docs.cloud.google.com/healthcare-api/docs/reference/rest/v1beta1/DeidentifyConfig
- Google Cloud Healthcare API RPC reference for google.cloud.healthcare.v1.deidentify: https://docs.cloud.google.com/healthcare-api/docs/reference/rpc/google.cloud.healthcare.v1/deidentify
- Google Cloud Healthcare API DICOM store management guide: https://docs.cloud.google.com/healthcare-api/docs/how-tos/dicom
- Google Cloud Healthcare API DICOMweb guide: https://docs.cloud.google.com/healthcare-api/docs/how-tos/dicomweb
- Google Cloud Healthcare API DICOM conformance statement: https://docs.cloud.google.com/healthcare-api/docs/dicom
- Google Cloud IAM roles and permissions for Cloud Healthcare API: https://docs.cloud.google.com/iam/docs/roles-permissions/healthcare
- gcloud healthcare dicom-stores deidentify reference: https://docs.cloud.google.com/sdk/gcloud/reference/healthcare/dicom-stores/deidentify

## Issues Found
- The prerequisite IAM line described `healthcare.dicomStores.deidentify` and `dlp.user` as roles. `healthcare.dicomStores.deidentify` is an IAM permission, not a role, and DICOM store de-identification also requires write permission on the destination DICOM store. Updated the text to refer to permissions and include `healthcare.dicomStores.dicomWebWrite`.
- The first JSON configuration included an invalid top-level `tag_filter_profile` field. Removed it because the Cloud Healthcare API `DeidentifyConfig` expects DICOM tag filtering under `dicom.filterProfile`, `dicom.keepList`, or `dicom.removeList`.
- The expanded JSON configuration combined `filterProfile` and `keepList` inside `dicom`. These fields are part of the same `tag_filter` union and only one can be set. Removed the `keepList` from that example and adjusted the surrounding text.
- The preserving-clinical-utility section implied `keepList` could be used alongside the tag filtering profile. Updated it to clarify that keep-list based configuration is an alternative to a tag filtering profile.
- The DICOMweb verification URLs repeated the `includefield` parameter. The Cloud Healthcare API DICOM conformance statement documents `includefield` as a comma-separated list. Updated both URLs to use `includefield=PatientName,PatientID`.

## Review Notes
- Google documentation is inconsistent about whether `dicomStores.deidentify` creates the destination DICOM store or requires it to exist. The how-to guide and gcloud reference say the destination store must already exist, matching the post's setup step; the REST/RPC reference currently says it must not exist. The post was left aligned with the how-to and gcloud behavior.
- The post uses the legacy v1 `DicomConfig`. Google currently recommends the v1beta1 `DicomTagConfig` for new DICOM de-identification configurations, but the v1 `DicomConfig` remains documented and usable.
