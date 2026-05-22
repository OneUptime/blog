# Validation Summary: How to Set Up Terraform Environment Variables for Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform AWS provider
- Terraform AzureRM provider
- Terraform Google provider
- HCP Terraform / Terraform Enterprise CLI credentials
- AWS CLI and STS
- Azure CLI
- Google Cloud CLI
- direnv
- HashiCorp Vault

## Sources Consulted
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform CLI configuration file and environment variable credentials: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform provider plugin signatures: https://developer.hashicorp.com/terraform/cli/plugins/signing
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS SDKs and Tools assume role credential settings: https://docs.aws.amazon.com/sdkref/latest/guide/feature-assume-role-credentials.html
- Terraform AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform AzureRM provider Azure CLI authentication guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/azure_cli
- Terraform AzureRM provider managed identity authentication guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/managed_service_identity
- Terraform AzureRM provider client certificate authentication guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_certificate
- Terraform Google provider configuration reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference
- Google Cloud Terraform authentication documentation: https://cloud.google.com/docs/terraform/authentication

## Issues Found
- The AWS profile explanation said credentials are read only from `~/.aws/credentials`. Updated it to refer to the shared AWS config and credentials files because AWS profiles can also be defined through the shared config file and support more than static credentials.
- The AWS assume-role snippet set only `AWS_ROLE_ARN` and `AWS_ROLE_SESSION_NAME`, which is incomplete without source credentials. Added `AWS_PROFILE` to the example and clarified that Terraform uses source credentials from the normal AWS credential chain to assume the role.
- The core Terraform environment variable section listed `TF_SKIP_PROVIDER_VERIFY`, which is not part of the current Terraform CLI environment variable reference. Replaced it with `TF_PLUGIN_CACHE_MAY_BREAK_DEPENDENCY_LOCK_FILE`, the documented exceptional-use environment variable related to plugin cache lock-file behavior.
- The credential leak check used `grep -r ... *.tf`, which only searches shell-expanded Terraform files in the current directory and can fail when no root-level `.tf` files exist. Replaced it with a recursive `grep -RIn --include='*.tf' -E ... .` command.

## Review Notes
The remaining provider authentication examples align with current official documentation. Azure CLI authentication through `use_cli` is valid, though the AzureRM provider currently defaults `use_cli` to true for provider authentication. The post intentionally uses placeholder credentials and tokens; those examples should remain placeholders only.
