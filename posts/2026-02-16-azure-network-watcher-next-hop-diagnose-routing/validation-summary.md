# Validation Summary: How to Use Azure Network Watcher Next Hop to Diagnose Routing Problems

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Network Watcher
- Network Watcher Next Hop
- Azure CLI
- Azure virtual network routing
- User-defined routes
- BGP route propagation
- Service endpoint routes
- Network security groups

## Sources Consulted
- Microsoft Learn: Next hop overview - Azure Network Watcher, https://learn.microsoft.com/en-us/azure/network-watcher/next-hop-overview
- Microsoft Learn: Diagnose a VM network routing problem using Azure CLI, https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-routing-problem-cli
- Microsoft Learn: Azure CLI `az network watcher show-next-hop`, https://learn.microsoft.com/en-gb/cli/azure/network/watcher?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network nic show-effective-route-table`, https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-lts
- Microsoft Learn: Azure virtual network traffic routing, https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
- Microsoft Learn: Azure virtual network service endpoints, https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview
- Microsoft Learn: IP flow verify overview - Azure Network Watcher, https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-ip-flow-verify-overview

## Issues Found
- The post described the Azure CLI local VNet next hop as `VirtualNetwork`. Azure CLI and effective route output use `VnetLocal`, so the examples and explanatory text were updated.
- The post said the CLI requires the source VM resource ID and source NIC ID. Azure CLI requires `--vm`, `--source-ip`, and `--dest-ip`; `--nic` is optional and needed for multi-NIC cases. The prerequisite text was corrected and Network Watcher's regional enablement requirement was added.
- The post implied `None` can mean no matching route exists. Azure returns `None` for a matching route whose next hop type is None, including default private-address routes and explicit blackhole routes. The explanation was corrected.
- The automation script queried the whole first NIC object instead of the NIC ID before passing it to `az network nic show --ids`. The query was changed to `networkProfile.networkInterfaces[0].id`.
- The monitoring example used `0.0.0.0` as the destination IP for a Next Hop query. It was changed to `8.8.8.8`, a concrete destination address that exercises the default route behavior.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn CLI reference pages and Azure Network Watcher documentation. The post's high-level routing guidance, route precedence explanation, service endpoint caveat, and recommendation to use IP Flow Verify for NSG checks are consistent with the official documentation.
