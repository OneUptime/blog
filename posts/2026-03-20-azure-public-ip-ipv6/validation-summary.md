# Validation Summary: How to Create Azure Public IPv6 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Public IP addresses
- Azure CLI
- Terraform AzureRM provider
- IPv6 networking on Azure
- Azure-managed public DNS

## Sources Consulted
- Microsoft Learn: Public IP addresses in Azure - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Microsoft Learn: Quickstart: Create a public IP - Azure CLI - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-public-ip-cli
- Microsoft Learn: Quickstart: Create a public IP address prefix using the Azure CLI - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-public-ip-prefix-cli
- Microsoft Learn: Azure CLI reference for `az network public-ip` - https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Microsoft Learn: Azure CLI reference for `az network public-ip prefix` - https://learn.microsoft.com/en-us/cli/azure/network/public-ip/prefix
- Microsoft Learn: Azure CLI reference for `az network nic ip-config` - https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config
- Microsoft Learn: Configure IP addresses for an Azure network interface - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses
- Microsoft Learn REST API: Public IP Prefixes - Get - https://learn.microsoft.com/en-us/rest/api/virtualnetwork/public-ip-prefixes/get
- Microsoft Learn REST API: Public IP Prefixes - Create Or Update - https://learn.microsoft.com/en-us/rest/api/virtualnetwork/public-ip-prefixes/create-or-update
- HashiCorp AzureRM provider docs: `azurerm_public_ip` - https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/public_ip.html.markdown

## Issues Found
- The introduction said Basic SKU still had limited IPv6 support. I changed this because Basic SKU public IPs were retired on September 30, 2025, and current supported guidance is Standard SKU with static IPv6 allocation.
- The IPv6 public IP prefix CLI example omitted an explicit `--location` even though the post defines `LOCATION`. I added `--location "$LOCATION"` so the command does not rely on CLI defaults or implicit context.
- The VM NIC attachment example implied the command alone was enough to attach IPv6 to any NIC. I clarified that the command updates an existing secondary IPv6 NIC IP configuration, which matches Azure's IPv6 NIC model.
- The conclusion recommended `--zone 1 2 3` without the regional caveat. I updated it to specify that this applies in regions that support Availability Zones.

## Review Notes
- Standard SKU public IPs are secure by default. When attached to a VM NIC, inbound traffic still requires appropriate Network Security Group rules.
- Azure supports only one IPv6 private address on a NIC, and it must be on a secondary IP configuration.
- `az` and `terraform` were not installed in this workspace, so command and schema validation was performed against current official documentation rather than local `--help` output.
