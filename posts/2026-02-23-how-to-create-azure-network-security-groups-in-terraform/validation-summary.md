# Validation Summary: How to Create Azure Network Security Groups in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Network Security Groups
- Azure Network Security Rules
- Azure subnet NSG associations
- Azure Application Security Groups
- Azure Network Watcher flow logs
- Azure Log Analytics

## Sources Consulted
- HashiCorp AzureRM provider 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- HashiCorp AzureRM provider documentation for `azurerm_network_security_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group
- HashiCorp AzureRM provider documentation for `azurerm_network_security_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_rule
- HashiCorp AzureRM provider documentation for `azurerm_subnet_network_security_group_association`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_network_security_group_association
- HashiCorp AzureRM provider documentation for `azurerm_application_security_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_security_group
- HashiCorp AzureRM provider documentation for `azurerm_network_watcher_flow_log`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_watcher_flow_log
- Microsoft Learn Azure Network Security Groups overview and management documentation: https://learn.microsoft.com/en-us/azure/virtual-network/manage-network-security-group
- Microsoft Learn Application Security Groups overview: https://learn.microsoft.com/en-us/azure/virtual-network/application-security-groups
- Microsoft Learn NSG flow logs retirement notice: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-manage
- Microsoft Learn virtual network flow logs documentation: https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-cli

## Issues Found
- The post pinned AzureRM to `~> 3.0` while also covering flow-log guidance that is outdated for new Azure deployments. Updated the provider constraint to `~> 4.0` and added the required `subscription_id` provider configuration variable for AzureRM 4.x.
- The post recommended creating NSG flow logs with `network_security_group_id`. Microsoft has retired new NSG flow-log creation after June 30, 2025, and the current AzureRM provider uses `target_resource_id` for Network Watcher flow logs. Updated the section to use virtual network flow logs with `target_resource_id = data.azurerm_virtual_network.main.id`.
- The Application Security Groups description said ASGs group VMs directly. Azure documents ASGs as containing network interfaces. Updated the wording to say VM network interfaces.
- The monitoring section said NSGs drop traffic when rules do not match. Azure applies default NSG rules when no custom rule matches, including default allow and deny rules. Updated the wording to say traffic is dropped when rules deny it.

## Review Notes
- The standalone NSG, rule, subnet association, ASG, dynamic rule, output, storage account, Log Analytics, and Network Watcher examples were reviewed against current AzureRM provider schemas and Microsoft Learn documentation.
- The snippets are illustrative and reference existing Azure resources by name, so they were not applied against a live Azure subscription.
