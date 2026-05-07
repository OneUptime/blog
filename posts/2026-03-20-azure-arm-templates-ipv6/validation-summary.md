# Validation Summary: How to Configure IPv6 with Azure ARM Templates

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Resource Manager (ARM) templates
- Bicep
- Azure Virtual Network
- Azure Network Interface resources
- Azure Load Balancer
- Azure Public IP addresses
- Azure CLI
- IPv6 and dual-stack networking

## Sources Consulted
- Microsoft Learn: What is IPv6 for Azure Virtual Network? https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Configure IP addresses for an Azure network interface https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses
- Microsoft Learn: Azure Virtual Network FAQ https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq
- Microsoft Learn: Microsoft.Network/virtualNetworks 2022-07-01 template reference https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2022-07-01/virtualnetworks
- Microsoft Learn: Microsoft.Network/networkInterfaces 2022-07-01 template reference https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2022-07-01/networkinterfaces
- Microsoft Learn: Microsoft.Network/loadBalancers 2022-07-01 template reference https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2022-07-01/loadbalancers
- Microsoft Learn: Microsoft.Network/publicIPAddresses 2022-07-01 template reference https://learn.microsoft.com/en-us/azure/templates/microsoft.network/2022-07-01/publicipaddresses
- Microsoft Learn: Azure Load Balancer health probes https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Deploy IPv6 dual stack application with Azure Load Balancer https://learn.microsoft.com/en-us/azure/load-balancer/deploy-ipv4-ipv6-dual-stack-standard-load-balancer
- Microsoft Learn: az deployment group https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest
- Microsoft Learn: Conceptual planning for IPv6 networking https://learn.microsoft.com/en-us/azure/architecture/networking/guide/ipv6-ip-planning

## Issues Found
- The load balancer ARM example referenced `pip-lb-ipv4` in `frontend-ipv4` but did not declare that public IP resource. I added the missing IPv4 public IP resource and included it in `dependsOn` so the template is internally consistent.
- The load balancer ARM example defined a load-balancing rule without a referenced health probe. I added a TCP probe and attached the rule to it so the example follows Azure Load Balancer’s documented rule/probe model.
- The conclusion said ARM templates and Bicep support "all Azure IPv6 resources," which overstates current Azure IPv6 coverage. I narrowed that sentence to "Azure IPv6-enabled networking resources" to match Azure’s documented scope.

## Review Notes
- The examples use the `2022-07-01` Network API version. This is not the newest API version listed in Microsoft Learn as of 2026-05-07, but it remains a documented and supported version rather than a deprecated one.
- The VNet and subnet examples use valid dual-stack `addressPrefixes` arrays, and the IPv6 subnets use `/64`, which matches Azure’s documented IPv6 subnet requirement.
- The NIC example keeps IPv4 as the primary configuration and adds IPv6 as a secondary configuration, which aligns with Azure’s requirement that a NIC include at least one IPv4 IP configuration.
