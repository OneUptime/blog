# Validation Summary: How to Configure Domain-Restricted Sharing with Organization Policies in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Organization Policy Service
- IAM domain-restricted sharing
- Google Cloud CLI
- Terraform Google provider
- Cloud Asset Inventory

## Sources Consulted
- Google Cloud: Restrict identities with domain-restricted sharing: https://docs.cloud.google.com/organization-policy/restrict-domains
- Google Cloud: Domain restricted sharing methods and behavior: https://docs.cloud.google.com/resource-manager/docs/organization-policy/domain-restricted-sharing
- Terraform Registry: `google_org_policy_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy
- Google Cloud SDK reference: `gcloud org-policies set-policy`: https://docs.cloud.google.com/sdk/gcloud/reference/org-policies/set-policy
- Google Cloud SDK reference: `gcloud asset search-all-iam-policies`: https://docs.cloud.google.com/sdk/gcloud/reference/asset/search-all-iam-policies

## Issues Found
- The post presented `constraints/iam.allowedPolicyMemberDomains` as the only/current implementation path. Google now documents it as a legacy managed constraint and also documents `iam.managed.allowedPolicyMembers` and custom organization policies. I clarified that the post uses the legacy constraint.
- The gcloud YAML examples used the older `constraint` / `listPolicy` format with `gcloud resource-manager org-policies set-policy` flags. Google Cloud's current documentation uses Org Policy v2 policy resources with `name`, `spec.rules`, and `gcloud org-policies set-policy`. I updated the organization, folder, and project exception examples.
- The policy values used bare Customer IDs in YAML and Terraform. Current documentation shows allowed values for this legacy constraint using the `is:` prefix, such as `is:C03g5e3bc`. I updated the YAML and Terraform examples to use `is:C...`.
- The post said policy changes take effect within a few minutes. Google documents that these policies can require up to 15 minutes to take effect. I corrected the timing.
- The post referenced `constraints/iam.allowedPublicMemberTypes` for `allUsers` and `allAuthenticatedUsers`, but that constraint is not documented in Google Cloud's organization policy constraints. I replaced it with Google Cloud's documented guidance: use custom organization policies for special-principal exceptions, or service-specific controls such as Cloud Storage Public Access Prevention.
- The post described service accounts as if they were allowed or blocked based on ordinary email domains. I clarified that service accounts and workload identity pools are covered when they belong to an allowed organization principal set or Google Workspace Customer ID.
- The post implied child overrides only work "if the parent allows it." Google Cloud's inheritance model allows lower-level policies to override inherited policies for supported constraints. I simplified that wording.

## Review Notes
The tutorial remains focused on the legacy `iam.allowedPolicyMemberDomains` constraint. For new implementations, Google Cloud's newer `iam.managed.allowedPolicyMembers` constraint or custom organization policies may be a better fit, especially when exact principal exceptions or public-sharing exceptions are required.
