# Validation Summary: How to Create GCP IAM Custom Roles with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language)
- Google Cloud Platform (GCP)
- GCP IAM (Identity and Access Management)
- `google_project_iam_custom_role` Terraform resource
- `google_organization_iam_custom_role` Terraform resource
- `google_project_iam_member` Terraform resource
- `google_iam_testable_permissions` Terraform data source
- GCP Pub/Sub, BigQuery, Cloud Storage, Compute Engine, Cloud Logging, Security Command Center (in examples)

## Sources Consulted
- [Terraform Registry: google_project_iam_custom_role](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam_custom_role)
- [Terraform provider source: google_project_iam_custom_role docs (GitHub)](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/google_project_iam_custom_role.html.markdown)
- [GCP Docs: Creating and managing custom roles](https://cloud.google.com/iam/docs/creating-custom-roles)
- [GCP IAM API: RoleLaunchStage reference](https://cloud.google.com/iam/reference/rest/v1/organizations.roles#Role.RoleLaunchStage)
- [GCP IAM: projects.roles.delete API reference](https://cloud.google.com/iam/docs/reference/rest/v1/projects.roles/delete)

## Issues Found
- **Invalid Terraform syntax in `null_resource.permission_check`**: The original code used `count = length(local.invalid_permissions) > 0 ? "Invalid permissions found" : 0`, which is invalid — the `count` meta-argument requires a number, but the conditional's true branch returned a string. Terraform's type system would fail this immediately (mixed types in conditional and non-number assigned to `count`). Replaced with a `lifecycle.precondition` block, which is the idiomatic Terraform pattern (1.2+) for failing plans when input is invalid and surfaces a clear, useful error message listing the invalid permissions.

## Review Notes
- Resource argument names (`role_id`, `project`, `org_id`, `title`, `description`, `permissions`, `stage`) for both `google_project_iam_custom_role` and `google_organization_iam_custom_role` match the current provider documentation.
- `role_id` documentation in the Terraform provider does note that the role id should be camel case and cannot contain `-` characters, so the post's naming guidance is consistent with provider expectations. Strictly speaking, GCP itself accepts alphanumeric characters and underscores, but camelCase is the convention the provider documents.
- The soft-delete timing (7 days) is approximately correct per the Terraform provider docs ("deleted role is permanently deleted after 7 days"), though the full timeline to reuse a role name can extend to roughly 37 days. The post's simplification is reasonable for a high-level guide.
- The `lifecycle { create_before_destroy = true }` block shown for handling undelete scenarios is not a documented official fix from the provider docs, but it is not technically broken — left as-is since the post presents it as a helper, not a guarantee.
- The data source `google_iam_testable_permissions` argument name `stages` and the output attribute `permissions[*].name` are correct.
- Permission strings referenced in examples (e.g., `pubsub.subscriptions.consume`, `bigquery.tables.getData`, `securitycenter.findings.list`, `compute.firewalls.list`) are all valid GCP IAM permissions.
- The `stage` comment lists only `ALPHA`, `BETA`, `GA`. GCP technically also supports `DEPRECATED`, `DISABLED`, and `EAP`. This is a minor omission, not an error, since the listed three are by far the most common values when authoring a role.
