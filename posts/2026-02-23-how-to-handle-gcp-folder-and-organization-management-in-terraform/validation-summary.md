# Validation Summary: How to Handle GCP Folder and Organization Management in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (terraform-google provider)
- Google Cloud Platform (GCP) Resource Manager
- GCP Organizations, Folders, Projects
- GCP IAM (folder-level and organization-level bindings)
- GCP Tags (tag keys, values, bindings)
- GCP Billing accounts
- Shared VPC (xpnAdmin role)

## Sources Consulted
- [google_organization data source](https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/google_organization)
- [google_folder resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_folder)
- [google_folder_iam resources](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_folder_iam)
- [google_organization_iam resources](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_organization_iam)
- [google_project resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project)
- [google_tags_tag_key resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/tags_tag_key)
- [google_tags_tag_value resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/tags_tag_value)
- [google_tags_tag_binding resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/tags_tag_binding)
- [google_billing_account data source](https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/google_billing_account)
- [GCP Resource Manager limits](https://cloud.google.com/resource-manager/docs/limits) (folder nesting depth = 10)
- [GCP Networking IAM roles](https://cloud.google.com/iam/docs/job-functions/networking) (xpnAdmin)
- Terraform import syntax for for_each resources (HashiCorp docs)

## Issues Found
1. **Import command for `for_each` resource was missing its instance key.** The post showed `terraform import google_organization_iam_member.org_admins "..."` but the `org_admins` resource is declared with `for_each`, so an import without the key would fail. Updated to use the proper instance-keyed address: `'google_organization_iam_member.org_admins["group:org-admins@example.com"]'`. Source: Terraform import semantics for `for_each` resources.

## Review Notes
- The `purpose_data.network` value for `google_tags_tag_key` with `purpose = "GCE_FIREWALL"` uses the short form `<project>/<vpc-name>` — this matches the format required by the provider and Google API (confirmed against the official `tags_tag_key` example).
- `google_project.folder_id` accepts both the bare numeric ID and the `folders/{id}` form because the provider normalizes via a `StateFunc`. The post's use of `google_folder.X.name` (which returns `folders/{id}`) therefore works correctly.
- `data.google_organization.org.name` returns the resource path `organizations/{id}`, not a human-readable display name — naming the output `organization_name` could mislead readers expecting the display name (`display_name` would be the right attribute for that). Left as-is because it's not technically incorrect.
- The first `terraform import` example uses escaped quotes (`\"Production\"`) which works in bash; single quotes around the address would be more conventional but the current form is functionally correct.
- The `google_project` example references `random_id.suffix.hex` without showing the `random_id` resource declaration — minor incompleteness, not a technical error.
- All GCP IAM role names referenced (`roles/iam.securityReviewer`, `roles/billing.admin`, `roles/resourcemanager.organizationAdmin`, `roles/compute.xpnAdmin`, `roles/logging.viewer`, `roles/editor`, `roles/viewer`) are valid predefined roles.
- The 10-level folder nesting limit cited in Best Practices is accurate per GCP Resource Manager documentation.
