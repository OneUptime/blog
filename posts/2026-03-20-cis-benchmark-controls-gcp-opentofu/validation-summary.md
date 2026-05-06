# Validation Summary: How to Implement CIS Benchmark Controls with OpenTofu on GCP

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Google Cloud Organization Policy
- Google Cloud IAM
- Cloud Logging
- Cloud Monitoring
- Compute Engine
- Cloud KMS
- Cloud Storage

## Sources Consulted
- Google provider docs for `google_org_policy_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/org_policy_policy.html.markdown
- Google provider docs for project IAM audit config: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_project_iam.html.markdown
- Google provider docs for `google_logging_project_sink`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/logging_project_sink.html.markdown
- Google provider docs for `google_logging_metric`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/logging_metric.html.markdown
- Google provider docs for `google_monitoring_alert_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/monitoring_alert_policy.html.markdown
- Google provider docs for `google_compute_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance.html.markdown
- Google provider docs for `google_compute_firewall`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_firewall.html.markdown
- Google provider docs for `google_kms_crypto_key_iam_member`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_kms_crypto_key_iam.html.markdown
- Google provider docs for `google_storage_bucket_iam_member`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/storage_bucket_iam.html.markdown
- Google provider docs for `google_organization` and `google_project` data sources: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/d/organization.html.markdown and https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/d/project.html.markdown
- Restrict IAM service account usage: https://cloud.google.com/resource-manager/docs/organization-policy/restricting-service-accounts
- Organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Enable Data Access audit logs: https://cloud.google.com/logging/docs/audit/configure-data-access
- Manage OS Login in an organization: https://cloud.google.com/compute/docs/oslogin/manage-oslogin-in-an-org
- Protect resources by using Cloud KMS keys: https://cloud.google.com/compute/docs/disks/customer-managed-encryption
- Service accounts for Compute Engine: https://cloud.google.com/compute/docs/access/service-accounts
- Remediating Security Health Analytics findings: https://cloud.google.com/security-command-center/docs/how-to-remediate-security-health-analytics-findings
- Configure notifications for log-based metrics: https://cloud.google.com/logging/docs/logs-based-metrics/charts-and-alerts

## Issues Found
- The post used `google_organization_policy`, which the current Google provider marks as superseded by `google_org_policy_policy`. I replaced the org policy examples with the current resource.
- The section labeled as a 90-day service-account key control incorrectly disabled key creation instead of setting key expiry. I changed it to the `iam.serviceAccountKeyExpiryHours` policy with `2160h` so the code matches the stated control.
- The corporate-login comment was inverted. I corrected it so it no longer says to avoid corporate login credentials.
- The “service accounts do not have admin privileges” note had no preventive implementation. I added the managed constraint that blocks Owner and Editor grants on default service accounts, which is the enforceable preventive control documented by Google Cloud.
- The audit logging example described Cloud Audit Logs broadly, but the IAM audit config resource configures Data Access audit logs. I corrected the wording to match Google Cloud’s documentation.
- The logging sink example omitted the IAM grant required for the sink writer identity to write to Cloud Storage. I added a `google_storage_bucket_iam_member` binding for `roles/storage.objectCreator`.
- The project-ownership logs-based metric filter was incomplete and missed the documented owner add/remove conditions. I replaced it with the filter Google Cloud documents for this finding.
- The Monitoring alert policy snippet was invalid because it omitted the required `combiner` field. I added `combiner = "OR"` and scoped the metric filter to `resource.type="global"`.
- The networking section included an invalid empty `google_compute_project_metadata` resource. I removed that invalid block and clarified that the org policy only prevents default network creation for new projects.
- The CMEK VM example omitted the required KMS IAM grant for the Compute Engine service agent, which would cause instance creation to fail. I added the `google_kms_crypto_key_iam_member` resource and an explicit dependency.
- The OS Login example could be read as an organization-wide enforcement mechanism even though it only enables OS Login on that VM. I clarified that org-wide enforcement uses the `compute.requireOsLogin` policy.

## Review Notes
- The post remains a valid technical guide after correction, but several snippets still assume prerequisite resources exist elsewhere in the configuration, such as `google_storage_bucket.audit_logs`, `google_compute_network.main`, `google_service_account.app`, `google_kms_crypto_key.vm_disk`, and `google_monitoring_notification_channel.email`.
- Google Cloud currently maps Security Command Center findings to multiple CIS GCP benchmark versions, including v2.0.0, so control numbering can vary by benchmark version. The post title does not specify a benchmark version, which is acceptable, but version-specific numbering should be checked carefully in future updates.
