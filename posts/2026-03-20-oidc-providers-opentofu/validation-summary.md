# Validation Summary: How to Manage OIDC Providers with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL configuration)
- AWS IAM (`aws_iam_openid_connect_provider`, `aws_iam_role`, `aws_iam_role_policy_attachment`)
- AWS STS (`AssumeRoleWithWebIdentity`)
- OIDC (OpenID Connect) federation
- GitHub Actions OIDC tokens
- `aws-actions/configure-aws-credentials` GitHub Action
- AWS Provider for Terraform (hashicorp/aws ~> 5.30)

## Sources Consulted
- AWS Terraform Provider docs — `aws_iam_openid_connect_provider`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- AWS Terraform Provider docs — `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- GitHub Docs — Configuring OpenID Connect in AWS: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- GitHub Docs — About security hardening with OIDC (sub claim format): https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- AWS STS API Reference — AssumeRoleWithWebIdentity: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- aws-actions/configure-aws-credentials repository: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
No technical issues found.

Specifically verified:
- OIDC provider URL `https://token.actions.githubusercontent.com` is correct.
- Audience `sts.amazonaws.com` is the default audience used by `aws-actions/configure-aws-credentials` and matches AWS expectations.
- The Terraform resource `aws_iam_openid_connect_provider` correctly accepts `url`, `client_id_list`, and `thumbprint_list`.
- Sub claim format `repo:<owner>/<repo>:ref:refs/heads/<branch>` matches the official GitHub OIDC token format for branch refs.
- Wildcard pattern `repo:owner/repo:*` is valid with `StringLike` for matching all refs in a repo.
- `permissions: id-token: write` is required in the workflow to mint the OIDC token.
- `aws-actions/configure-aws-credentials@v4` is the correct latest major version.
- AssumeRoleWithWebIdentity session duration range (15 minutes to 12 hours, capped by the role's `max_session_duration`) is accurate.
- `max_session_duration` is the correct role attribute; 3600 s is valid (it is also the minimum/default).

## Review Notes
- The thumbprint `6938fd4d98bab03faadb97b34396831e3780aea1` is a historically valid GitHub Actions OIDC thumbprint. Since mid-2023, AWS has performed its own certificate chain validation against the OIDC IdP for known providers (including GitHub), so the thumbprint is largely a formality, though the field is still required by the AWS API and the Terraform resource. The post correctly advises auditing thumbprints periodically.
- The example references `aws_iam_policy.deploy` for the policy attachment but does not define it in-line; readers will need to provide their own policy resource. This is a reasonable scoping decision for a focused post but worth noting.
- For production use, readers should consider also restricting by `job_workflow_ref` claim where appropriate for stronger guarantees about which workflow file is allowed to assume the role.
