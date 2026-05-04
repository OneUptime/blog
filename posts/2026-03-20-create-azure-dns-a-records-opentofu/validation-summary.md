# Validation Summary: How to Create Azure DNS A Records with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Azure DNS (public DNS zones)
- Azure Private DNS (private zones, VNet links)
- HashiCorp `azurerm` Terraform provider (v3.x)
- DNS record types: A, AAAA, alias records

## Sources Consulted
- HashiCorp `azurerm_dns_a_record` resource docs: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/dns_a_record.html.markdown
- HashiCorp `azurerm_private_dns_zone_virtual_network_link` resource docs: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/private_dns_zone_virtual_network_link.html.markdown
- Azure DNS documentation (alias record behavior, zone apex `@` notation)
- RFC 5737 (TEST-NET-3 reserved documentation IP block 203.0.113.0/24)
- RFC 3849 (IPv6 documentation prefix 2001:db8::/32)

## Issues Found
No technical issues found.

Specifically verified:
- `azurerm_dns_zone` and `azurerm_dns_a_record` argument names (`name`, `zone_name`, `resource_group_name`, `ttl`, `records`) are correct.
- `target_resource_id` is supported on `azurerm_dns_a_record` for Azure-native alias records, and is mutually exclusive with `records` (which is consistent with the post's example using only `target_resource_id`).
- `name = "@"` is the correct way to represent the zone apex in Azure DNS.
- `azurerm_private_dns_zone`, `azurerm_private_dns_a_record`, and `azurerm_private_dns_zone_virtual_network_link` arguments (`private_dns_zone_name`, `virtual_network_id`, `registration_enabled`) match the provider documentation exactly.
- `azurerm_dns_aaaa_record` is a valid resource and the example IPv6 address (`2001:db8::1`) is from the documentation prefix.
- `name_servers` attribute on `azurerm_dns_zone` is correct for the `output` block.
- Documentation IP addresses (`203.0.113.x`) are valid TEST-NET-3 reserved space.

## Review Notes
- The post pins the azurerm provider to `~> 3.0`. Provider 4.x has since been released; the resource schemas used here remain compatible, but readers starting fresh today might prefer `~> 4.0`. This is a version recency note rather than a correctness issue.
- The "Alias Record" example references `azurerm_public_ip.frontend.id`, but the `azurerm_public_ip` resource itself is not declared in the snippet. This is acceptable for an illustrative excerpt focused on the A record, but a self-contained example would also include the `azurerm_public_ip` resource.
- The "Private DNS Zone" example references `azurerm_virtual_network.main.id` without showing the VNet resource definition, again acceptable as an illustrative excerpt.
- The TTL of 60 on alias-style or auto-failover records is reasonable; readers should be aware that very low TTLs can increase query volume and cost on high-traffic zones.
