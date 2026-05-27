# Validation Summary: How to Set Up a New Google Cloud Project with Organization Policies

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Resource Manager
- Google Cloud folders and projects
- Google Cloud Organization Policy Service
- Google Cloud IAM
- Google Cloud Billing
- Google Cloud Service Usage
- Cloud Audit Logs and Cloud Logging sinks
- Terraform Google provider

## Sources Consulted
- Google Cloud CLI reference: `gcloud resource-manager org-policies set-policy` - https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Google Cloud CLI reference: `gcloud resource-manager folders create` - https://cloud.google.com/sdk/gcloud/reference/resource-manager/folders/create
- Google Cloud CLI reference: `gcloud projects create` - https://cloud.google.com/sdk/gcloud/reference/projects/create
- Google Cloud Resource Manager folder documentation - https://cloud.google.com/resource-manager/docs/creating-managing-folders
- Google Cloud Organization Policy constraints reference - https://cloud.google.com/organization-policy/docs/reference/org-policy-constraints
- Google Cloud domain restricted sharing documentation - https://cloud.google.com/resource-manager/docs/organization-policy/restricting-domains
- Google Cloud Data Access audit log configuration documentation - https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud CLI reference: `gcloud logging sinks create` - https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud log routing documentation - https://cloud.google.com/logging/docs/export/configure_export_v2
- Terraform Google provider `google_project` resource documentation - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project
- Terraform Google provider `google_org_policy_policy` resource documentation - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy

## Issues Found
- The `constraints/iam.allowedPolicyMemberDomains` example used a bare Cloud Identity customer ID. Updated it to the documented `is:C0xxxxxxx` form for allowed values.
- The IAM example described `roles/editor` as admin access. Updated the wording to "broad edit access" because Editor is a primitive edit role, not full administrative access.
- The audit logging example used `gcloud projects set-iam-policy` with a new policy containing empty `bindings`, which would overwrite existing IAM bindings. Replaced it with the documented get-edit-set workflow and explicitly preserved existing `bindings` and `etag`.
- The organization-level log sink claimed to capture all audit logs but omitted `--include-children`. Added `--include-children` so it functions as an aggregated sink for child folders and projects.
- Added a note that the sink writer identity must be granted permission on the BigQuery dataset after sink creation.

## Review Notes
The remaining commands and Terraform examples match current documented syntax at the time of review. The IAM role choices are technically valid but broad; in a production foundation, least-privilege custom or predefined roles would usually be preferable to primitive Editor.
