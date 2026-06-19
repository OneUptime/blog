# Validation Summary: How to Configure OIDC for AWS in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- OpenID Connect (OIDC)
- AWS IAM
- AWS STS
- AWS CLI
- Terraform AWS Provider
- aws-actions/configure-aws-credentials
- AWS S3
- Amazon ECR
- AWS CloudTrail

## Sources Consulted
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- GitHub Docs: OpenID Connect reference and subject claim behavior - https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- AWS CLI Command Reference: iam create-open-id-connect-provider - https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- AWS IAM User Guide: Obtain the thumbprint for an OpenID Connect identity provider - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- AWS IAM User Guide: IAM and AWS STS condition context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS IAM User Guide: Methods to assume a role - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage-assume.html
- AWS IAM User Guide: Update settings for a role - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-settings.html
- AWS STS API Reference: AssumeRoleWithWebIdentity - https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- Terraform AWS Provider: aws_iam_openid_connect_provider - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- aws-actions/configure-aws-credentials README and action metadata - https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The AWS CLI and Terraform OIDC provider examples used a hard-coded GitHub TLS thumbprint. Current AWS behavior and the Terraform AWS Provider support creating the GitHub OIDC provider without manually pinning this thumbprint, and AWS relies on trusted root CAs for providers such as GitHub. Removed the stale thumbprint from the examples.
- The complete Terraform example referenced `var.deployment_bucket` without declaring it. Added the missing `deployment_bucket` variable.
- The session customization section described `role-session-name` as adding session tags. The AWS credentials action does not apply session tags when using OIDC/web identity. Changed the section to describe session names instead.
- The session duration comment implied a flat 12-hour maximum. AWS allows up to the IAM role's configured maximum session duration, which can range from 1 to 12 hours. Updated the wording.
- The OIDC debug snippet decoded the JWT payload with `base64 -d`, which is unreliable for base64url-encoded JWT segments. Replaced it with a Node.js `Buffer.from(..., 'base64url')` decoder available on GitHub-hosted runners.
- The cross-account role chaining section only showed the target role trust policy. Added the required source-role identity policy allowing `sts:AssumeRole` on the target role.

## Review Notes
The examples use `aws-actions/configure-aws-credentials@v4`, which is still a valid pinned major version, although the upstream action has newer major versions. The trust policy examples using default `sub` claim formats are correct for existing repositories using GitHub's default subject format; newer immutable subject claim behavior may require matching the repository's actual subject format.
