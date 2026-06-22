# Validation Summary: How to Configure Azure Virtual Network

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Network
- Azure CLI
- Terraform AzureRM provider
- Network Security Groups
- VNet peering
- Azure Private Endpoint and Private DNS
- Azure route tables and user-defined routes
- Azure Network Watcher
- Azure DDoS Protection

## Sources Consulted
- Microsoft Learn: Azure CLI `az network vnet` - https://learn.microsoft.com/en-us/cli/azure/network/vnet?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network vnet subnet` - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network nsg rule` - https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network private-endpoint` - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network private-endpoint dns-zone-group` - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network route-table route` - https://learn.microsoft.com/en-us/cli/azure/network/route-table/route?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network watcher` - https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest
- Microsoft Learn: Azure network security groups overview - https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure virtual network traffic routing - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
- Microsoft Learn: Azure Virtual Network peering - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn: Azure DDoS Protection overview - https://learn.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview
- Microsoft Learn: Virtual Network flow logs - https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-overview
- Terraform Registry: `azurerm_subnet` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- Terraform Registry: `azurerm_network_security_group` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group

## Issues Found
- The architecture diagram showed Azure SQL directly inside the database subnet. Azure SQL Database is a PaaS service reached through a private endpoint NIC in the subnet, so the diagram now shows a SQL Private Endpoint in the subnet connected to Azure SQL.
- The introduction said every managed service needs a network home. Many Azure managed services can operate without VNet integration, so the wording now says many container or managed service deployments need a network home.
- The Terraform NSG example said the outbound deny rule applied to the app tier, but the NSG shown is associated with the web subnet. The comment now says web tier.
- The private endpoint DNS command comment said it created a DNS record. The command creates a private endpoint DNS zone group association; the comment now reflects that.
- The troubleshooting section suggested gateway transit settings as the fix for asymmetric routing with a load balancer. Gateway transit is for using a peered VNet gateway, not general load balancer return-path troubleshooting, so the note now points to UDRs, NSGs, health probes, and return path.
- The security checklist used the older "DDoS Protection Standard" name. Microsoft documentation now refers to Azure DDoS Network Protection, so the checklist was updated.
- The checklist said never put databases in subnets with public IP addresses. Because Azure SQL Database is not placed directly in a customer subnet, this now specifically refers to database VMs.

## Review Notes
Azure CLI and Terraform snippets were reviewed for current command/resource names and argument usage. The local environment does not have `az` or `terraform` installed, so command verification was performed against official documentation rather than local help output.
