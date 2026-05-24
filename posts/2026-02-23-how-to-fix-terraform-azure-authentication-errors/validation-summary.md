# Validation Summary: How to Fix Terraform Azure Authentication Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HashiCorp)
- AzureRM Provider (hashicorp/azurerm)
- Azure CLI (`az`)
- Azure Service Principals (Microsoft Entra ID)
- Azure Managed Identity (MSI)
- OpenID Connect (OIDC) for GitHub Actions
- GitHub Actions (`azure/login` action)
- Azure RBAC

## Sources Consulted
- Terraform AzureRM Provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Azure CLI reference for `az ad sp`: https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Azure CLI reference for `az role assignment`: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Azure CLI reference for `az vm identity`: https://learn.microsoft.com/en-us/cli/azure/vm/identity
- Azure CLI reference for `az ad app federated-credential`: https://learn.microsoft.com/en-us/cli/azure/ad/app/federated-credential
- Azure Login GitHub Action: https://github.com/Azure/login
- AzureRM provider authentication guides (CLI, Service Principal, MSI, OIDC)

## Issues Found
1. **Outdated GitHub Action version**: The original post referenced `azure/login@v1`, which is no longer the actively maintained version. Updated to `azure/login@v2`, which has been the standard since 2024 and is the version most users should be on.
2. **Outdated AzureRM provider version pin**: The post recommended `version = "~> 3.0"` for the `hashicorp/azurerm` provider. Version 4.0 was released in August 2024, and by 2026 the 4.x line is the current major version supporting all the authentication methods described (OIDC, MSI, Service Principal). Updated to `version = "~> 4.0"`.

## Review Notes
- All Azure CLI commands (`az login`, `az account show`, `az account list`, `az account set`, `az ad sp create-for-rbac`, `az ad sp credential reset`, `az role assignment create/list`, `az vm identity assign/show`, `az ad app federated-credential create`, `az account get-access-token`) are syntactically correct and use current flags/parameters as documented in the official Azure CLI reference.
- The AzureRM provider configuration blocks (`features {}`, `client_id`, `client_secret`, `tenant_id`, `subscription_id`, `use_msi`, `use_oidc`, `alias`) are all valid and correctly named for the 3.x and 4.x provider lines.
- The environment variables (`ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID`) are the correct names used by the AzureRM provider for credential resolution.
- The OIDC federated credential JSON structure (`name`, `issuer`, `subject`, `audiences`) matches what Azure expects for GitHub Actions integration.
- The installation commands for Azure CLI (`brew install azure-cli` on macOS, `curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash` on Debian/Ubuntu) are correct and the URL `https://aka.ms/InstallAzureCLIDeb` is the official Microsoft-published install script alias.
- For AzureRM 4.x, the `subscription_id` argument (or `ARM_SUBSCRIPTION_ID`) became required in most cases — the post already encourages setting it explicitly, which is consistent with that requirement.
- Going forward, readers using AzureRM 4.x with OIDC outside GitHub Actions may want to look into `oidc_token_file_path` and related arguments; the post focuses on the GitHub Actions case, which is fine.
