# Validation Summary: How to Manage Multiple Azure Subscriptions with Provider Aliases in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager
- AzureRM provider
- Azure subscriptions
- Virtual network peering
- Service principal authentication

## Sources Consulted
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu providers-within-modules docs: https://opentofu.org/docs/language/modules/develop/providers/
- AzureRM provider docs index and authentication guidance: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/index.html.markdown
- AzureRM service principal with client secret guide: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/service_principal_client_secret.html.markdown
- AzureRM `azurerm_virtual_network_peering` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_network_peering.html.markdown
- Microsoft Learn: Create virtual network peering across different subscriptions and Microsoft Entra tenants: https://learn.microsoft.com/en-us/azure/virtual-network/create-peering-different-subscriptions

## Issues Found
- The child module example declared `configuration_aliases = [azurerm]`. OpenTofu uses `configuration_aliases` only for alternate provider configuration names inside the child module. In this post, the module receives a parent provider alias as its default `azurerm` provider via the `providers` map, so the `configuration_aliases` line was removed.
- The cross-subscription peering example referenced `azurerm_resource_group.shared` and `azurerm_virtual_network.shared`, but those resources were not defined in the shown configuration. I added the missing shared resource group and shared virtual network definitions so the peering example is self-consistent.

## Review Notes
- The post’s aliased provider pattern is valid for OpenTofu and matches the documented explicit-provider-passing model for child modules.
- The service principal environment variables shown are sufficient when each aliased `azurerm` provider block sets its own `subscription_id`, so omitting `ARM_SUBSCRIPTION_ID` is correct in this scenario.
- The module example pins the AzureRM provider to `~> 4.0`. That is valid for the content shown. AzureRM v5 changes some provider defaults, so the examples should be rechecked if the post is later updated to target v5.
