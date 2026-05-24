# Validation Summary: How to Fix Azure Subscription Not Found Error in Terraform

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Terraform
- AzureRM Terraform Provider
- Azure CLI (`az`)
- Azure Subscriptions & Tenants
- Azure RBAC (role assignments)
- HCL configuration

## Sources Consulted
- Microsoft Learn — Azure subscription states: https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/subscription-states
- HashiCorp Terraform Registry — AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Azure CLI reference for `az account` and `az role assignment` commands: https://learn.microsoft.com/en-us/cli/azure/account
- AzureRM provider authentication guides (Azure CLI, Service Principal): https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/azure_cli

## Issues Found
No technical issues found.

All technical content was verified:
- Azure CLI commands (`az account list`, `az account show`, `az account set`, `az login`, `az role assignment list/create`, `az group list`) — flags and usage are correct.
- AzureRM provider environment variable names (`ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`, `ARM_CLIENT_ID`) are correct.
- HCL provider block syntax, including `features {}` requirement and provider aliasing, is correct.
- Data source `azurerm_subscription` with `display_name` and `subscription_id` attributes is valid per provider docs.
- Provider configuration precedence (provider block > environment variables > Azure CLI) is accurately described.
- Subscription state names (Enabled, Warned, PastDue, Disabled, Deleted) match Microsoft's official documentation.
- The `TF_VAR_` environment variable convention for input variables is correct.

## Review Notes
- The list of subscription states is not exhaustive — Microsoft also documents an "Expired" state for canceled subscriptions. This omission isn't an error in the context of this troubleshooting guide.
- Starting with AzureRM provider v4.0 (August 2024), `subscription_id` is effectively required (either in the provider block or via `ARM_SUBSCRIPTION_ID`). The post's emphasis on setting it explicitly aligns with current provider behavior.
- The `grep -r "subscription_id" *.tf` command works but `-r` is redundant when explicit file globs are provided. Minor stylistic point, not a technical error.
