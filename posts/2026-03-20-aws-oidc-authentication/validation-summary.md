# Validation Summary: How to Authenticate with AWS Using OIDC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM
- AWS Security Token Service (STS)
- OpenID Connect (OIDC)
- GitHub Actions
- AWS CLI
- OpenTofu / Terraform HCL
- Amazon S3

## Sources Consulted
- AWS CLI, `create-open-id-connect-provider`: https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- AWS IAM, Create an OpenID Connect (OIDC) identity provider in IAM: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- AWS IAM, Obtain the thumbprint for an OpenID Connect identity provider: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- AWS IAM, Create a role for OpenID Connect federation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
- GitHub Docs, Configuring OpenID Connect in Amazon Web Services: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- GitHub Docs, OpenID Connect reference: https://docs.github.com/en/actions/reference/security/oidc
- `aws-actions/configure-aws-credentials` README: https://github.com/aws-actions/configure-aws-credentials
- Terraform Registry, `aws_iam_openid_connect_provider` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_openid_connect_provider
- Terraform Registry, `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform Registry, `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment

## Issues Found
- The AWS CLI example hard-coded a thumbprint. AWS now documents thumbprints as optional when creating OIDC providers with the CLI, and hard-coding one for GitHub can become stale. I removed `--thumbprint-list` and left IAM to retrieve the thumbprint automatically.
- The workflow used `aws-actions/configure-aws-credentials@v4` even though the current official action examples use the v6 release line. I updated the workflow snippet to `@v6`.
- The branch restriction snippet dropped the `aud` check that the earlier trust policy included. I added `token.actions.githubusercontent.com:aud = "sts.amazonaws.com"` so the restricted example preserves the full trust condition.
- The section heading said "Restrict by Branch or Environment", but the example only matched the branch-style `sub` claim. GitHub documents that environment-based workflows use a different subject format, so I narrowed the heading to branch-specific scoping.

## Review Notes
- The main IAM role example is otherwise technically sound: `sts:AssumeRoleWithWebIdentity`, `aud = sts.amazonaws.com`, and `StringLike` on `repo:myorg/myrepo:*` are all valid patterns documented by AWS and GitHub.
- If a workflow uses a GitHub environment, the `sub` claim format changes from `repo:ORG/REPO:ref:refs/heads/BRANCH` to `repo:ORG/REPO:environment:ENVIRONMENT`.
- Local checks: `validation.json` was validated with `jq`. The AWS CLI is not installed in this workspace, so command syntax was verified against the current AWS CLI reference rather than local `--help` output. No live AWS account was available for end-to-end federation testing.
