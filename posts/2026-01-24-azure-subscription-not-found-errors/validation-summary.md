# Validation Summary: How to Fix 'Subscription Not Found' Errors in Azure

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Microsoft Azure
- Azure CLI
- Azure PowerShell
- Terraform AzureRM provider
- Azure SDK for Python
- Azure SDK for JavaScript/Node.js
- Azure DevOps Pipelines
- Bash

## Sources Consulted
- Microsoft Learn: Authenticate to Azure using Azure CLI - https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli
- Microsoft Learn: Sign in with Azure CLI using a service principal - https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-service-principal
- Microsoft Learn: az account reference - https://learn.microsoft.com/en-us/cli/azure/account
- Microsoft Learn: az config reference - https://learn.microsoft.com/en-us/cli/azure/config
- Microsoft Learn: Azure CLI configuration - https://learn.microsoft.com/en-us/cli/azure/azure-cli-configuration
- Microsoft Learn: Set-AzContext - https://learn.microsoft.com/en-us/powershell/module/az.accounts/set-azcontext
- Microsoft Learn: Clear-AzContext - https://learn.microsoft.com/en-us/powershell/module/az.accounts/clear-azcontext
- Microsoft Learn: Get-AzSubscription - https://learn.microsoft.com/en-us/powershell/module/az.accounts/get-azsubscription
- Microsoft Learn: Azure Resource Manager Subscriptions List REST API and SDK sample - https://learn.microsoft.com/en-us/rest/api/resources/subscriptions/list
- Microsoft Learn: azure.identity package for Python - https://learn.microsoft.com/en-us/python/api/azure-identity/azure.identity
- Microsoft Learn: AzureCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2
- HashiCorp Terraform Registry: AzureRM provider documentation - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs

## Issues Found
- The service-principal login snippet used `--password <password-or-cert-path>`, which incorrectly implied certificate authentication can be passed through `--password`. Updated it to use `--password <client-secret>` and added the documented `--certificate <path-to-cert.pem>` form.
- The environment-variable section implied `AZURE_SUBSCRIPTION_ID` overrides Azure CLI subscription context. Updated the section to focus on SDKs, Terraform, and CI tools, and added the relevant `ARM_*` variables used by Terraform.
- The prevention section showed `subscription` under the Azure CLI `[defaults]` config. Current Azure CLI configuration documentation does not list `defaults.subscription`; subscription context should be set with `az account set`. Replaced that snippet with explicit `az account set` verification and kept only documented config keys for output and resource group defaults.
- The "named profiles" wording was inaccurate for Azure CLI. Changed it to local defaults, matching the documented `az config set ... --local` behavior.

## Review Notes
The local environment did not have `az` installed, so Azure CLI commands were verified against Microsoft Learn rather than local `az --help`. The Azure CLI `az config` command group is marked experimental in the official reference, but the documented keys used in the post are current.
