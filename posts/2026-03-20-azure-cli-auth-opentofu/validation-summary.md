# Validation Summary: How to Authenticate with Azure Using Azure CLI in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager provider (`hashicorp/azurerm`)
- Azure CLI
- Azure managed identities
- Azure RBAC

## Sources Consulted
- OpenTofu settings documentation: https://opentofu.org/docs/language/settings/
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- AzureRM provider authentication with Azure CLI: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/azure_cli
- AzureRM provider authentication with managed identity: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/managed_service_identity
- AzureRM provider 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- AzureRM provider argument reference: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Azure CLI interactive authentication: https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-interactively?view=azure-cli-latest
- Azure CLI account commands: https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest
- Azure CLI role assignment commands: https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Azure services and resource types supporting managed identities: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/managed-identities-status

## Issues Found
- The managed identity setup text listed `Azure DevOps` alongside Azure resources that can have managed identities enabled directly. I changed this to `such as a VM or ACI` because managed identities are attached to supported Azure resources, and `Azure DevOps` as a general service is too broad and technically misleading.
- The RBAC example used `--assignee` while the placeholder represented a managed identity principal/object ID. I changed the command to use `--assignee-object-id` with `--assignee-principal-type "ServicePrincipal"` to match Azure CLI guidance for object IDs and managed identity role assignment behavior more accurately.
- The user-assigned managed identity provider example referenced `var.managed_identity_client_id`, but the Variables section did not define it. I added the missing variable so the example is internally consistent and usable.

## Review Notes
- AzureRM 4.x requires `subscription_id` for plan/apply, either in the provider block or via `ARM_SUBSCRIPTION_ID`. The post already handled this correctly.
- The post does not need an explicit `use_cli = true` setting for Azure CLI authentication because AzureRM documents `use_cli` as enabled by default.
