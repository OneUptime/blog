# Validation Summary: How to Set Up IAM Conditions to Restrict Access by IP Address in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM Conditions
- Access Context Manager access policies and access levels
- Identity-Aware Proxy (IAP)
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- CEL expressions
- YAML configuration

## Sources Consulted
- Google Cloud IAM Conditions overview: https://cloud.google.com/iam/docs/conditions-overview
- Google Cloud IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud Access Context Manager create access policy guide: https://cloud.google.com/access-context-manager/docs/create-access-policy
- Google Cloud Access Context Manager basic access level guide: https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud Access Context Manager access level attributes: https://cloud.google.com/access-context-manager/docs/access-level-attributes
- Google Cloud Access Context Manager custom access level specification: https://cloud.google.com/access-context-manager/docs/custom-access-level-spec
- Google Cloud CLI `gcloud access-context-manager levels create` reference: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Google Cloud CLI `gcloud projects add-iam-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Terraform Google provider `google_access_context_manager_access_level` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_level

## Issues Found
- The original post implied that IP-based IAM Conditions could restrict arbitrary Google Cloud roles such as Compute Admin, Owner, Editor, Viewer, and Storage Object Viewer. Updated the post to state that `request.auth.access_levels` is supported for IAP access checks and changed examples to IAP roles.
- The original post used undocumented direct IP IAM expressions such as `request.auth.claims.client_ip`. Replaced that section with a supported custom Access Context Manager access level using `origin.ip` and `inIpRange`.
- The original Access Context Manager `--basic-level-spec` YAML examples incorrectly wrapped conditions in a top-level `conditions:` field for `gcloud`. Updated them to the documented YAML list format.
- The original IAM condition expressions used `.exists(...)` against `request.auth.access_levels`. Updated examples to the documented `'ACCESS_LEVEL_FULL_NAME' in request.auth.access_levels` form.
- The original examples used conditional bindings with basic roles, which `gcloud projects add-iam-policy-binding --condition` does not support. Replaced those examples with `roles/iap.httpsResourceAccessor` and `roles/iap.tunnelResourceAccessor`.
- The original access policy title used spaces, but Access Context Manager policy titles must follow the documented title constraints. Updated the example title to `Organization_Access_Policy`.
- The original inline heredoc command placed `--policy` after the heredoc terminator, which would not be part of the `gcloud` invocation. Replaced the example with a separate YAML file and a normal `gcloud` command.
- The original Cloud Console limitation claimed IP conditions work generally for Console access. Updated the limitation to clarify that access level conditions apply only where the IAM attribute is supported, such as IAP access.

## Review Notes
The post is now technically valid for the supported IAP + Access Context Manager pattern. It should not be read as a general Cloud Console or all-service IP allowlist; for broader network-based controls, readers should evaluate VPC Service Controls, IAP, BeyondCorp Enterprise, organization policies, or service-specific controls depending on the resource.
