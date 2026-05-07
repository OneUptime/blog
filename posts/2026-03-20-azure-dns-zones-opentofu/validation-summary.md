# Validation Summary: How to Create Azure DNS Zones and Records with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager provider (`hashicorp/azurerm`)
- Azure DNS
- Azure Private DNS
- Azure CLI
- HCL

## Sources Consulted
- OpenTofu settings documentation: https://opentofu.org/docs/language/settings/
- AzureRM provider docs overview and authentication notes: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/index
- AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- `azurerm_dns_zone` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_zone.html
- `azurerm_dns_a_record` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_a_record.html
- `azurerm_dns_cname_record` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_cname_record.html
- `azurerm_private_dns_zone` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone.html
- `azurerm_private_dns_a_record` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_a_record.html
- `azurerm_private_dns_zone_virtual_network_link` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone_virtual_network_link.html
- Azure DNS CLI quickstart: https://learn.microsoft.com/en-us/azure/dns/dns-getstarted-cli
- Azure DNS zone management with Azure CLI: https://learn.microsoft.com/en-us/azure/dns/dns-operations-dnszones-cli
- Azure Private DNS CLI quickstart: https://learn.microsoft.com/en-us/azure/dns/private-dns-getstarted-cli
- Azure CLI reference for public CNAME record sets: https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set/cname?view=azure-cli-lts
- Azure CLI reference for private DNS VNet links: https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet?view=azure-cli-lts
- Azure CLI reference for private DNS A record sets: https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set/a?view=azure-cli-lts
- Azure DNS delegation overview: https://learn.microsoft.com/en-us/azure/dns/dns-domain-delegation
- Azure Private DNS autoregistration: https://learn.microsoft.com/en-us/azure/dns/private-dns-autoregistration
- Azure Private DNS overview: https://learn.microsoft.com/en-us/azure/dns/private-dns-privatednszone

## Issues Found
- The original post content did not match the title. It provisioned a resource group, RBAC role assignment, diagnostic settings, and a private endpoint instead of Azure DNS zones and records. I replaced those snippets with the correct Azure DNS resources for a public zone, public A record, public CNAME record, private DNS zone, private DNS virtual network link, and private A record.
- The original provider version guidance was outdated for current AzureRM documentation. I updated the post from `~> 3.0` to `~> 4.0` and kept an explicit `subscription_id`, which is required for `plan` and `apply` in AzureRM v4.
- The original verification step used a generic `az resource show` command and referenced outputs that did not exist. I replaced it with Azure DNS-specific Azure CLI commands for public zones, public records, private zones, private VNet links, and private A records, and I corrected the outputs to match.
- The original prerequisites omitted two practical requirements for the workflow described: a delegated public domain for Azure DNS and an existing virtual network ID for the private DNS link. I added both so the instructions match how Azure DNS actually works.
- The original best-practices section contained guidance that was not specific to Azure DNS, including diagnostic settings, private endpoints, and zone redundancy. I replaced it with DNS-relevant guidance on delegation, TTL strategy, private-zone linking, autoregistration, and tagging.

## Review Notes
- Public DNS zones in Azure become authoritative only after you delegate the domain to the Azure-assigned name servers at your registrar.
- Private DNS records are not resolvable from the public Internet; they resolve only from linked virtual networks or architectures that explicitly forward to them.
- Azure Private DNS autoregistration manages VM host records, not arbitrary private endpoints or every Azure resource type. A single virtual network can have autoregistration enabled against only one private DNS zone.
- This review validated the technical content and syntax against official documentation. It did not apply the configuration against a live Azure subscription in this repository.
