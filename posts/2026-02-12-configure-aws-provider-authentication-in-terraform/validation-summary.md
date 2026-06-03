# Validation Summary: How to Configure AWS Provider Authentication in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform AWS Provider
- AWS IAM
- AWS STS
- AWS CLI
- GitHub Actions OIDC
- ECS task roles and EC2 instance profiles

## Sources Consulted
- HashiCorp Terraform AWS Provider authentication and configuration docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- HashiCorp Terraform AWS Provider `aws_iam_openid_connect_provider` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- HashiCorp Terraform provider configuration docs: https://developer.hashicorp.com/terraform/language/providers/configuration
- GitHub Docs, Configuring OpenID Connect in Amazon Web Services: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- AWS IAM User Guide, OIDC provider thumbprints: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- AWS CLI `sts assume-role` command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS CLI configuration and credential file docs: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS Actions `configure-aws-credentials` documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The GitHub OIDC provider Terraform example hard-coded `thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]`. Current AWS provider documentation marks `thumbprint_list` as optional and notes that AWS uses trusted root CAs for GitHub OIDC verification instead of configured thumbprints. I removed the hard-coded thumbprint so the example avoids a brittle certificate value and matches current provider behavior.

## Review Notes
The AWS credential resolution order, environment variable names, shared credentials/profile usage, `assume_role` block arguments, GitHub Actions `id-token: write` permission, `aws-actions/configure-aws-credentials` inputs, aliased provider syntax, and AWS CLI STS debugging commands match the consulted official documentation. The workspace does not have `terraform` or `aws` installed, so CLI execution was verified against official command references rather than local `--help` output.
