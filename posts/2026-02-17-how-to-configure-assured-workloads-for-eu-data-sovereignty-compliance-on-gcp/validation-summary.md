# Validation Summary: How to Configure Assured Workloads for EU Data Sovereignty Compliance on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Assured Workloads
- EU Data Boundary and Support / EU Regions and Support
- Google Cloud CLI
- Cloud KMS and customer-managed encryption keys
- BigQuery
- Cloud Storage
- IAM Conditions
- Access Transparency
- Cloud Monitoring alert policies
- Python Google Cloud client libraries

## Sources Consulted
- Google Cloud Assured Workloads: EU Data Boundary and Support: https://docs.cloud.google.com/assured-workloads/docs/control-packages/eu-data-boundary-support
- Google Cloud Assured Workloads key concepts: https://docs.cloud.google.com/assured-workloads/docs/key-concepts
- Google Cloud Assured Workloads key management: https://docs.cloud.google.com/assured-workloads/docs/key-management
- Google Cloud CLI reference for `gcloud assured workloads create`: https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/create
- Google Cloud CLI reference for Assured Workloads violations: https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/violations/list
- Assured Workloads REST API Workload resource: https://docs.cloud.google.com/assured-workloads/docs/reference/rest/v1/organizations.locations.workloads
- Python client reference for Assured Workloads `ResourceSettings`: https://docs.cloud.google.com/python/docs/reference/assuredworkloads/latest/google.cloud.assuredworkloads_v1.types.Workload.ResourceSettings
- Access Transparency log reading guide: https://docs.cloud.google.com/assured-workloads/access-transparency/docs/reading-logs
- Access Transparency enablement guide: https://docs.cloud.google.com/assured-workloads/access-transparency/docs/enable
- IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- BigQuery CMEK documentation: https://docs.cloud.google.com/bigquery/docs/customer-managed-encryption
- Cloud Storage CMEK documentation: https://docs.cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- Cloud Monitoring Python `LogMatch` reference: https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.types.AlertPolicy.Condition.LogMatch

## Issues Found
- The post used overly broad claims that all data at rest stays in EU regions and that all non-EU Google personnel access is technically blocked. Updated the wording to match Google Cloud's supported-services and control-package scope.
- The post used the older display name "EU Regions and Support" without acknowledging the current documentation name. Updated it to "EU Data Boundary and Support" while preserving the valid API enum context.
- The `gcloud assured workloads create` example used uppercase enum values, an unqualified billing account, a past key rotation date, and a partner flag that was not needed for the described EU Data Boundary setup. Updated the command to current documented CLI values and key resource settings.
- The Python workload creation sample used deprecated `kms_settings` and a stale timestamp. Replaced it with current `resource_settings` for the encryption keys project and key ring.
- The post said a key project and key ring are always created. Updated the text to clarify that these are created when key resource settings or KMS settings are supplied.
- The BigQuery CMEK example did not grant the BigQuery encryption service account permission to use the key and used an `EU` multi-region dataset with a regional `europe-west1` key. Added the IAM binding step and changed the dataset to `europe-west1`.
- The Cloud Storage CMEK example referenced `storage-key` without creating it and did not authorize the Cloud Storage service agent. Added the key creation and `gcloud storage service-agent --authorize-cmek` command.
- The Access Transparency log filters used an incomplete `logName:"accessTransparency"` expression. Replaced it with the documented full Access Transparency log name.
- The monitoring section called the code a dashboard, but the sample creates an alert policy. Renamed that wording to a log-based alert.

## Review Notes
The local environment does not have `gcloud` installed, so CLI verification was performed against official Google Cloud CLI reference documentation rather than local `--help` output.
