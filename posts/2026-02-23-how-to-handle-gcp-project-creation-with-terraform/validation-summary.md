# Validation Summary: How to Handle GCP Project Creation with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language / HCL)
- Google Cloud Platform (GCP) — Resource Manager, IAM, Compute (VPC/subnetworks), Billing Budgets, Service Usage / APIs
- HashiCorp `hashicorp/google` Terraform provider resources: `google_project`, `google_project_service`, `google_project_default_service_accounts`, `google_project_iam_member`, `google_compute_network`, `google_compute_subnetwork`, `google_billing_budget`, `random_id`

## Sources Consulted
- Terraform Google provider — `google_project`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project
- Terraform Google provider — `google_project_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service
- Terraform Google provider — `google_project_default_service_accounts`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_default_service_accounts
- Terraform Google provider — `google_project_iam_member` / `google_project_iam_binding` / `google_project_iam_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- Terraform Google provider — `google_billing_budget`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/billing_budget
- Terraform Google provider — `google_compute_network` / `google_compute_subnetwork`
- Google Cloud Resource Manager docs — Creating and managing projects: https://cloud.google.com/resource-manager/docs/creating-managing-projects

## Issues Found

1. **Incorrect example for removing the default editor role from the Compute Engine default service account.**
   The original code used `google_project_iam_member` to "remove" the editor role. `google_project_iam_member` is *non-authoritative* — it only **adds** bindings and cannot remove an existing one. The block as written either was a no-op or would re-assert the binding. Replaced with `google_project_default_service_accounts` using `action = "DEPRIVILEGE"`, which is the supported provider mechanism for stripping privileges from the default service accounts.

2. **Incorrect import command format for `google_project`.**
   The original showed `terraform import google_project.project projects/existing-project-id`. The documented import ID for `google_project` is just the bare project ID, not the fully qualified `projects/<id>` form (the `projects/<id>` form is the computed Terraform `id` attribute, not the import argument). Fixed to `terraform import google_project.project existing-project-id`.

3. **Incorrect claim about GCP project ID reuse.**
   The original stated that a project ID "cannot be reused for 30 days" after deletion, implying it becomes reusable afterward. Per Google Cloud documentation, once a project ID is used it is *permanently retired* and cannot be reused at all. The 30-day window refers to the recoverability of the deleted project itself, not to ID reuse. Reworded to clarify this.

## Review Notes

- The use of `byte_length = 2` on `random_id` produces only a 4-character hex suffix (~65k possible values). For high-volume project creation, increasing this (e.g., 4 bytes) would reduce collision risk further; the current value is acceptable for small/medium use.
- `google_billing_budget.amount.specified_amount.units` is typed as a string in the underlying GCP API. Passing a `number`-typed variable (as the project factory module does) relies on Terraform's automatic type coercion to string. This works today but is worth noting if stricter typing is ever enforced.
- The post does not explicitly mention that `google_project` requires *either* `org_id` or `folder_id` (not both), but the examples correctly demonstrate this by choosing one or the other in each block, so no change is needed.
- `disable_on_destroy = false` is correctly set on `google_project_service` resources; this prevents accidentally disabling shared APIs in projects that survive a Terraform destroy. The attribute remains valid and is not deprecated.
- The `google_compute_subnetwork.log_config` settings (`INTERVAL_5_SEC`, sampling 0.5) are correct enum values per provider docs.
