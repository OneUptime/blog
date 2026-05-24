# Validation Summary: How to Fix Error Building ARM Config in Terraform Azure

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (>= 1.0)
- AzureRM Terraform Provider (~> 3.0)
- Azure CLI (az)
- Azure Resource Manager (ARM)
- Azure Active Directory (Entra ID)
- Bash environment variables (ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_TENANT_ID, ARM_SUBSCRIPTION_ID)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Official AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- AzureRM provider authentication guides: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/azure_cli and .../guides/service_principal_client_secret
- Azure CLI reference: https://learn.microsoft.com/en-us/cli/azure/
- `az account` command reference: https://learn.microsoft.com/en-us/cli/azure/account
- `az login` command reference: https://learn.microsoft.com/en-us/cli/azure/reference-index#az-login
- `az role assignment create` reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Terraform debugging documentation (TF_LOG): https://developer.hashicorp.com/terraform/internals/debugging
- Azure service endpoints documentation for Azure AD and ARM
- Bash parameter expansion (POSIX shell reference) for `${var:0:5}` substring syntax

## Issues Found
1. **Misleading comment about `$()` command substitution behavior**: The original text stated that the issue with `export ARM_SUBSCRIPTION_ID=$(az account show --query id)` was a "trailing newline from command substitution." This is inaccurate — Bash command substitution `$()` actually strips trailing newlines. The real problem is that `az` defaults to JSON output, so the subscription ID is wrapped in literal double-quote characters. Updated the WRONG/CORRECT comments to accurately describe the JSON-quoting issue and explain that `--output tsv` strips those quotes.

## Review Notes
- The Azure CLI minimum version mentioned (2.0.79) appears in the error text quoted from the AzureRM provider's historical error messages and is accurate as a literal quote of that error. Newer AzureRM provider releases (3.x late versions and 4.x) actually require a more recent Azure CLI (e.g., 2.36.0+ or 2.50.0+), but since the post is presenting an error message verbatim, the version string is correct in context.
- The post uses AzureRM provider `~> 3.0`. As of mid-2026, version 4.x is also available; the `features {}` requirement, ARM_ environment variables, and authentication flows shown all remain valid in v4.x as well.
- Azure Active Directory has been rebranded to Microsoft Entra ID, but the technical endpoints (`login.microsoftonline.com`, `graph.microsoft.com`, `management.azure.com`) and CLI behavior remain unchanged.
- All HCL examples are syntactically correct and use current, non-deprecated APIs.
- All Azure CLI commands and flags (`--query`, `--output`, `--service-principal`, `--assignee`, `--scope`, etc.) are correct.
- The bash parameter expansion `${ARM_CLIENT_SECRET:0:5}` is valid POSIX/Bash substring syntax.
- The `curl` and `TF_LOG=DEBUG` debugging steps are accurate.
