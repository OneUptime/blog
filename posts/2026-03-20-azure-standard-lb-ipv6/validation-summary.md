# Validation Summary: How to Configure Azure Standard Load Balancer with IPv6 Frontend

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Standard Load Balancer
- Azure Virtual Network dual-stack IPv4/IPv6 networking
- Azure CLI
- Terraform `azurerm` provider
- DNS AAAA records and IPv6 client testing

## Sources Consulted
- Microsoft Learn: Deploy IPv6 dual stack application with Azure Load Balancer - https://learn.microsoft.com/en-us/azure/load-balancer/deploy-ipv4-ipv6-dual-stack-standard-load-balancer
- Microsoft Learn: Overview of IPv6 for Azure Virtual Network - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Azure Load Balancer portal settings - https://learn.microsoft.com/en-us/azure/load-balancer/manage
- Microsoft Learn: `az network lb rule` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/lb/rule?view=azure-cli-lts
- Microsoft Learn: `az network lb frontend-ip` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/lb/frontend-ip?view=azure-cli-latest
- Microsoft Learn: `az network lb probe` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/lb/probe?view=azure-cli-lts
- Microsoft Learn: `az network public-ip` CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-lts
- Terraform Registry: `azurerm_virtual_network` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network
- Terraform Registry: `azurerm_subnet` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- Terraform Registry: `azurerm_lb_rule` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_rule
- Terraform Registry: `azurerm_lb_backend_address_pool` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_backend_address_pool
- Terraform Registry: `azurerm_lb_probe` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_probe

## Issues Found
- The IPv6 subnet prefix in the Terraform example was malformed for a `/64` subnet: `fd00::1:0/64` sets host bits outside the network prefix. It was corrected to `fd00:0:0:1::/64`.
- The post described a single backend pool as handling both IPv4 and IPv6 traffic. Azure's dual-stack load balancer guidance and backend-pool model treat IPv4 and IPv6 associations separately, so the Terraform example was corrected to use distinct IPv4 and IPv6 backend pools and matching rules.
- The Azure CLI example reused a generic backend pool and implied that adding an IPv6 frontend to an existing load balancer was sufficient. It was corrected to target an existing dual-stack-ready deployment, create an IPv6 backend pool, add an IPv6 health probe, and associate the IPv6 rule with that pool.

## Review Notes
- Azure documents that you can't add IPv6 ranges to a virtual network that already has resources in use. For existing IPv4-only deployments, dual-stack backend networking must be prepared before the IPv6 load balancer path will work correctly.
