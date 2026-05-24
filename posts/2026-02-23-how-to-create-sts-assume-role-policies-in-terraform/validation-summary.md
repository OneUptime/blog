# Validation Summary: How to Create STS Assume Role Policies in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM
- AWS STS (Security Token Service)
- AWS Terraform Provider (`hashicorp/aws`)
- SAML federation
- OIDC federation (GitHub Actions, EKS)
- AWS S3 (used in session-tag example)

## Sources Consulted
- Terraform AWS Provider docs — `aws_iam_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider docs — `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform AWS Provider docs — provider `assume_role` block: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS Provider v5 Upgrade Guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade
- AWS STS API reference (AssumeRole, AssumeRoleWithSAML, AssumeRoleWithWebIdentity): https://docs.aws.amazon.com/STS/latest/APIReference/
- AWS IAM docs — confused deputy and external ID: https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html
- AWS IAM docs — session tags / `sts:TagSession`: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- AWS docs — using OIDC with GitHub Actions (`aud = sts.amazonaws.com`): https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect

## Issues Found
No technical issues found.

Verified specifically:
- `aws_iam_policy_document` data source schema (statement/effect/principals/actions/condition) — correct.
- `max_session_duration` allowed range of 3600–43200 seconds — correct.
- Provider `assume_role { duration = "1h" }` — correct for AWS provider v4.39+ and v5.x (the older `duration_seconds` was deprecated and removed in v5.0).
- Condition keys `sts:ExternalId`, `sts:DurationSeconds`, `SAML:aud`, and the OIDC `aud` claim format — all correct.
- `sts:TagSession` action required for session tagging — correct.
- The `$${aws:PrincipalTag/TenantId}` escaping inside `jsonencode` — correct (escapes the `${` so Terraform leaves the IAM policy variable intact).
- `sts:AssumeRoleWithSAML` and `sts:AssumeRoleWithWebIdentity` action names and use cases — correct.

## Review Notes
- The post says Terraform 1.0 or later is required; no AWS provider version is pinned. The `assume_role { duration = "..." }` syntax requires AWS provider v4.39+. Readers on very old provider versions would need `duration_seconds = 3600` instead. A future revision could mention a minimum provider version, but the post is accurate for current/maintained provider versions.
- The OIDC trust example for GitHub Actions does not include a `sub` claim condition (e.g. restricting to a specific repo/branch). This is fine for an introductory example and is consistent with the scope of the post, but a hardened production trust policy would normally also constrain `token.actions.githubusercontent.com:sub`.
- Trust policies using `:root` as the principal (e.g. `arn:aws:iam::111111111111:root`) delegate trust to the account; this is technically correct AWS behavior and matches what the post says, and the post's own best-practices section calls out preferring specific principal ARNs over whole accounts.
