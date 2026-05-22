# Validation Summary: How to Use OIDC Authentication for Terraform in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- OpenID Connect (OIDC)
- Terraform
- AWS IAM and STS
- Azure / Microsoft Entra ID
- AzureRM Terraform authentication
- Google Cloud Workload Identity Federation
- Google GitHub Actions authentication

## Sources Consulted
- GitHub Docs: OpenID Connect reference, https://docs.github.com/en/actions/reference/security/oidc
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services, https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- AWS credentials action documentation, https://github.com/aws-actions/configure-aws-credentials
- Terraform AWS provider documentation for `aws_iam_openid_connect_provider`, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Azure Login action documentation, https://github.com/Azure/login
- Azure CLI documentation for `az ad app federated-credential`, https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential
- HashiCorp AzureRM provider OIDC authentication documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_oidc
- HashiCorp Terraform AzureRM backend documentation, https://developer.hashicorp.com/terraform/language/backend/azurerm
- Google Cloud Workload Identity Federation for deployment pipelines, https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google GitHub Actions auth documentation, https://github.com/google-github-actions/auth

## Issues Found
- The post said temporary credentials typically expire after one hour. That is accurate for many AWS STS sessions, but not generally true across GitHub OIDC, Azure, and Google Cloud. Updated the statement to say the expiration depends on the cloud provider and role configuration.
- The AWS Terraform example included hard-coded GitHub OIDC thumbprints. Current AWS action documentation says GitHub OIDC thumbprints are no longer necessary and are ignored when specified, and the current Terraform AWS provider makes `thumbprint_list` optional. Removed the obsolete thumbprint block.
- The Azure workflow used unquoted boolean values for `ARM_USE_OIDC`. GitHub Actions environment values are strings, so the example now uses `"true"` explicitly.
- The Google Cloud workflow used `google-github-actions/auth@v2`. The current official major version is `v3`, so the example now uses `google-github-actions/auth@v3`.
- The OIDC debug snippet decoded the JWT payload with plain `base64 -d`, which can fail for base64url-encoded JWT payloads or missing padding. Updated the snippet to translate base64url characters and add padding before decoding.

## Review Notes
- The broad AWS `iam:*`, `s3:*`, `ec2:*`, Azure `Contributor`, and Google `roles/editor` permissions are valid examples but should be narrowed for real production Terraform workloads.
- "Azure AD" remains understandable in CLI context because the Azure CLI still uses `az ad`, but Microsoft branding is now Microsoft Entra ID.
