# Validation Summary: How to Create GCP Organization Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Organization Policy
- OpenTofu
- Terraform HCL
- Google Cloud provider
- Compute Engine
- IAM and service accounts

## Sources Consulted
- Google Cloud Organization Policy overview: https://cloud.google.com/resource-manager/docs/organization-policy/overview
- Google Cloud hierarchy evaluation: https://cloud.google.com/resource-manager/docs/organization-policy/understanding-hierarchy
- Google Cloud organization policy constraints reference: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud resource location restrictions: https://cloud.google.com/resource-manager/docs/organization-policy/defining-locations
- Google Cloud domain-restricted sharing: https://cloud.google.com/resource-manager/docs/organization-policy/restricting-domains
- Google Cloud external IP access constraint guidance: https://cloud.google.com/compute/docs/ip-addresses/configure-static-external-ip-address
- Google provider `google_org_policy_policy` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/org_policy_policy.html.markdown

## Issues Found
- The overview said organization policies "cannot be bypassed by project owners," which was too absolute. Google Cloud documents that child resources inherit policies by default, but lower-level resources can override inherited legacy managed constraints or restore the default behavior. I corrected the explanation to match current hierarchy evaluation rules.
- The `compute.requireOsLogin` and `iam.disableServiceAccountKeyCreation` examples used `enforce = true`. The current Google provider documentation for `google_org_policy_policy` models `enforce` as `"TRUE"` or `"FALSE"` strings, so I updated both snippets to match the documented resource schema.
- The first example described `gcp.resourceLocations` as a compute-region restriction. Google documents that this constraint governs location-based resource creation across supported services, so I changed the heading and comments to refer to resource locations instead of compute regions.
- The project-level external IP exception example used `allow_all` with a misleading inheritance comment. Google’s external IP constraint guidance recommends restoring the default policy for project exemptions, so I changed the example to `reset = true`.
- The domain restriction example used a bare placeholder customer ID and described it as a generic domain restriction. Google documents that `iam.allowedPolicyMemberDomains` accepts organization principal sets or Google Workspace customer IDs in `allowed_values`, so I updated the value to the documented `is:C...` form and clarified the comment.

## Review Notes
- `iam.allowedPolicyMemberDomains` is a legacy managed constraint. Google also documents `iam.managed.allowedPolicyMembers` and custom constraints on `iam.googleapis.com/AllowPolicy` as newer options for domain-restricted sharing.
- Organizations created on or after May 3, 2024 have `iam.allowedPolicyMemberDomains` enforced by default with their domain as the only allowed value.
- `gcp.resourceLocations` applies to supported services and new resource creation; existing resources are not retroactively changed.
- The review was documentation-based. No live `tofu plan` or GCP apply was run in this workspace.
