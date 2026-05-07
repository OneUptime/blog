# Validation Summary: How to Configure Azure DNS for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure DNS
- Azure Private DNS
- Azure CLI
- Terraform AzureRM provider
- DNS AAAA records
- IPv6

## Sources Consulted
- Microsoft Learn: Azure DNS zones and records overview - https://learn.microsoft.com/en-us/azure/dns/dns-zones-records
- Microsoft Learn: Manage DNS records in Azure DNS using the Azure CLI - https://learn.microsoft.com/en-us/azure/dns/dns-operations-recordsets-cli
- Microsoft Learn: `az network dns record-set aaaa` - https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set/aaaa?view=azure-cli-lts
- Microsoft Learn: `az network private-dns record-set aaaa` - https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set/aaaa?view=azure-cli-latest
- Microsoft Learn: Azure Private DNS autoregistration - https://learn.microsoft.com/en-us/azure/dns/private-dns-autoregistration
- Microsoft Learn: Reverse DNS for Azure services - https://learn.microsoft.com/en-us/azure/dns/dns-reverse-dns-for-azure-services
- Microsoft Learn: Manage DNS zones in Azure DNS using the Azure CLI - https://learn.microsoft.com/en-us/azure/dns/dns-operations-dnszones-cli
- HashiCorp AzureRM provider: `azurerm_dns_aaaa_record` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/dns_aaaa_record.html.markdown
- HashiCorp AzureRM provider: `azurerm_public_ip` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/public_ip.html.markdown

## Issues Found
- The post incorrectly stated that Azure supports reverse DNS for Azure public IPv6 addresses. I corrected the description, introduction, reverse-DNS section, and conclusion to reflect Microsoft Learn's current guidance that Azure-owned public IPv6 addresses do not support reverse DNS in Azure DNS.
- The reverse-DNS CLI example was not valid for the stated IPv6 scenario. I removed the incorrect `az network public-ip update --reverse-fqdn` example for IPv6 because the underlying feature is unsupported for Azure-owned IPv6 public addresses.
- The Terraform section described the Azure public IPv6 example as "dynamic". I corrected that wording to reflect current AzureRM provider guidance that IPv6 public IPs use static allocation.
- The private DNS wording implied AAAA autoregistration behavior. I corrected that to match Azure Private DNS documentation, which states autoregistration creates A records for VM primary NICs; AAAA records still need to be added manually.
- The verification section used an invalid `dig` example (`dig www.example.com A AAAA`) and a hardcoded Azure nameserver that might not be authoritative for the zone. I replaced those commands with valid `dig` invocations and a query against the actual nameserver assigned to the zone.

## Review Notes
- The Terraform `azurerm_dns_aaaa_record` example is valid as shown if `azurerm_public_ip.app_ipv6` is a statically allocated IPv6 public IP. As a future improvement, the post could also mention Azure DNS alias AAAA records via `target_resource_id`, which are supported by Azure DNS and the AzureRM provider.
