# Validation Summary: How to Prepare for SOC 2 Type II Audit with Google Cloud Infrastructure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud
- Google Cloud CLI (`gcloud`)
- IAM and service accounts
- Workforce Identity Federation
- Cloud Logging and logs-based metrics
- Cloud Monitoring uptime checks and alert policies
- Security Command Center
- Compute Engine managed instance groups and load balancing
- Cloud SQL
- Cloud Storage
- Cloud KMS
- VPC Service Controls
- Cloud Deploy
- Terraform and Infrastructure Manager
- Python evidence collection script
- SOC 2 Trust Services Criteria

## Sources Consulted
- AICPA & CIMA, 2017 Trust Services Criteria with Revised Points of Focus: https://www.aicpa.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022
- Google Cloud CLI reference for IAM workforce pools: https://cloud.google.com/sdk/gcloud/reference/iam/workforce-pools/list
- Google Cloud IAM service account key documentation: https://cloud.google.com/iam/docs/keys-list-get
- Google Cloud CLI reference for Cloud Logging read and logs-based metrics: https://cloud.google.com/sdk/gcloud/reference/logging/read and https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud KMS audit logging: https://cloud.google.com/kms/docs/audit-logging
- Google Cloud CLI reference for Cloud Monitoring uptime checks: https://cloud.google.com/sdk/gcloud/reference/monitoring/uptime/list-configs
- Google Cloud CLI reference for Security Command Center services, notifications, and findings: https://cloud.google.com/sdk/gcloud/reference/scc/manage/services/list, https://cloud.google.com/sdk/gcloud/reference/scc/notifications/list, and https://cloud.google.com/sdk/gcloud/reference/scc/findings/list
- Google Cloud Compute Engine autoscaler documentation: https://cloud.google.com/compute/docs/autoscaler/managing-autoscalers
- Google Cloud SQL Admin API instance fields: https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1/instances
- Google Cloud Storage bucket metadata and CMEK documentation: https://cloud.google.com/storage/docs/getting-bucket-metadata and https://cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- Google Cloud Deployment Manager deprecation notice: https://cloud.google.com/deployment-manager/docs/deprecations

## Issues Found
- The service account key listing example used `keyId`, which is not the normal `gcloud` output field. Updated the format to derive `KEY_ID` from the key resource name and include `validBeforeTime`.
- The SCC status evidence command used `gcloud scc settings describe`, which is not a current stable command. Replaced it with `gcloud scc manage services list --organization=...`.
- The autoscaling evidence command was labeled as autoscaling configuration while only listing managed instance groups. Updated the label and output file to accurately describe managed instance groups and autoscaler references.
- The Cloud SQL backup table referenced `backupConfiguration` at the top level. Updated it to `settings.backupConfiguration`, matching the Cloud SQL Admin API instance schema.
- The Cloud Storage bucket encryption table used the raw JSON API field name `defaultKmsKeyName`. Updated it to the standardized `gcloud storage` field `default_kms_key`.
- The KMS log metric filter used a brittle method-name expression and referenced a non-existent `DisableCryptoKeyVersion` audit method. Updated it to explicit `OR` comparisons using documented Cloud KMS audit method names.
- The post recommended Deployment Manager as current IaC evidence. Deployment Manager reached end of support on March 31, 2026, so this was updated to Infrastructure Manager.

## Review Notes
Local `gcloud` was not installed in the review environment, so command validation was performed against current official Google Cloud CLI documentation rather than by executing the commands.
