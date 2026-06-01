# Validation Summary: Set Up Application Security Groups in Azure to Simplify NSG Rule Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Azure Virtual Network
- Azure Application Security Groups
- Azure Network Security Groups
- Azure CLI
- Terraform AzureRM provider

## Sources Consulted
- Microsoft Learn: Application security groups overview - https://learn.microsoft.com/en-us/azure/virtual-network/application-security-groups
- Microsoft Learn: Create, change, or delete Azure network security groups - https://learn.microsoft.com/en-us/azure/virtual-network/manage-network-security-group
- Microsoft Learn: Create, change, or delete Azure network interfaces - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface
- Microsoft Learn: Azure CLI reference for `az network asg` - https://learn.microsoft.com/en-us/cli/azure/network/asg
- Microsoft Learn: Azure CLI reference for `az network nsg rule create` - https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Microsoft Learn: Azure CLI reference for `az network nic ip-config update` - https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config
- Microsoft Learn: Azure CLI reference for `az network vnet subnet update` - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn: Azure subscription and service limits, quotas, and constraints - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- HashiCorp Terraform Registry: AzureRM `azurerm_application_security_group` and `azurerm_network_security_rule` resources - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs

## Issues Found
- Corrected the ASG/NIC VNet constraint. The post said all ASGs associated with a single NIC must be in the same virtual network; Azure documentation states that NICs can be added only to ASGs in the same virtual network and location as the NIC.
- Clarified the ASG membership constraint from VMs to NICs. Azure applies ASG membership through NIC IP configurations, not directly to VM resources.
- Corrected the ASG quota wording from "around 3,000 ASGs per subscription" to "3,000 ASGs per region per subscription" to match Azure networking limits.
- Replaced an inaccurate limitation about single-IP-configuration NICs with the documented limit that ASG membership is configured on a NIC IP configuration and each IP configuration can be associated with up to 20 ASGs.

## Review Notes
The Azure CLI command shapes and flags in the post match current Microsoft Learn CLI references. The Terraform example uses current AzureRM resource arguments for referencing destination application security groups in an NSG rule.
