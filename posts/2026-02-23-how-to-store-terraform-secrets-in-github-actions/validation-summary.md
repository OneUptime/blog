# Validation Summary: How to Store Terraform Secrets in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- GitHub Actions
- GitHub repository and environment secrets
- GitHub Actions OIDC
- AWS IAM and STS
- Azure Login with OIDC
- Google Cloud Workload Identity Federation
- AWS Secrets Manager
- HashiCorp Vault
- HCP Terraform / Terraform Cloud API tokens

## Sources Consulted
- GitHub Docs: Using secrets in GitHub Actions - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- GitHub Docs: Deployments and environments - https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Docs: OpenID Connect reference - https://docs.github.com/en/actions/reference/security/oidc
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- aws-actions/configure-aws-credentials documentation - https://github.com/aws-actions/configure-aws-credentials
- AWS IAM documentation: OIDC federation and provider thumbprints - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_oidc.html
- Terraform AWS provider documentation: aws_iam_openid_connect_provider - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Azure Login action documentation - https://github.com/Azure/login
- google-github-actions/auth documentation - https://github.com/google-github-actions/auth
- aws-actions/aws-secretsmanager-get-secrets documentation - https://github.com/aws-actions/aws-secretsmanager-get-secrets
- HashiCorp Vault GitHub Action documentation - https://github.com/hashicorp/vault-action
- HashiCorp setup-terraform documentation - https://github.com/hashicorp/setup-terraform
- Terraform CLI configuration documentation - https://developer.hashicorp.com/terraform/cli/config/config-file

## Issues Found
- Updated `hashicorp/setup-terraform` examples from `@v3` to current `@v4`, and refreshed the pinned Terraform version example from `1.7.5` to `1.14.6` based on the current setup-terraform documentation.
- Updated the AWS credentials action example from `aws-actions/configure-aws-credentials@v4` to current `@v6`.
- Replaced the environment-secret claim that "branch protection" ensures only `main` can use production secrets with GitHub's more accurate "deployment branch and tag rules" terminology.
- Removed the hard-coded GitHub OIDC thumbprint from the AWS IAM OIDC provider example. AWS and the current AWS credentials action documentation say thumbprints are no longer necessary for GitHub's OIDC provider and are ignored when specified.
- Added explicit `id-token: write` permission guidance to the Azure and GCP OIDC snippets, and updated their actions to current `azure/login@v3` and `google-github-actions/auth@v3`.
- Fixed the AWS Secrets Manager example so the action creates the exact environment variables referenced by the Terraform step. The original `parse-json-secrets: true` example with unaliased secret names did not reliably produce `TERRAFORM_DATABASE_PASSWORD` and `TERRAFORM_API_KEY`.
- Corrected the Terraform Cloud API token guidance: Terraform CLI workflows must use user or team tokens; organization tokens cannot be used for command-line Terraform actions.

## Review Notes
The examples are technically valid after the fixes. For production workflows, the post correctly says to avoid broad AWS `AdministratorAccess`, but readers should still design least-privilege IAM policies for their specific Terraform state backend and managed resources.
