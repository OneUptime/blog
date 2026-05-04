# Validation Summary: How to Configure Network Security Groups for IPv4 Traffic in Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Network Security Groups (NSGs)
- Azure CLI (`az network nsg`, `az network nsg rule`, `az network vnet subnet`, `az network nic`)
- Azure Virtual Networks (VNets) and Subnets
- Azure VM Network Interfaces (NICs)
- IPv4 traffic filtering

## Sources Consulted
- Azure Network Security Groups overview: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview
- Azure CLI `az network nsg rule` reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Azure CLI `az network nsg` reference (verified command structure)
- Azure CLI `az network nic list-effective-nsg` reference (verified command name)

## Issues Found
No technical issues found.

Verified facts:
- NSG priority range of 100–4096 with lower numbers having higher priority is correct.
- NSGs are stateful packet filters (confirmed by Microsoft docs).
- Default rules match the documented values exactly: AllowVnetInBound (65000), AllowAzureLoadBalancerInBound (65001), DenyAllInBound (65500), AllowVnetOutBound (65000), AllowInternetOutBound (65001), DenyAllOutBound (65500).
- Default rules are non-deletable but can be overridden by higher-priority custom rules.
- All `az network nsg rule create` flags used (`--access`, `--direction`, `--protocol`, `--source-address-prefixes`, `--source-port-ranges`, `--destination-address-prefixes`, `--destination-port-ranges`, `--priority`, `--nsg-name`, `--resource-group`, `--name`) are valid current parameters.
- Accepted values for `--access` (Allow/Deny), `--direction` (Inbound/Outbound), and `--protocol` (`*`, Ah, Esp, Icmp, Tcp, Udp) are correct.
- `'*'` is valid as both a source/destination address prefix and source/destination port range.
- `az network vnet subnet update --network-security-group` and `az network nic update --network-security-group` accept an NSG name (when in the same resource group) or full resource ID.
- `az network nic list-effective-nsg` is the correct command for viewing effective merged NSG rules on a NIC.

## Review Notes
- The post uses 203.0.113.10/32 as a source for the SSH allow rule — this is from the TEST-NET-3 documentation range (RFC 5737), an appropriate non-routable example.
- The statement "traffic with no matching rule hits the default deny-all" is a slight simplification: technically default rules (AllowVnet*, AllowInternetOutBound, AllowAzureLoadBalancerInBound) are still rules that apply before DenyAll, so traffic always matches *some* rule. The intent (custom rules + defaults; what isn't allowed is denied) is conveyed correctly.
- The post does not cover Application Security Groups, augmented security rules, or Azure Virtual Network Manager security admin rules, but these are out of scope for an introductory IPv4 NSG tutorial.
