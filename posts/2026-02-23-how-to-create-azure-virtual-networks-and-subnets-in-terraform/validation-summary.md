# Validation Summary: How to Create Azure Virtual Networks and Subnets in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Virtual Network
- Azure subnets
- Azure virtual network peering
- Azure service endpoints
- Azure Private DNS zones
- Hub-spoke network architecture

## Sources Consulted
- HashiCorp Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp Terraform 1.3 release announcement: https://www.hashicorp.com/en/blog/terraform-1-3-improves-extensibility-and-maintainability-of-terraform-modules
- Terraform Registry, AzureRM virtual network resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network
- Terraform Registry, AzureRM subnet resource: https://registry.terraform.io/providers/hashicorp/azurerm/3.100.0/docs/resources/subnet
- Terraform Registry, AzureRM virtual network peering resource: https://registry.terraform.io/providers/hashicorp/azurerm/3.103.1/docs/resources/virtual_network_peering
- Terraform Registry, AzureRM private DNS zone virtual network link resource: https://registry.terraform.io/providers/hashicorp/azurerm/4.51.0/docs/resources/private_dns_zone_virtual_network_link.html
- Terraform Registry, AzureRM provider 4.x documentation: https://registry.terraform.io/providers/hashicorp/azurerm/4.20.0/docs
- Microsoft Learn, Azure virtual network peering overview: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn, create/change/delete Azure virtual network peering: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Microsoft Learn, Azure virtual network service endpoints: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview
- Microsoft Learn, Azure Container Registry service endpoints: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-vnet
- Microsoft Learn, Azure Virtual Network FAQ: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq

## Issues Found
- The prerequisites said Terraform 1.0 or later, but the dynamic subnet example uses `optional(...)` object attributes. This feature is generally available in Terraform 1.3, so the prerequisite was changed to Terraform 1.3 or later.
- The provider example pinned `azurerm` to `~> 3.0`. Current AzureRM 4.x requires an explicit subscription ID for plan/apply, so the provider constraint was updated to `~> 4.0` and a `subscription_id` variable was added to the provider configuration.
- The introduction said VNets isolate resources from the public internet. VNets support private isolation, but Azure resources can still be exposed publicly if configured that way, so the wording was changed to "can isolate."
- The introduction said changing network architecture later means migrating workloads. Azure supports some VNet address-space changes, especially for peered VNets with peer sync, but changes can still require readdressing or workload migration. The wording was softened to match current behavior.

## Review Notes
- The Terraform resource names, arguments, service endpoint values, subnet delegation block, peering settings, and Private DNS virtual network link configuration were consistent with official AzureRM provider documentation.
- AzureRM 4.x is current as of this review, but users upgrading existing configurations from 3.x should review the AzureRM 4.0 upgrade guide because other provider behavior changed outside the scope of this post.
- Azure recommends Private Link/private endpoints for many private access scenarios, but service endpoints remain supported for the services shown in the examples.
