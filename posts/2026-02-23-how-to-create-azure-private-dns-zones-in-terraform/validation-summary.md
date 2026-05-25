# Validation Summary: How to Create Azure Private DNS Zones in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Private DNS zones
- Azure virtual network links
- Azure Private Endpoint DNS integration
- Azure DNS Private Resolver / conditional forwarding

## Sources Consulted
- HashiCorp Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp AzureRM provider documentation for `azurerm_private_dns_zone`: https://registry.terraform.io/providers/hashicorp/azurerm/4.52.0/docs/resources/private_dns_zone
- HashiCorp AzureRM provider documentation for `azurerm_private_dns_zone_virtual_network_link`: https://registry.terraform.io/providers/hashicorp/azurerm/3.19.1/docs/resources/private_dns_zone_virtual_network_link
- HashiCorp AzureRM provider documentation for `azurerm_private_dns_a_record`: https://registry.terraform.io/providers/hashicorp/azurerm/3.62.0/docs/resources/private_dns_a_record
- HashiCorp AzureRM provider documentation for `azurerm_private_dns_txt_record`: https://registry.terraform.io/providers/hashicorp/azurerm/3.47.0/docs/resources/private_dns_txt_record
- Microsoft Learn Azure Private DNS zone overview: https://learn.microsoft.com/en-us/azure/dns/private-dns-privatednszone
- Microsoft Learn Azure Private DNS autoregistration: https://learn.microsoft.com/en-us/azure/dns/private-dns-autoregistration
- Microsoft Learn Azure Private Endpoint private DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn ARM reference for Private DNS virtual network links: https://learn.microsoft.com/en-us/azure/templates/microsoft.network/privatednszones/virtualnetworklinks

## Issues Found
- The post stated that only one VNet link per private DNS zone can have auto-registration enabled. Azure's documented restriction is different: a specific virtual network can be linked to only one private DNS zone when automatic registration is enabled, while multiple virtual networks can link to the same private DNS zone. Updated the inline comment and best-practice wording to match the Azure Private DNS documentation.

## Review Notes
- Terraform CLI was not installed in the review environment, so the examples could not be validated with `terraform validate`. The HCL snippets were reviewed manually against the AzureRM provider resource schemas.
- The post pins AzureRM to `~> 3.80`. AzureRM 4.x is current as of this review, but the shown resource arguments are still valid for the documented AzureRM 3.x provider line used by the post.
