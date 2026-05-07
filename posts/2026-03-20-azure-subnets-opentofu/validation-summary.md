# Validation Summary: How to Create Subnets with OpenTofu on Azure

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Virtual Network
- Azure subnets
- Azure service endpoints
- Azure subnet delegation
- Azure Network Security Groups
- Azure Kubernetes Service (AKS)
- Azure App Service
- AzureRM provider

## Sources Consulted
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu output values: https://opentofu.org/docs/language/values/outputs/
- AzureRM `azurerm_subnet` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- AzureRM `azurerm_subnet_network_security_group_association` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_network_security_group_association
- Azure App Service virtual network integration overview: https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration
- Enable integration with an Azure virtual network - Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/configure-vnet-integration-enable
- Create node pools with unique subnets in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/node-pool-unique-subnet
- Troubleshoot the `SubnetIsDelegated` error code for AKS: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/error-codes/subnetisdelegated-error
- Add, change, or delete a subnet - Azure Virtual Network: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-subnet
- Private IP addresses in Azure: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/private-ip-addresses
- Azure Virtual Network Integration for Service Network Isolation: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-for-azure-services
- Restrict access to a container registry by using a service endpoint in an Azure virtual network: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-vnet

## Issues Found
- The introduction said App Service plans are deployed into subnets. I changed this to say App Service integrates with delegated subnets, because multi-tenant App Service uses VNet Integration rather than deploying the plan itself into the subnet.
- The service endpoint explanation said service endpoints provide "private access" to Azure PaaS services. I changed this wording to describe secure access to supported Azure PaaS public endpoints from the subnet, which matches Microsoft documentation and avoids conflating service endpoints with Private Link/private endpoints.
- The AKS section heading referred to "Node Pool Delegation," but AKS node pool subnets should not be delegated to another Azure service. I renamed the section to "AKS Node Pool Subnet" to match the actual configuration shown.
- The `/22` sizing comment said the subnet allows up to 1,022 node IPs. I corrected this to 1,019 usable IPs, because Azure reserves five IP addresses in every subnet. I also qualified the note so it does not overstate AKS-specific capacity planning.
- The conclusion said Azure does not allow changing subnet address prefixes after resources are deployed. I changed this to the accurate rule: you must move or delete deployed resources before changing the subnet address range.

## Review Notes
- The AzureRM resource syntax used in the post is current and valid for the latest provider documentation reviewed.
- `Microsoft.ContainerRegistry` is still a supported subnet service endpoint value, but Azure Container Registry documentation notes service endpoints have limitations and recommends private endpoints for many production scenarios.
