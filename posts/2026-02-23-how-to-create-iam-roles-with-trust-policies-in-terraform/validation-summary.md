# Validation Summary: How to Create IAM Roles with Trust Policies in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM (Roles, Trust Policies, Assume Role Policies)
- AWS STS (`sts:AssumeRole`, `sts:AssumeRoleWithSAML`, `sts:AssumeRoleWithWebIdentity`)
- AWS service principals (Lambda, API Gateway, EC2)
- SAML federation
- OIDC federation (GitHub Actions)
- IAM condition keys (MFA, SourceIp, PrincipalTag, ExternalId)

## Sources Consulted
- Terraform AWS Provider docs: `aws_iam_role` resource — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider docs: `aws_iam_policy_document` data source — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Terraform AWS Provider docs: `aws_iam_saml_provider` and `aws_iam_openid_connect_provider` data sources
- AWS IAM User Guide: Trust policies and assume role policies — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html
- AWS IAM User Guide: Global condition context keys (`aws:MultiFactorAuthPresent`, `aws:SourceIp`, `aws:PrincipalTag`) — https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS STS User Guide: `sts:ExternalId` condition key — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html
- AWS docs: SAML 2.0-based federation, `SAML:aud` condition key
- GitHub Actions docs: OIDC with AWS — https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- Terraform HCL `dynamic` blocks and `jsonencode` function documentation

## Issues Found
No technical issues found.

All service principals (`lambda.amazonaws.com`, `apigateway.amazonaws.com`, `ec2.amazonaws.com`), STS actions, condition keys, and Terraform resource/data source schemas are accurate. The GitHub Actions OIDC provider URL (`https://token.actions.githubusercontent.com`) and the `:aud`/`:sub` condition variables are correct. `max_session_duration = 3600` falls within the valid 3600–43200 range. The `aws_iam_policy_document` and `jsonencode` examples are both syntactically valid HCL and produce a correct IAM policy JSON document (Version `2012-10-17`).

## Review Notes
- The OIDC trust policy correctly uses `StringEquals` for `:aud` and `StringLike` for `:sub`, which matches AWS best practice. Using `StringLike` on `:sub` without a tight pattern can be risky; the example's `repo:my-org/my-repo:*` is acceptable as an illustration, though in production it is often preferable to pin the ref (e.g. `repo:my-org/my-repo:ref:refs/heads/main`) — this is a hardening recommendation, not an error.
- The cross-account example trusts the account root (`:root`). The post itself flags this in the "Common Trust Policy Mistakes" section, so the trade-off is appropriately discussed.
- The "Common Mistakes" section correctly notes that wildcard principals (`*`) without strong conditions are dangerous.
- The post uses Terraform 1.0+ syntax throughout, which is consistent with the stated prerequisites.
