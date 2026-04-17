# Validation Summary: How to Implement Zero Trust Network with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Verified Access (instance, trust provider, group, endpoint)
- AWS IAM (policies with conditions, MFA, source VPC, principal tags)
- AWS VPC Security Groups (`aws_vpc_security_group_ingress_rule`)
- AWS CloudTrail (advanced event selectors)
- OpenTofu / Terraform (HCL, AWS provider)
- OIDC (as Verified Access user trust provider)
- Cedar policy language (Verified Access policies)

## Sources Consulted
- Terraform AWS Provider docs — `aws_verifiedaccess_trust_provider`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/verifiedaccess_trust_provider.html.markdown
- Terraform AWS Provider docs — `aws_verifiedaccess_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/verifiedaccess_group.html.markdown
- Terraform AWS Provider docs — `aws_verifiedaccess_endpoint`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/verifiedaccess_endpoint.html.markdown
- AWS Verified Access User Guide — Authorization policies (Cedar): https://docs.aws.amazon.com/verified-access/latest/ug/auth-policies.html
- Cedar Policy Reference: https://docs.cedarpolicy.com/
- AWS IAM condition keys (`aws:MultiFactorAuthPresent`, `aws:PrincipalTag`, `aws:SourceVpc`)
- AWS CloudTrail advanced event selectors documentation

## Issues Found

1. **`aws_verifiedaccess_trust_provider` configuration was internally inconsistent.**
   - The original set `user_trust_provider_type = "iam-identity-center"` while also including an `oidc_options` block. These are mutually exclusive — `oidc_options` is only used when `user_trust_provider_type = "oidc"`.
   - The required `policy_reference_name` argument was missing.
   - **Fix:** Set `user_trust_provider_type = "oidc"` to match the OIDC settings actually being supplied, added the required `policy_reference_name = "oidc"`, and updated the description accordingly.

2. **`aws_verifiedaccess_group.policy_document` used the wrong policy language.**
   - The original used `jsonencode({...})` with an IAM-style JSON policy (`Version`, `Statement`, `Action`, `Principal`, `Condition`). AWS Verified Access policies are written in **Cedar**, not JSON, per the official AWS Verified Access user guide.
   - **Fix:** Rewrote the `policy_document` as a Cedar `permit(principal, action, resource) when { ... };` statement that grants access when the OIDC group claim contains `engineering` or `platform`. This now references the trust provider via its `policy_reference_name` (`oidc`) as Cedar policies require.

3. **`aws_verifiedaccess_endpoint` argument name was incorrect.**
   - The original used `verifiedaccess_group_id`, but the Terraform AWS provider schema requires `verified_access_group_id` (with underscores between `verified` and `access`). Note that the `aws_verifiedaccess_group` resource uses `verifiedaccess_instance_id` (no underscore) — the inconsistency is a quirk of the provider.
   - **Fix:** Renamed the argument to `verified_access_group_id`.

## Review Notes

- The CloudTrail `advanced_event_selector` only selects `eventCategory = ["Data"]`, so the inline comment "Log all events" is slightly misleading — it logs **data** events only (S3 object access, Lambda invokes, etc.), not management events. A trail with no advanced event selectors logs all management events by default; mixing the two requires multiple selectors. Left as-is since it is technically valid HCL and a reasonable choice for audit-focused logging, but readers extending this should add a second `advanced_event_selector` for `Management` events if they want both.
- The IAM policy uses `StringLike` for the `aws:SourceVpc` condition. `StringEquals` would also work for an exact VPC ID match and is marginally more strict; `StringLike` is acceptable and lets you use wildcards if needed.
- `aws_vpc_security_group_ingress_rule` (singular) is the modern resource introduced in AWS provider v5 and is correctly used here in preference to inline `ingress` blocks on `aws_security_group`.
- The post references `module.vpc` and `aws_lb.internal_app` etc. without showing their definitions, but this is a normal stylistic choice for a focused tutorial.
- The `aws_verifiedaccess_instance` resource accepts an optional `description` only — the post uses it correctly with no required fields.
