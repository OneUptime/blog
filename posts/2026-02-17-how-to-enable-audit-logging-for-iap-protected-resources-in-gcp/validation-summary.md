# Validation Summary: How to Enable Audit Logging for IAP-Protected Resources in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Identity-Aware Proxy (IAP)
- Cloud Audit Logs
- Cloud Logging
- Cloud Monitoring log-based metrics and alerts
- Log Router sinks
- BigQuery log exports
- Cloud Storage log exports
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud: Cloud Audit Logs overview: https://docs.cloud.google.com/logging/docs/audit
- Google Cloud: Enable Data Access audit logs: https://docs.cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud: Identity-Aware Proxy audit logging: https://docs.cloud.google.com/iap/docs/audit-log-howto
- Google Cloud: Context-aware access and IAP audit logs: https://docs.cloud.google.com/iap/docs/cloud-iap-context-aware-access-howto
- Google Cloud: Manage access to IAP-secured resources: https://docs.cloud.google.com/iap/docs/managing-access
- Google Cloud SDK: gcloud logging sinks create: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud SDK: gcloud logging metrics create: https://docs.cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud Logging: monitored resource types: https://cloud.google.com/logging/docs/api/v2/resource-list
- BigQuery bq CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Terraform Google provider IAM audit config reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam

## Issues Found
- The post claimed IAP audit logs record every authentication attempt. Google documents exceptions for publicly accessible resources, so the wording now says non-public IAP-protected resources.
- The post described Policy Denied logs as organization-policy denials. Google describes them more generally as denials caused by security policy violations, so the wording was corrected.
- The alternative `gcloud projects add-iam-policy-binding` example did not enable audit logs and would instead grant project Viewer access to all authenticated users. It was removed and replaced with a warning to preserve existing IAM policy fields when editing `auditConfigs`.
- Several queries used `resource.type="iap_web"`, which is not a Cloud Logging monitored resource type. Filters now use `protoPayload.serviceName="iap.googleapis.com"` and the Cloud Audit Logs data access log name where appropriate.
- IAP configuration change filters used short method names. They now use the documented fully qualified IAP Admin Service method names.
- The sample log entry used an invalid `iap_web` monitored resource. It now uses the documented `gce_backend_service` monitored resource and labels.
- The BigQuery sink permission example used `bq add-iam-policy-binding` against a dataset, but the `bq` command does not support datasets for that operation. The example now grants the sink writer identity `roles/bigquery.dataEditor` at the project level.
- The Cloud Storage sink section omitted destination permissions. It now includes a command granting `roles/storage.objectCreator` to the sink writer identity.
- The exclusion example used `gcloud logging sinks create --exclusion` without a sink destination. It now uses `gcloud logging exclusions create`.
- The Terraform sink filter used the invalid `iap_web` resource type. It now filters on `protoPayload.serviceName`.

## Review Notes
The local environment did not have `gcloud` or `bq` installed, so CLI verification was performed against official Google Cloud CLI documentation instead of local `--help` output. IAP access-event method names can vary by product surface, so the post now relies primarily on the documented IAP service name for broad sink and export filters.
