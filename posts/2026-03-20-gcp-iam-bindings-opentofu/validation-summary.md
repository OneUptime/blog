# Validation Summary: How to Set Up GCP IAM Bindings with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud IAM
- Google Cloud Resource Manager
- Google Cloud Storage IAM
- BigQuery dataset IAM
- GKE Workload Identity / service account IAM bindings

## Sources Consulted
- HashiCorp Google provider docs for project IAM: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_project_iam.html.markdown
- HashiCorp Google provider docs for service account IAM: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_service_account_iam.html.markdown
- HashiCorp Google provider docs for Cloud Storage bucket IAM: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/storage_bucket_iam.html.markdown
- HashiCorp Google provider docs for BigQuery dataset IAM: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/bigquery_dataset_iam.html.markdown
- Google Cloud IAM Conditions overview: https://docs.cloud.google.com/iam/docs/conditions-overview
- Google Cloud IAM Conditions attribute reference: https://docs.cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud temporary access with IAM Conditions: https://docs.cloud.google.com/iam/docs/configuring-temporary-access
- Google Cloud resource hierarchy: https://docs.cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy
- OpenTofu `for_each` documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/

## Issues Found
- The conditional `google_project_iam_member` example used `roles/editor` with an IAM condition. Google Cloud does not allow conditions on legacy basic roles such as Owner, Editor, and Viewer. I changed the example to use `roles/container.admin`, which is valid with conditions.
- The same conditional example was described as "business hours" but only checked the hour, not the day of week. I updated the expression and description to enforce weekday business hours by checking both `getDayOfWeek()` and `getHours()`.
- The best-practice scope order was incorrect. Google Cloud resource hierarchy is resource > project > folder > organization when ordered from narrowest to broadest, so I corrected the bullet accordingly.
- The guidance around `iam_member`, `iam_binding`, and `iam_policy` was missing the provider's coexistence constraints. I updated the best-practice bullets to reflect that `iam_binding` and `iam_member` should not manage the same role, and that `iam_policy` should not be mixed with the other IAM resources.
- The statement that conditional bindings "expire automatically without manual cleanup" overstated the behavior. Conditional bindings can stop granting access automatically when the condition no longer matches, but the binding itself remains in policy until removed. I corrected that wording.

## Review Notes
- `google_project_iam_audit_config` is also a related project IAM resource in the Google provider, but it manages audit logging rather than permission grants, so excluding it from this post is acceptable.
- `google_bigquery_dataset_iam_*` resources are technically correct here, but readers should be aware that these resources conflict with `google_bigquery_dataset_access` and can remove authorized view permissions if mixed.
