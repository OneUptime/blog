# Validation Summary: How to Set Up Azure Private DNS Zones with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Private DNS
- Azure Private Endpoint / Private Link
- Azure Virtual Network (VNet)
- Azure CLI
- HashiCorp AzureRM provider

## Sources Consulted
- Azure Private DNS zone overview: https://learn.microsoft.com/en-us/azure/dns/private-dns-privatednszone
- Azure Private DNS autoregistration: https://learn.microsoft.com/en-us/azure/dns/private-dns-autoregistration
- Azure Private DNS records overview: https://learn.microsoft.com/en-us/azure/dns/dns-private-records
- Azure Private Endpoint DNS integration scenarios: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration
- Azure Private Endpoint private DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Azure CLI `az network private-dns record-set`: https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set?view=azure-cli-latest
- AzureRM `azurerm_private_dns_zone_virtual_network_link`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_dns_zone_virtual_network_link.html.markdown
- AzureRM `azurerm_private_dns_zone`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_dns_zone.html.markdown
- AzureRM `azurerm_private_dns_a_record`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_dns_a_record.html.markdown
- AzureRM `azurerm_private_dns_cname_record`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_dns_cname_record.html.markdown
- AzureRM `azurerm_private_dns_srv_record`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_dns_srv_record.html.markdown
- AzureRM `azurerm_private_endpoint`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_endpoint.html.markdown

## Issues Found
- The post incorrectly stated that only one VNet per Private DNS zone can have `registration_enabled = true`. I corrected Step 4 and the conclusion to match Azure's documented behavior: a VNet can be linked to only one autoregistration-enabled private DNS zone, but a private DNS zone can have multiple registration-enabled VNet links.
- The comment describing the service-zone map as "Required Private DNS zones for Azure services" was too broad. I changed it to clarify that the example lists recommended zone names for selected services.
- The Private Endpoint comments used "auto-register" language that overlaps with Azure Private DNS VM autoregistration. I changed the wording to reflect the documented `private_dns_zone_group` behavior: it associates the private endpoint with the private DNS zone and lets Azure manage the endpoint's DNS records.

## Review Notes
- The HCL resource names, arguments, and the `az network private-dns record-set list` command are technically valid as written.
- The examples assume Azure public cloud zone names. Recommended Private DNS zone names vary in sovereign clouds.
- If a VNet uses custom DNS servers, linked private DNS zones are not queried automatically; Azure documents Azure DNS Private Resolver or conditional forwarding as the supported pattern.
- Azure Private DNS autoregistration applies to virtual machines and automatically creates A records for the primary NIC only.
