# Validation Summary: How to Set Up GCP Organizations with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Google Cloud Resource Manager
- Google Cloud Organizations, folders, and projects
- Google Cloud IAM
- Google Cloud Organization Policy
- Google Cloud Billing
- HashiCorp Google provider for Terraform/OpenTofu

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- HashiCorp Google provider `google_organization` data source: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/d/organization.html.markdown
- HashiCorp Google provider `google_folder` resource: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_folder.html.markdown
- HashiCorp Google provider `google_project` resource: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_project.html.markdown
- HashiCorp Google provider organization IAM resources: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_organization_iam.html.markdown
- HashiCorp Google provider folder IAM resources: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_folder_iam.html.markdown
- HashiCorp Google provider legacy `google_organization_policy` resource: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_organization_policy.html.markdown
- HashiCorp Google provider `google_org_policy_policy` resource: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/org_policy_policy.html.markdown
- Google Cloud resource hierarchy documentation: https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy
- Google Cloud organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud resource location restriction documentation: https://cloud.google.com/resource-manager/docs/organization-policy/defining-locations
- Google Cloud Billing concepts: https://cloud.google.com/billing/docs/concepts
- Google Cloud project billing documentation: https://cloud.google.com/billing/docs/how-to/modify-project

## Issues Found
- The Organization Policies examples used `google_organization_policy`, which the current Google provider documentation says has been superseded by `google_org_policy_policy`. Updated both organization policy examples to use the v2 `google_org_policy_policy` resource with `name`, `parent`, and `spec.rules`.
- The resource location policy used the legacy `constraint` and `list_policy` syntax. Updated it to `spec.rules.values.allowed_values` and used policy names like `organizations/{org_id}/policies/gcp.resourceLocations`, matching the v2 resource format.
- The OS Login policy used the legacy `boolean_policy { enforced = true }` syntax. Updated it to `spec.rules.enforce = "TRUE"`, matching the v2 resource schema.
- The introduction and conclusion implied that billing is inherited or applied through the organization/folder hierarchy. Updated the wording to clarify that Cloud Billing accounts are linked to projects, while IAM and organization policies inherit through the resource hierarchy.

## Review Notes
- The folder, project, organization lookup, and IAM snippets are consistent with current provider documentation.
- The IAM examples use `google_organization_iam_binding` and `google_folder_iam_binding`, which are authoritative for a given role. That is valid, but future posts could mention that `*_iam_member` is safer when adding a single member without managing the full membership list for a role.
