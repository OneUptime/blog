# Validation Summary: How to Set Up GCP Security Command Center with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Security Command Center
- OpenTofu
- Terraform HCL
- Google Cloud Pub/Sub
- BigQuery
- Security Health Analytics
- Google Cloud IAM

## Sources Consulted
- Terraform Google provider: `google_project_service` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_service
- Terraform Google provider: `google_scc_v2_organization_notification_config` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/scc_v2_organization_notification_config
- Terraform Google provider: `google_scc_management_organization_security_health_analytics_custom_module` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/scc_management_organization_security_health_analytics_custom_module
- Terraform Google provider: `google_scc_v2_organization_scc_big_query_export` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/scc_v2_organization_scc_big_query_export
- Terraform Google provider: `google_scc_v2_organization_source` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/scc_v2_organization_source
- Terraform Google provider: `google_scc_v2_organization_source_iam` https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/scc_v2_organization_source_iam
- Google Cloud: Overview of activating Security Command Center https://docs.cloud.google.com/security-command-center/docs/activate-scc-overview
- Google Cloud: Enable finding notifications for Pub/Sub https://docs.cloud.google.com/security-command-center/docs/how-to-notifications
- Google Cloud: Stream findings to BigQuery for analysis https://cloud.google.com/security-command-center/docs/how-to-analyze-findings-in-big-query
- Google Cloud: Overview of custom modules for Security Health Analytics https://cloud.google.com/security-command-center/docs/custom-modules-sha-overview
- Google Cloud: Using security marks https://cloud.google.com/security-command-center/docs/how-to-security-marks
- Google Cloud: Set IAM policies on a source https://cloud.google.com/security-command-center/docs/samples/securitycenter-set-source-iam

## Issues Found
- The Step 1 resource name `google_security_center_organization_security_health_analytics_custom_module` does not exist in the current Google provider, and Security Command Center tier activation itself is performed in the Google Cloud console. I replaced the snippet with the required API enablement resources and clarified the prerequisite.
- The notification example omitted the Pub/Sub Publisher IAM grant required for the SCC-generated service account. I switched the example to the current organization notification resource and added the topic IAM binding.
- The Security Health Analytics section created a custom source instead of a Security Health Analytics custom module. I replaced it with `google_scc_management_organization_security_health_analytics_custom_module`.
- The BigQuery export section used `google_scc_project_notification_config`, which creates Pub/Sub notifications rather than BigQuery exports. I replaced it with `google_scc_v2_organization_scc_big_query_export` and added dataset IAM for the export principal.
- The Security Marks section did not manage security marks and used an invalid `organization` argument on the source IAM member resource. I replaced it with a custom source plus source IAM configuration, which matches what the code actually configures.
- The output reference pointed to the old notification resource name. I updated it to the corrected v2 notification resource.

## Review Notes
- Security marks themselves are managed through the Security Command Center API; the revised post now focuses on SCC resources that the Google provider exposes directly.
- If Security Command Center data residency is enabled, replace `location = "global"` with the configured SCC location for the location-aware v2 notification and BigQuery export resources.
