# Validation Summary: How to Build a Landing Zone with OpenTofu on Azure

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Azure management groups
- Azure Policy
- Azure virtual network peering
- Azure Log Analytics
- Microsoft Defender for Cloud
- OpenTofu / HCL with the AzureRM provider

## Sources Consulted
- HashiCorp AzureRM provider docs for `azurerm_management_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/management_group.html.markdown
- HashiCorp AzureRM provider docs for data source `azurerm_management_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/d/management_group.html.markdown
- HashiCorp AzureRM provider docs for data source `azurerm_client_config`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/d/client_config.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_policy_definition`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/policy_definition.html.markdown
- Microsoft Learn, Azure Policy definition structure basics: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Microsoft Learn, Manage tag governance with Azure Policy: https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/govern-tags
- HashiCorp AzureRM provider docs for `azurerm_management_group_policy_assignment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/management_group_policy_assignment.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_virtual_network_peering`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_network_peering.html.markdown
- Microsoft Learn, Virtual network peering and gateway transit architecture guidance: https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/hybrid-networking/virtual-network-peering
- HashiCorp AzureRM provider docs for `azurerm_log_analytics_workspace`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/log_analytics_workspace.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_security_center_subscription_pricing`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/security_center_subscription_pricing.html.markdown
- Microsoft Learn, Security baselines for Azure: https://learn.microsoft.com/en-us/security/benchmark/azure/security-baselines-overview
- Microsoft Learn, Microsoft cloud security benchmark regulatory compliance initiative details: https://learn.microsoft.com/en-us/azure/governance/policy/samples/azure-security-benchmark

## Issues Found
- The Step 1 hierarchy snippet referenced `data.azurerm_management_group.root` without defining it. I added `azurerm_client_config` and `azurerm_management_group` data sources so the tenant root management group lookup is explicit.
- The custom tag policy was created at subscription scope but assigned at management-group scope. I added `management_group_id = azurerm_management_group.workloads.id` so the custom definition is created where it can be assigned.
- The tag policy used `mode = "All"` even though it targets resource tag enforcement. I changed this to `mode = "Indexed"` to match Azure Policy guidance for resource tag policies and to avoid evaluating non-taggable resource types.
- The benchmark comment used the retired Azure Security Benchmark name. I updated the wording to the current Microsoft cloud security benchmark name.
- The peering example enabled gateway-transit settings without defining a hub VPN or ExpressRoute gateway. I replaced those flags with `allow_forwarded_traffic = true`, which better matches a shared-services hub-and-spoke peering example.
- The Defender for Cloud comment claimed the pricing resources applied across all subscriptions. The `azurerm_security_center_subscription_pricing` resource manages pricing in the current provider subscription, so I corrected the comment.

## Review Notes
- The built-in policy set assignment uses an unversioned built-in initiative ID. Azure Policy built-ins are versioned, so behavior can change as Microsoft updates the initiative.
- The networking and Log Analytics snippets still assume their supporting resource groups are defined elsewhere in the surrounding configuration. None of the referenced argument names or resource types are deprecated in the current AzureRM provider documentation.
