# Validation Summary: How to Create GCP Organization Policies with Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (HashiCorp)
- Google Cloud Platform (GCP) Organization Policy Service (v2)
- Terraform `google` provider — `google_org_policy_policy`, `google_organization`, `google_tags_tag_key`, `google_tags_tag_value`
- gcloud CLI (`gcloud org-policies`)
- GCP managed constraints (compute, storage, iam, sql, serviceuser, gcp.resourceLocations)

## Sources Consulted
- [Terraform Registry: google_org_policy_policy](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy)
- Source markdown for the provider doc: `hashicorp/terraform-provider-google` `website/docs/r/org_policy_policy.html.markdown`
- [Terraform Registry: google_organization data source](https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/google_organization)
- [GCP Organization Policy constraints reference](https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints)
- [GCP: Restricting Resource Locations / value groups](https://cloud.google.com/resource-manager/docs/organization-policy/defining-locations)
- [GCP: Restrict identities by domain (iam.allowedPolicyMemberDomains)](https://cloud.google.com/resource-manager/docs/organization-policy/restricting-domains)
- [gcloud org-policies list-custom-constraints](https://cloud.google.com/sdk/gcloud/reference/org-policies/list-custom-constraints)

## Issues Found

1. **Incorrect "deny all" syntax for `compute.vmExternalIpAccess`** — The post used `values { denied_values = ["all"] }` to deny all VM external IPs. In the v2 `google_org_policy_policy` resource, `denied_values` is a list of specific resource identifiers (for `compute.vmExternalIpAccess`, VM instance names in `projects/PROJECT/zones/ZONE/instances/INSTANCE` form). The canonical way to deny every value is the sibling field `deny_all = "TRUE"`. Fixed in two places: the standalone `vm_external_ip` resource and the default rule inside the `conditional_external_ip` resource.

2. **Misleading "Listing Available Constraints" section** — The original section showed a duplicate `data "google_organization" "current"` block (which retrieves org metadata and does *not* enumerate constraints) and a commented-out `gcloud org-policies list` call (which lists *existing* policies on a resource, not the catalog of available built-in constraints). Replaced with an accurate description: a link to the official constraints reference page, plus correct gcloud commands — `gcloud org-policies list` (clarified that it lists policies set on the org) and `gcloud org-policies list-custom-constraints` (lists custom constraints defined in the org). There is no first-party gcloud subcommand that enumerates all built-in managed constraints; the docs page is authoritative.

## Review Notes

- `enforce`, `allow_all`, and `deny_all` are intentionally **strings** (`"TRUE"` / `"FALSE"`), not booleans, in this provider — this matches the upstream provider schema and the post uses them correctly.
- `is:${directory_customer_id}` is the correct value form for `iam.allowedPolicyMemberDomains` in v2 org policies; the `directory_customer_id` attribute exists on the `google_organization` data source.
- `in:us-locations` and `in:europe-locations` are valid value groups for `gcp.resourceLocations`. (Note: `in:eu-locations` is a separate, narrower group; the post uses `europe-locations` which is broader and matches the intent of the comment.)
- `resource.matchTag('ORG_ID/SHORT_NAME', 'TAG_VALUE')` is a valid CEL expression for org-policy conditions; `resource.matchTagId('tagKeys/...', 'tagValues/...')` is the alternative permanent-ID form.
- `serviceuser.services` is a real managed constraint, but in practice many teams now use the newer `constraints/gcp.restrictServiceUsage` family for finer-grained API allow/deny lists. Both are valid; the post's example is correct for the constraint it references.
- The Comprehensive Security Baseline `for_each` map is sound; all listed constraints are boolean constraints and accept the `enforce` field. The map collapses to `enforce = "TRUE"` because every value is `true`, but it is written generally enough that a `false` value would correctly emit `"FALSE"`.
- The `reset = true` field on the project-level override is the correct v2 way to revert to the parent/default behavior.
