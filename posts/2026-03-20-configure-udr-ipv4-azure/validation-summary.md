# Validation Summary: How to Configure User-Defined Routes for IPv4 in Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Azure
- Azure Virtual Network (VNet)
- Azure User-Defined Routes (UDR) / Route Tables
- Azure CLI (`az network route-table`, `az network vnet subnet`, `az network nic`)
- Network Virtual Appliances (NVA)
- BGP route propagation (VPN Gateway / ExpressRoute)

## Sources Consulted
- Azure CLI reference — `az network route-table`: https://learn.microsoft.com/en-us/cli/azure/network/route-table
- Azure CLI reference — `az network route-table route`: https://learn.microsoft.com/en-us/cli/azure/network/route-table/route
- Azure CLI reference — `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Azure CLI reference — `az network nic`: https://learn.microsoft.com/en-us/cli/azure/network/nic
- Virtual network traffic routing (UDR overview): https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview

## Issues Found
No technical issues found.

Verified items:
- `az network route-table create` flags (`--resource-group`, `--name`, `--location`, `--disable-bgp-route-propagation`) are all valid.
- `az network route-table route create` flags (`--route-table-name`, `--name`, `--address-prefix`, `--next-hop-type`, `--next-hop-ip-address`) are all valid.
- The five next-hop-type values listed (`VirtualNetworkGateway`, `VnetLocal`, `Internet`, `VirtualAppliance`, `None`) match the complete and exact set of `RouteNextHopType` enum values accepted by the CLI/ARM. (Note: `VnetLocal` is the API value for the portal's "Virtual network" label; no separate `VirtualNetwork` value exists.)
- `0.0.0.0/0` default route, `192.168.0.0/16` on-prem prefix, and `10.100.99.0/24` blackhole prefix are syntactically valid IPv4 CIDR blocks.
- `az network vnet subnet update --route-table <name>` correctly associates a route table by name (resolved within the same resource group as the VNet).
- `az network vnet subnet update --remove routeTable` is correct generic-update syntax; the ARM property is camelCase `routeTable`.
- `az network nic show-effective-route-table --output table` is the correct command and supported output format for inspecting effective routes (system + user + BGP).
- The behavioral claim that `--next-hop-type None` blackholes (drops) traffic and that effective routes combine System/User/BGP sources matches official documentation.

## Review Notes
- `--disable-bgp-route-propagation` (boolean) still works, but Microsoft has introduced a newer `--bgp-route-propagation` parameter that accepts `Enabled`/`Disabled` string values. The post's usage remains valid; future revisions could optionally mention the newer form.
- The post correctly notes that BGP route propagation is enabled by default (i.e., `--disable-bgp-route-propagation false`), which matches Azure defaults.
- Minor stylistic observation (not corrected, since out of scope): `az network vnet subnet update --route-table ""` is an alternative to `--remove routeTable` for disassociation; both are valid.
