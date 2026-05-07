# Validation Summary: How to Troubleshoot IPv6 Issues in Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Azure Virtual Network
- IPv6 / dual-stack networking in Azure
- Azure CLI
- Azure Network Watcher
- Network Security Groups (NSGs)
- Azure routing and effective routes
- Azure Private DNS and Azure-provided DNS

## Sources Consulted
- Overview of IPv6 for Azure Virtual Network: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Configure IP addresses for an Azure network interface: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses
- Azure virtual network traffic routing: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
- Diagnose an Azure virtual machine routing problem: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/diagnose-network-routing-problem
- Configure DNS name resolution for Azure virtual networks: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-name-resolution-for-vms-and-role-instances
- Azure CLI `az network nic`: https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest
- Azure CLI `az network watcher`: https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest
- Quickstart: Diagnose a VM traffic filter problem using the Azure CLI: https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-traffic-filtering-problem-cli
- Network Watchers - Verify IP Flow REST API: https://learn.microsoft.com/en-us/rest/api/network-watcher/network-watchers/verify-ip-flow?view=rest-network-watcher-2025-05-01
- Troubleshoot outbound connections / connection troubleshoot: https://learn.microsoft.com/en-us/azure/network-watcher/connection-troubleshoot-manage
- Azure CLI `az network private-dns record-set aaaa`: https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set/aaaa?view=azure-cli-latest
- Azure CLI `az network private-dns link vnet`: https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet?view=azure-cli-lts

## Issues Found
- The `az network watcher test-ip-flow` example was incorrect. The post used undocumented flags like `--local-ip` and `--remote-ip`, and it treated the CLI as if it supported IPv6 tuples directly. Current Microsoft CLI and REST API documentation show `--local` / `--remote` in IPv4:port format, and the REST API explicitly says the local and remote IP fields accept valid IPv4 addresses. I replaced the section with a limitation note so the post no longer gives a non-working IPv6 CLI example.
- The effective-route example and explanation were misleading. The original query surfaced `nextHopIpAddress` and the text said to expect a visible `::/0` route to an internet gateway. Azure’s effective routes are documented in terms of `nextHopType`, `source`, and `state`, and they combine default, user-defined, and BGP-propagated routes. I updated the query and explanation to match Azure’s actual route model.
- The VM-to-VM connectivity test did not explicitly test IPv6. It used `--dest-resource`, which leaves the path ambiguous for a dual-stack check, and it supplied `--resource-group NetworkWatcherRG`, which is unnecessary when full resource IDs are already used. I changed the example to resolve the destination VM’s private IPv6 address and test that address directly with `az network watcher test-connectivity`.
- The DNS example used `nslookup -type=AAAA myvm.internal.cloudapp.net`, which is not the clearest documented way to validate Azure-provided DNS for an IPv6 name-resolution workflow. I changed it to query Azure’s documented resolver address `168.63.129.16` directly for the service name under test.
- The effective-NSG queries filtered only on prefixes containing `:`, which could hide relevant allow or deny rules expressed through service tags or wildcard prefixes. I changed the examples to show the effective rule set directly rather than assuming only literal IPv6 CIDRs matter.

## Review Notes
- `az network watcher test-connectivity` is currently marked Preview in the Azure CLI documentation.
- Azure IPv6 subnets must be exactly `/64`, and Azure doesn’t support IPv6-only VM NICs. Each NIC still needs at least one IPv4 IP configuration. The corrected post is consistent with those platform constraints.
