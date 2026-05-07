# Validation Summary: How to Use AWS Assume Role in the AWS Provider

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- AWS provider for OpenTofu / Terraform
- AWS IAM
- AWS Security Token Service (STS)
- GitHub Actions
- OpenID Connect (OIDC)

## Sources Consulted
- Terraform AWS Provider, provider configuration and assume-role settings: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- OpenTofu, Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- AWS IAM, IAM roles: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html
- AWS IAM, Pass session tags in AWS STS: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- AWS STS, AssumeRoleWithWebIdentity API Reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html
- AWS IAM, Create a role for OpenID Connect federation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
- GitHub Docs, Configuring OpenID Connect in Amazon Web Services: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- `aws-actions/configure-aws-credentials` README: https://github.com/aws-actions/configure-aws-credentials
- Terraform AWS Provider, `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS Provider, `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment

## Issues Found
- The cross-account example used `duration_seconds` inside the provider `assume_role` block. Current AWS provider documentation uses `duration` with a duration string such as `"1h"`, so I corrected the example and the matching conclusion text.
- The introduction treated `assume_role` as the mechanism for GitHub Actions OIDC. The AWS provider distinguishes `assume_role` from `assume_role_with_web_identity`, and GitHub's recommended workflow pattern is often to exchange the OIDC token before OpenTofu runs. I corrected the explanation to separate those cases.
- The GitHub Actions OIDC example implied that GitHub Actions writes a web identity token file for the provider to consume directly. The official `aws-actions/configure-aws-credentials` action instead exchanges the GitHub-provided OIDC token itself and exports temporary AWS credentials. I replaced the provider block and workflow snippet to reflect the supported pattern.
- The GitHub Actions workflow example omitted the required `id-token: write` permission. I added the required permissions block and updated the action version to the current documented `v6.1.0` release line.
- The session tags section did not mention that passing session tags requires the target role trust policy to allow `sts:TagSession`. I added that requirement below the example.

## Review Notes
- The multi-account alias examples are technically valid. OpenTofu allows configurations that use only aliased provider instances as long as every resource explicitly selects one.
- The 1-hour session example is a sensible choice for common CI/CD role-chaining setups, because AWS limits chained role sessions to a maximum of one hour.
- If you use GitHub Actions OIDC directly with an IAM role, AWS now expects the trust policy to scope access with conditions such as `token.actions.githubusercontent.com:aud` and `token.actions.githubusercontent.com:sub`; the post now mentions the OIDC trust requirement but does not go deep into trust-policy hardening.
- Local checks: `validation.json` was validated with `jq`. `tofu` and `terraform` are not installed in this workspace, so runtime validation of the HCL examples was not performed.
