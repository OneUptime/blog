# Validation Summary: How to Troubleshoot Permission Denied Errors in GCP IAM

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud CLI (`gcloud`)
- Policy Troubleshooter
- IAM deny policies
- Service Usage API
- Organization Policy
- VPC Service Controls
- Cloud Audit Logs
- Cloud Storage
- BigQuery
- Compute Engine
- Cloud Run

## Sources Consulted
- Google Cloud CLI reference: `gcloud` global flags and `--verbosity` - https://cloud.google.com/sdk/gcloud/reference
- Google Cloud CLI reference: `gcloud storage ls` - https://cloud.google.com/sdk/gcloud/reference/storage/ls
- Google Cloud CLI reference: `gcloud storage buckets get-iam-policy` - https://cloud.google.com/sdk/gcloud/reference/storage/buckets/get-iam-policy
- Google Cloud Policy Intelligence: Troubleshoot IAM permissions - https://cloud.google.com/policy-intelligence/docs/troubleshoot-access
- Google Cloud IAM: Deny policies - https://cloud.google.com/iam/docs/deny-overview
- Google Cloud Service Usage: Enable and disable services - https://cloud.google.com/service-usage/docs/enable-disable
- Google Cloud Service Health troubleshooting example for disabled API 403 behavior - https://cloud.google.com/service-health/docs/troubleshooting
- Google Cloud Resource Manager: Restricting identities by domain - https://cloud.google.com/resource-manager/docs/organization-policy/restricting-domains
- Google Cloud SDK reference: `gcloud resource-manager org-policies` - https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies
- Google Cloud VPC Service Controls audit logging - https://cloud.google.com/vpc-service-controls/docs/audit-logging
- Google Cloud VPC Service Controls troubleshooting - https://cloud.google.com/vpc-service-controls/docs/troubleshooting
- Google Cloud IAM: Access change propagation - https://cloud.google.com/iam/docs/access-change-propagation
- Google Cloud Logging: Cloud Audit Logs overview - https://cloud.google.com/logging/docs/audit
- Google Cloud Logging: Enable Data Access audit logs - https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud SDK reference: `gcloud logging read` - https://cloud.google.com/sdk/gcloud/reference/logging/read

## Issues Found
- The IAM propagation delay guidance said new role grants can take up to 60 seconds, with some cases up to 7 minutes. Google Cloud documents IAM policy changes as typically taking about 2 minutes and sometimes 7 minutes or more, while group membership changes can take several minutes or longer. Updated the quick-fix table and propagation section to match the documented timing.
- The audit logs section said Cloud Audit Logs record every API call, including denied ones. Google Cloud documents multiple audit log types, with Data Access logs disabled by default for most services unless configured. Updated the wording to say Cloud Audit Logs can record denied API calls and that coverage depends on audit log type and Data Access configuration.

## Review Notes
The remaining commands and explanations are technically sound for a troubleshooting guide. Some examples require installed and authenticated Google Cloud CLI components and appropriate viewer/admin permissions, and Policy Troubleshooter results may depend on access to policy details such as group membership and deny policy visibility.
