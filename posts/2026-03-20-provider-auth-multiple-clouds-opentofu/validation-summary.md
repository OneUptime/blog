# Validation Summary: Provider Authentication for Multiple Clouds with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- AzureRM Provider for Terraform/OpenTofu
- Google Cloud Provider for Terraform/OpenTofu
- GitHub Actions
- AWS
- Microsoft Azure
- Google Cloud
- Azure CLI
- Google Cloud CLI (`gcloud`)

## Sources Consulted
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu sensitive data in state: https://opentofu.org/docs/language/state/sensitive-data/
- AWS provider authentication and assume role documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources
- AWS S3 bucket resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AzureRM provider authentication overview: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/index
- AzureRM service principal authentication guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret.html
- Azure CLI `az login` reference: https://learn.microsoft.com/en-us/cli/azure/reference-index?view=azure-cli-latest
- Azure subscription selection with Azure CLI: https://learn.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli?view=azure-cli-latest
- Google provider authentication reference: https://registry.terraform.io/providers/hashicorp/google/7.16.0/docs/guides/provider_reference
- `gcloud auth application-default login` reference: https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login
- `aws-actions/configure-aws-credentials` README: https://github.com/aws-actions/configure-aws-credentials
- `azure/login` README: https://github.com/Azure/login
- `google-github-actions/auth` README: https://github.com/google-github-actions/auth
- GitHub Docs, OIDC for AWS: https://docs.github.com/actions/how-tos/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- GitHub Docs, OIDC for Azure: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-azure
- GitHub Docs, OIDC for Google Cloud: https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-google-cloud-platform

## Issues Found
- The provider snippets presented multiple authentication methods as alternatives, but the AWS `assume_role`, Azure service principal fields, and Google `credentials` argument were enabled in a way that prevented the advertised alternative methods from working as shown. I commented the optional auth-specific blocks so the examples now correctly support environment-variable, CLI, and ADC-based authentication paths.
- The Azure provider example mixed provider-block credentials with an Azure CLI workflow. I updated it to use `use_cli = true` for the local-development path and left the service principal fields as optional commented examples.
- The Google Cloud example always set `credentials = file(...)`, which disables the ADC fallback described below it. I changed that line to an optional commented example so ADC via `gcloud auth application-default login` or `GOOGLE_APPLICATION_CREDENTIALS` works as described.
- The GitHub Actions workflow snippet used older action major versions, omitted the required `permissions` block for OIDC, omitted repository checkout, and used secret-based Azure login even though the post recommends OIDC/workload identity in CI/CD. I replaced it with a minimal current workflow using `actions/checkout@v5`, `aws-actions/configure-aws-credentials@v6`, `azure/login@v3`, `google-github-actions/auth@v3`, and `id-token: write`.
- The AWS S3 example used a fixed bucket name, which can fail because S3 bucket names are globally unique. I changed it to `bucket_prefix` so the example is less likely to fail when copied.
- The best-practices note about `sensitive = true` overstated its protection. I corrected it to match OpenTofu behavior: it reduces exposure in plan/apply output, but sensitive values can still be stored in state and must be secured separately.

## Review Notes
- Validated against current provider and action documentation available on 2026-04-24.
- The post does not pin provider versions. The examples are accurate for current documented behavior, but AzureRM and GitHub Action authentication details are version-sensitive and may need another review if the post remains unchanged for a long period.
