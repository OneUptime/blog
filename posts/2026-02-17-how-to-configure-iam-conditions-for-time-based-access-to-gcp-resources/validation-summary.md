# Validation Summary: How to Configure IAM Conditions for Time-Based Access to GCP Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- IAM Conditions
- Common Expression Language (CEL)
- gcloud CLI
- Terraform Google provider
- Access Context Manager access levels
- Identity-Aware Proxy (IAP)

## Sources Consulted
- Google Cloud IAM Conditions overview: https://cloud.google.com/iam/docs/conditions-overview
- Google Cloud IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud SDK `gcloud projects add-iam-policy-binding` reference: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Terraform Google provider `google_project_iam_member` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- Google Cloud Access Context Manager documentation: https://cloud.google.com/access-context-manager/docs

## Issues Found
- Conditional IAM bindings cannot be used with basic roles such as `roles/editor` and `roles/owner`. Changed the emergency access example from `roles/editor` to `roles/compute.admin`, and changed the access-level example from `roles/owner` to the IAP-specific `roles/iap.httpsResourceAccessor`.
- The emergency expiry command used `date -u -v+4H`, which is BSD/macOS-specific and fails on common Linux environments. Replaced it with a portable Python 3 command that emits an RFC 3339 UTC timestamp.
- The YAML condition file was nested under a top-level `condition:` key, but `--condition-from-file` expects the condition fields (`title`, `description`, and `expression`) as the file contents. Updated the YAML snippet to use the correct top-level fields.
- The IP restriction example used `request.auth.access_levels` as if it were a general project-wide IP restriction mechanism. Updated the section to describe Access Context Manager access levels for IAP-secured apps or tunnels, used the documented `in request.auth.access_levels` expression form, and changed the placeholder to `POLICY_NUMBER`.

## Review Notes
The time-based `request.time` functions, UTC default behavior, day-of-week numbering, timestamp comparisons, `gcloud --condition` syntax, and Terraform condition block examples are consistent with current official documentation. The local environment did not have `gcloud` or `terraform` installed, so CLI syntax was verified against official documentation rather than local help output.
