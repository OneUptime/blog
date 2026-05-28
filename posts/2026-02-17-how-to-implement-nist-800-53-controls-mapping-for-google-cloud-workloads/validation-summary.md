# Validation Summary: How to Implement NIST 800-53 Controls Mapping for Google Cloud Workloads

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- NIST SP 800-53 Revision 5
- Google Cloud IAM and Cloud Identity
- Google Cloud Security Command Center
- Google Cloud Audit Logs and Cloud Logging
- Cloud Asset Inventory and gcloud CLI
- Terraform Google provider
- Cloud KMS
- BigQuery
- Cloud Build
- Open Policy Agent
- Python Google Cloud Security Command Center client

## Sources Consulted
- NIST SP 800-53 Revision 5: https://www.nist.gov/publications/security-and-privacy-controls-information-systems-and-organizations-0
- Google Cloud Security Command Center vulnerability findings and compliance mappings: https://cloud.google.com/security-command-center/docs/concepts-vulnerabilities-findings
- Google Cloud Security Center Python client list_findings documentation: https://cloud.google.com/python/docs/reference/securitycenter/latest/google.cloud.securitycenter_v1.services.security_center.SecurityCenterClient
- Google Cloud Audit Logs overview and Data Access audit log configuration: https://cloud.google.com/logging/docs/audit and https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud Resource Manager domain-restricted sharing organization policy: https://cloud.google.com/resource-manager/docs/organization-policy/restricting-domains
- Terraform Google provider google_organization_policy documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_organization_policy
- Terraform Google provider google_project_iam_audit_config documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- Terraform Google provider google_logging_organization_sink documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_organization_sink
- Google Cloud gcloud identity groups memberships list reference: https://docs.cloud.google.com/sdk/gcloud/reference/identity/groups/memberships/list
- Google Cloud Asset Inventory IAM policy search documentation: https://cloud.google.com/asset-inventory/docs/search-allow-policies
- Google Cloud Build configuration and substitutions documentation: https://docs.cloud.google.com/build/docs/configuring-builds/create-basic-configuration and https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- BigQuery bq command-line reference and JSON load documentation: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference and https://cloud.google.com/bigquery/docs/batch-loading-data
- Open Policy Agent eval documentation: https://www.openpolicyagent.org/docs

## Issues Found
- The post described NIST 800-53 as having 20 control families without specifying the revision. Updated this to NIST SP 800-53 Revision 5, where the 20-family statement is accurate.
- The Python compliance checker emitted pretty-printed multi-line JSON, but the Cloud Build pipeline loads it as `NEWLINE_DELIMITED_JSON`. Changed the script to emit one JSON object per line and to generate the assessment timestamp dynamically.
- The Terraform organization policy example was labeled as enforcing MFA and session controls, but `iam.allowedPolicyMemberDomains` implements domain-restricted sharing for IAM members. Updated the resource name and comment to match the actual control.
- The SCC category mapping used a generic `ENCRYPTION_NOT_ENABLED` category that is not a documented Security Command Center finding category. Replaced it with the documented `KMS_KEY_NOT_ROTATED` category and NIST mappings.
- The Terraform introduction said the snippet implemented only AC-2 and AU-2, while the snippet also included AU-6 and SC-28 examples. Updated the sentence to match the code.
- The organization log sink referenced an undefined BigQuery dataset and omitted the required sink writer permission. Added a `google_bigquery_dataset`, enabled a unique sink writer identity, and granted `roles/bigquery.dataEditor` on the dataset.
- The KMS key comment implied NIST SC-12 universally requires 90-day key rotation. Reworded it as an example rotation policy for cryptographic key management.

## Review Notes
- `google_organization_policy` remains supported but is superseded by `google_org_policy_policy` in the current Terraform Google provider. The existing example is still technically valid, so it was not replaced.
- Terraform was not installed in the workspace, so HCL validation was performed against official provider documentation rather than by running `terraform validate`.
