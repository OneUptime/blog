# Validation Summary: How to Create Azure DNS Zones and Records in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure DNS public zones
- Azure Private DNS zones
- DNS record types: A, AAAA, CNAME, MX, TXT, SRV, NS
- Azure virtual network links for Private DNS

## Sources Consulted
- HashiCorp AzureRM provider documentation: `azurerm_dns_zone` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_zone
- HashiCorp AzureRM provider documentation: `azurerm_dns_a_record` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_a_record
- HashiCorp AzureRM provider documentation: `azurerm_dns_aaaa_record` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_aaaa_record
- HashiCorp AzureRM provider documentation: `azurerm_dns_cname_record` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_cname_record
- HashiCorp AzureRM provider documentation: `azurerm_dns_mx_record` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_mx_record
- HashiCorp AzureRM provider documentation: `azurerm_dns_txt_record` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_txt_record
- HashiCorp AzureRM provider documentation: `azurerm_dns_srv_record` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_srv_record
- HashiCorp AzureRM provider documentation: `azurerm_dns_ns_record` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_ns_record
- HashiCorp AzureRM provider documentation: `azurerm_private_dns_zone` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone
- HashiCorp AzureRM provider documentation: `azurerm_private_dns_a_record` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_a_record
- HashiCorp AzureRM provider documentation: `azurerm_private_dns_zone_virtual_network_link` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone_virtual_network_link
- HashiCorp AzureRM provider documentation overview for provider arguments - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp Terraform `for_each` reference - https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Microsoft Learn: Quickstart to create an Azure DNS zone and A record with Terraform - https://learn.microsoft.com/en-us/azure/dns/dns-get-started-terraform
- Microsoft Learn: Host your domain in Azure DNS - https://learn.microsoft.com/en-us/azure/dns/dns-delegate-domain-azure-dns

## Issues Found
- The provider example used `azurerm` version `~> 3.80`, which excludes current AzureRM 4.x releases. Updated it to `~> 4.0`.
- AzureRM provider 4.x requires `subscription_id` during plan/apply. Added `subscription_id = var.subscription_id` to the provider block and added a matching `subscription_id` variable.

## Review Notes
- Terraform CLI is not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were reviewed against official Terraform and AzureRM provider documentation.
- The record resource arguments, alias-record usage with `target_resource_id`, TXT/MX/SRV nested blocks, Private DNS VNet link configuration, and `for_each` example match the documented schemas.
