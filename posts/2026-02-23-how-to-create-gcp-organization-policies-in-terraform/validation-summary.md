# Validation Summary: How to Create GCP Organization Policies in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp)
- Terraform Google Cloud provider (`hashicorp/google` v5.x)
- Google Cloud Platform (GCP) Organization Policies (V1 and V2)
- GCP IAM, Compute Engine, Cloud Storage, Shared VPC, Resource Manager
- Custom Organization Policy Constraints
- Cloud Logging (log-based metrics)

## Sources Consulted
- Terraform Google provider — `google_organization_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_organization_policy
- Terraform Google provider — `google_folder_organization_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_folder_organization_policy
- Terraform Google provider — `google_project_organization_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_organization_policy
- Terraform Google provider — `google_org_policy_policy` (V2): https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy
- Terraform Google provider — `google_org_policy_custom_constraint`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_custom_constraint
- Terraform Google provider — `google_folder`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_folder
- Terraform Google provider — `google_logging_metric`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_metric
- GCP Organization Policy constraints reference: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- GCP custom constraints docs: https://cloud.google.com/resource-manager/docs/organization-policy/creating-managing-custom-constraints
- GCP — Restricting Resource Service Usage: https://cloud.google.com/resource-manager/docs/organization-policy/restricting-resources
- GCP IAM — Troubleshooting org policies (status codes): https://cloud.google.com/iam/docs/troubleshoot-org-policies

## Issues Found

1. **Custom constraint enforced with wrong resource version.** The "Creating Custom Organization Policy Constraints" section paired the V2 `google_org_policy_custom_constraint` resource with the V1 `google_organization_policy` resource for enforcement. Custom constraints are a V2-only feature and can only be enforced via `google_org_policy_policy`. **Fix:** Replaced the V1 enforcement block with a `google_org_policy_policy` resource using the correct V2 schema (`name` with `policies/<constraint_name>` suffix, `parent`, and `spec { rules { enforce = "TRUE" } }`).

2. **Outdated / limited service-restriction constraint.** The post used `constraints/serviceuser.services`, which is the legacy constraint (deny-list only, limited service coverage). The current, recommended constraint is `constraints/gcp.restrictServiceUsage` (Restrict Resource Service Usage), which supports both allowlist and denylist semantics across all services. **Fix:** Updated the constraint name accordingly. The surrounding deny-list example remains valid under the new constraint.

3. **Wrong status code in log-based metric filter.** The audit-log filter for org policy violations used `protoPayload.status.code=7` (PERMISSION_DENIED). Organization policy denials surface as code `9` (FAILED_PRECONDITION) — code 7 is reserved for IAM permission denials. **Fix:** Changed the filter to `protoPayload.status.code=9`.

## Review Notes

- The V1 resources (`google_organization_policy`, `google_folder_organization_policy`, `google_project_organization_policy`) are still functional in provider v5.x but are based on the older Cloud Resource Manager Org Policy API. Google's documentation recommends migrating to the V2 `google_org_policy_policy` resource for new work, since V2 supports dry-run mode, conditions, and custom constraints. The post mixes V1 (for predefined constraints) with V2 (for custom constraint definition); this is supported but readers may want to standardize on V2 going forward.
- `google_folder.production.name` correctly returns `folders/{folder_id}`, which is the format expected by `google_folder_organization_policy.folder`.
- The custom constraint condition uses `action_type = "ALLOW"` with a CEL expression requiring non-null labels, which is a valid (if slightly unusual) pattern — typically authors use `DENY` with a negated condition. Functionally equivalent.
- The Google Workspace customer ID placeholder `"C0xxxxxxx"` is shown as an example; readers will need to substitute their actual customer ID obtainable from Admin SDK or Cloud Identity.
- The "dry-run mode" mentioned in Best Practices is available natively only through the V2 `google_org_policy_policy` resource (via `spec.rules.condition` and `dry_run_spec`); the V1 resources do not expose dry-run.
