# Validation Summary: How to Configure Organization Policies to Restrict Resource Locations in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Organization Policy
- Resource Location Restriction constraint (`constraints/gcp.resourceLocations`)
- Google Cloud CLI (`gcloud`)
- Terraform Google provider organization policy resources
- Compute Engine organization policy constraints
- Cloud Logging log-based metrics

## Sources Consulted
- Google Cloud Organization Policy: Restrict resource locations: https://docs.cloud.google.com/organization-policy/restrict-locations
- Google Cloud Organization Policy: Services that support restricting resource locations: https://docs.cloud.google.com/organization-policy/reference/restrict-locations-supported-services
- Google Cloud SDK reference: `gcloud resource-manager org-policies set-policy`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Google Cloud SDK reference: `gcloud org-policies set-policy`: https://docs.cloud.google.com/sdk/gcloud/reference/org-policies/set-policy
- Google Cloud SDK reference: `gcloud resource-manager org-policies enable-enforce`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/enable-enforce
- Google Cloud Organization Policy constraints reference: https://docs.cloud.google.com/organization-policy/reference/org-policy-constraints
- Google Cloud Compute Engine custom constraints: https://docs.cloud.google.com/compute/docs/access/custom-constraints
- Terraform Google provider `google_organization_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_organization_policy
- Terraform Google provider `google_org_policy_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy

## Issues Found
1. **Invalid predefined machine type constraint** - The post used `constraints/compute.restrictMachineTypes`, which is not listed in the current Google Cloud organization policy constraints reference. Google documents machine type restrictions as a Compute Engine custom constraint use case. I replaced the invalid predefined list-policy example with a custom constraint against `compute.googleapis.com/Instance` and `resource.machineType`, plus the corresponding `gcloud org-policies set-custom-constraint` and policy enforcement commands.

2. **Incorrect enforcement command for VPC peering** - The post used `gcloud resource-manager org-policies enable-enforce` for `compute.restrictVpcPeering`. That command is only for boolean constraints, while `compute.restrictVpcPeering` is a list constraint. I replaced it with a list-policy YAML example and `gcloud resource-manager org-policies set-policy`.

3. **Misleading global-resource explanation** - The post said `in:us-locations` includes `global` and showed `global` in an allowlist. Google documents that resource location constraints do not apply to the `global` location and that global resource creation is always allowed for supported services. I replaced that section with a caveat explaining that location policies do not provide a residency guarantee for global or locationless resources.

## Review Notes
- The legacy Terraform resources (`google_organization_policy`, `google_folder_organization_policy`, and `google_project_organization_policy`) are still documented, but the current provider documentation says they have been superseded by `google_org_policy_policy`, which uses Organization Policy API v2 and supports additional features such as tags and conditions. The examples remain technically valid, but new implementations should consider the v2 resource.
- The post's older `gcloud resource-manager org-policies` examples are still documented and valid. Current Google Cloud location-restriction documentation also shows the newer `gcloud org-policies set-policy` flow with v2-style policy YAML.
