# Validation Summary: How to Set Up GCP Access Context Manager with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Access Context Manager
- OpenTofu / HCL
- HashiCorp Google provider (`google_access_context_manager_access_policy`, `google_access_context_manager_access_level`)
- VPC Service Controls
- IAM Conditions

## Sources Consulted
- Google Cloud Access Context Manager overview: https://cloud.google.com/access-context-manager/docs/overview
- Google Cloud access level attributes: https://cloud.google.com/access-context-manager/docs/access-level-attributes
- Google Cloud create a basic access level: https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud Access Context Manager REST reference for access levels: https://cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- Terraform Registry: `google_access_context_manager_access_level`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_level
- Terraform Registry: `google_access_context_manager_access_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_policy
- HashiCorp Google provider generated docs source for `google_access_context_manager_access_level`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/access_context_manager_access_level.html.markdown
- HashiCorp Google provider generated docs source for `google_access_context_manager_access_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/access_context_manager_access_policy.html.markdown

## Issues Found
- Step 4 described the example as "combining access levels," but the configuration actually combines multiple `conditions` inside a single access level by using `basic.combining_function = "AND"`. I updated the section heading and inline comment to reflect the actual behavior. This matches the Google provider schema, where combining existing access levels is represented with `required_access_levels`, while `combining_function` controls how the current access level's `conditions` are evaluated.

## Review Notes
- The HCL resource names, field names, and enum values used in the post are current and valid for the Google provider documentation reviewed.
- Device policy-based conditions require supporting device context to evaluate as intended. Google Cloud documents that mobile devices require MDM, and other devices require Endpoint Verification.
- The Google provider documentation notes an operational caveat for Access Context Manager resources when using User ADCs: `billing_project` and `user_project_override = true` are required to avoid ACM API 403 errors.
