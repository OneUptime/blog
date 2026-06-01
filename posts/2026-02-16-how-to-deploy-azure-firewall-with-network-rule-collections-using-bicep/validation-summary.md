# Validation Summary: How to Deploy Azure Firewall with Network Rule Collections Using Bicep

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Firewall
- Azure Firewall Policy
- Azure Firewall network rule collections
- Azure Firewall application rule collections
- Azure Virtual Network and subnets
- Azure Public IP addresses
- Azure Route Tables
- Azure Bicep
- Azure CLI

## Sources Consulted
- Microsoft Learn: Microsoft.Network/firewallPolicies 2024-01-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2024-01-01/firewallpolicies
- Microsoft Learn: Microsoft.Network/firewallPolicies/ruleCollectionGroups 2024-01-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2024-01-01/firewallpolicies/rulecollectiongroups
- Microsoft Learn: Microsoft.Network/azureFirewalls 2024-01-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2024-01-01/azurefirewalls
- Microsoft Learn: Microsoft.Network/virtualNetworks 2024-01-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2024-01-01/virtualnetworks
- Microsoft Learn: Microsoft.Network/publicIPAddresses 2024-01-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2024-01-01/publicipaddresses
- Microsoft Learn: Microsoft.Network/routeTables 2024-01-01 Bicep reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2024-01-01/routetables
- Microsoft Learn: Azure Firewall Management NIC - https://learn.microsoft.com/en-us/azure/firewall/management-nic
- Microsoft Learn: Azure Firewall service tags - https://learn.microsoft.com/en-us/azure/firewall/service-tags
- Microsoft Learn: Azure service tags overview - https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview
- Microsoft Learn: az deployment group CLI reference - https://learn.microsoft.com/en-us/cli/azure/deployment/group

## Issues Found
- The architecture diagram showed a NAT rule collection, but the post does not define or deploy any NAT rule collections. Removed the NAT rule collection node from the diagram so it matches the implementation.
- The VNet sample created `AzureFirewallManagementSubnet`, but the firewall resource did not configure a management IP configuration. Removed the unused management subnet so the sample matches the standard VNet firewall deployment shown in the rest of the post.
- The firewall policy snippet enabled policy `insights` without defining the required Log Analytics workspace configuration for Firewall Policy Insights. Removed the incomplete `insights` block; the production tip still correctly recommends configuring diagnostic logging to Log Analytics.

## Review Notes
The resource API versions and main Bicep property names match the official 2024-01-01 Microsoft.Network template references. The Azure CLI deployment command uses supported `az deployment group create` flags. Azure CLI and the Bicep compiler were not installed in the local environment, so validation was performed against official Microsoft documentation rather than a local compile/deployment.
