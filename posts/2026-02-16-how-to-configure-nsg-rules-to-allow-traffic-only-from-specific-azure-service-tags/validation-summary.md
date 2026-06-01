# Validation Summary: Configure NSG Rules to Allow Traffic Only from Specific Azure Service Tags

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Network Security Groups
- Azure Service Tags
- Azure CLI
- Terraform AzureRM provider
- Azure Policy
- Azure Private Link
- Azure Firewall

## Sources Consulted
- Microsoft Learn: Azure service tags overview for virtual network security: https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview
- Microsoft Learn: Azure network security groups overview: https://learn.microsoft.com/en-us/azure/architecture/networking/guide/network-level-segmentation
- Microsoft Learn: Azure CLI `az network nsg rule`: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network list-service-tags`: https://learn.microsoft.com/en-us/cli/azure/network?view=azure-cli-latest
- Microsoft Learn: ARM/Bicep reference for `Microsoft.Network/networkSecurityGroups/securityRules`: https://learn.microsoft.com/en-us/azure/templates/microsoft.network/networksecuritygroups/securityrules
- HashiCorp Terraform Registry: `azurerm_network_security_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_rule

## Issues Found
- The `Internet` Service Tag description said it represented anything outside Azure. Microsoft documents it as internet-reachable IP space outside the virtual network, including Azure-owned public IP space, so the description was corrected.
- The post said the second `az network list-service-tags` command downloaded the Service Tag JSON file, but the command only queries metadata from the Service Tag Discovery API. The text and comment were corrected to describe metadata inspection.
- The limitation about combining Service Tags with IP addresses was too broad. Azure NSG rules cannot specify multiple service tags or mix a service tag with IP ranges in the same source or destination field, while separate source and destination fields can independently use valid values. The wording was corrected.
- The Azure Policy example intended to audit hardcoded IPs, but the original condition audited rules that did not look like hardcoded CIDR prefixes. The rule was changed to audit source or destination prefixes that look like IPv4 prefixes.

## Review Notes
The Azure CLI and Terraform examples use current parameter and field names. Regional Service Tag examples such as `Storage.EastUS`, `Sql.EastUS`, and `AzureKeyVault.EastUS` match Microsoft documentation showing those tags support regional scope. The local environment did not have Azure CLI or Terraform installed, so command validation was performed against official documentation rather than local execution.
