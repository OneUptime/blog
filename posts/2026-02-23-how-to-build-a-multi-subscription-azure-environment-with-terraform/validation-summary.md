# Validation Summary: How to Build a Multi-Subscription Azure Environment with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure management groups
- Azure Policy
- Azure hub-spoke networking
- Azure Monitor and Log Analytics
- Microsoft Defender for Cloud

## Sources Consulted
- HashiCorp Terraform Registry, `azurerm_management_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_group
- HashiCorp Terraform Registry, `azurerm_management_group_policy_assignment`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_group_policy_assignment
- HashiCorp Terraform Registry, `azurerm_policy_set_definition`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/policy_set_definition
- HashiCorp Terraform Registry, `azurerm_virtual_network_peering`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering
- HashiCorp Terraform Registry, `azurerm_firewall`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/firewall
- HashiCorp Terraform Registry, `azurerm_virtual_network_gateway`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- HashiCorp Terraform Registry, `azurerm_monitor_diagnostic_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- HashiCorp Terraform Registry, `azurerm_security_center_workspace`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_workspace
- Microsoft Learn, Azure Resource Manager tag policies: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-policies
- Microsoft Learn, Azure Policy overview: https://learn.microsoft.com/en-us/azure/governance/policy/overview
- Microsoft Learn, Azure SQL built-in policy definitions: https://learn.microsoft.com/en-us/azure/azure-sql/database/policy-reference
- Microsoft Learn, Azure networking built-in policy definitions: https://learn.microsoft.com/en-us/azure/networking/policy-reference
- Microsoft Learn, Azure Monitor subscription diagnostic settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings/subscription
- AzAdvertizer Azure Policy reference for built-in policy IDs: https://www.azadvertizer.net/azpolicyadvertizer/

## Issues Found
- The `Require CostCenter tag on resources` assignment used a malformed built-in policy definition ID. I changed it to the current `Require a tag on resources` policy ID (`871b6d14-10aa-478d-b590-94f262ecfa99`).
- The production public IP policy used the `Not allowed resource types` built-in policy but did not pass the required resource-type parameter. I added `listOfResourceTypesNotAllowed = ["Microsoft.Network/publicIPAddresses"]`.
- The storage account policy comment described encryption, but the referenced built-in policy enforces secure transfer over HTTPS. I changed the comment to secure transfer and added the `effect = "Deny"` parameter so the assignment actually requires it.
- The custom policy initiative had reference IDs that did not match the referenced built-in policies. I renamed the references to match the actual policies for VM disaster recovery auditing, SQL auditing, and Redis SSL auditing.
- The Activity Log diagnostic policy assignment omitted common parameters for the built-in DeployIfNotExists policy and did not grant its managed identity permissions. I added `effect`, `logsEnabled`, and a `Monitoring Contributor` role assignment for the policy identity.
- The subscription vending section claimed the module provisions subscriptions, but the code only configures the active subscription. I changed the wording to say it configures newly created subscriptions, added the current subscription data source, associated it with the requested management group, and used the subscription resource ID for diagnostic settings.

## Review Notes
- The examples are still illustrative snippets and assume supporting resources such as resource groups, subnets, public IP addresses, provider aliases, and reciprocal hub-side peering exist elsewhere in the Terraform configuration.
- Full `terraform validate` was not run because the post contains partial snippets rather than a standalone Terraform module.
