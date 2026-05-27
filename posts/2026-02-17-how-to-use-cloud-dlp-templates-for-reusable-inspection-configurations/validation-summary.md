# Validation Summary: How to Use Cloud DLP Templates for Reusable Inspection Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Sensitive Data Protection / Cloud DLP
- Cloud DLP Python client library (`google-cloud-dlp`)
- DLP inspection templates
- DLP de-identification templates
- Google Cloud CLI (`gcloud dlp`)
- Terraform Google provider DLP resources
- BigQuery storage inspection jobs

## Sources Consulted
- Google Cloud Sensitive Data Protection templates documentation: https://cloud.google.com/sensitive-data-protection/docs/concepts-templates
- Google Cloud documentation for creating inspection templates: https://cloud.google.com/sensitive-data-protection/docs/creating-templates-inspect
- Google Cloud Sensitive Data Protection infoType detector reference: https://cloud.google.com/sensitive-data-protection/docs/infotypes-reference
- Google Cloud Python client reference for `DlpServiceClient`: https://cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.services.dlp_service.DlpServiceClient
- Google Cloud Python client reference for `InspectConfig`: https://cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.InspectConfig
- Google Cloud Python client reference for `InspectJobConfig`: https://cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.InspectJobConfig
- Google Cloud Python client reference for `DeidentifyConfig`: https://cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.DeidentifyConfig
- Google Cloud Python client reference for `DateShiftConfig`: https://cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.DateShiftConfig
- Terraform Google provider documentation for `google_data_loss_prevention_inspect_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_loss_prevention_inspect_template
- Terraform Google provider documentation for `google_data_loss_prevention_deidentify_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_loss_prevention_deidentify_template

## Issues Found
- The post said templates could be referenced in any DLP job. This was too broad because inspection templates are accepted anywhere `inspectTemplateName` is supported, while de-identification templates are used by supported de-identification workflows. Updated the wording to avoid overgeneralizing.
- The inspection job sample defined a `deidentify_template` variable but never used it, and `InspectJobConfig` does not have a de-identification template field. Removed the unused variable and clarified that the sample uses the inspect template in an inspection job.
- The de-identification template description claimed the configuration was "HIPAA compliant." A DLP template alone does not guarantee HIPAA compliance. Reworded it as a configuration used in HIPAA-related workflows.
- The email masking comment said it preserved the domain, but the shown `CharacterMaskConfig` only preserves common separators such as `@` and `.`. Updated the comment.
- The Terraform inspection template used `info_type` blocks for built-in infoTypes, but the Google provider expects `info_types` blocks in `inspect_config`. Updated the Terraform snippet.
- The delete command comment implied templates can only be deleted when no jobs reference them. The API supports deleting templates by resource name; future jobs or triggers that reference deleted templates must be updated. Reworded the comment.
- Several Python snippets depended on an import from an earlier snippet. Added `from google.cloud import dlp_v2` to make the snippets clearer when read independently.

## Review Notes
The post still uses the older "Cloud DLP" product name, while Google Cloud documentation now primarily uses "Sensitive Data Protection." The API, client library, CLI group, and Terraform resource names still use DLP naming, so this is acceptable but could be modernized in a future editorial pass.
