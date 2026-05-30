# Validation Summary: How to Set Up Azure NAT Gateway with Multiple Public IP Addresses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure NAT Gateway
- Azure Public IP addresses and Public IP prefixes
- Azure Virtual Network subnets
- Azure Load Balancer outbound connectivity
- Azure Monitor metrics and metric alerts
- Azure CLI

## Sources Consulted
- Microsoft Learn: What is Azure NAT Gateway? https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview
- Microsoft Learn: Source Network Address Translation (SNAT) with Azure NAT Gateway https://learn.microsoft.com/en-us/azure/nat-gateway/nat-gateway-snat
- Microsoft Learn: Azure NAT Gateway metrics and alerts https://learn.microsoft.com/en-us/azure/nat-gateway/nat-metrics
- Microsoft Learn: Troubleshoot Azure NAT Gateway https://learn.microsoft.com/en-us/azure/nat-gateway/troubleshoot-nat
- Microsoft Learn: Manage a public IP address with Azure NAT Gateway https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/configure-public-ip-nat-gateway
- Microsoft Learn: Azure Load Balancer outbound rules https://learn.microsoft.com/en-us/azure/load-balancer/outbound-rules
- Microsoft Learn: Azure Load Balancer outbound SNAT connections https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-outbound-connections
- Microsoft Learn Azure CLI reference: az network nat gateway https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway
- Microsoft Learn Azure CLI reference: az network public-ip https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Microsoft Learn Azure CLI reference: az network public-ip prefix https://learn.microsoft.com/en-us/cli/azure/network/public-ip/prefix
- Microsoft Learn Azure CLI reference: az network vnet subnet https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn Azure CLI reference: az monitor metrics alert https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert

## Issues Found
- The prerequisites incorrectly implied that load balancer outbound rules or instance-level public IPs must be removed before using NAT Gateway. Updated this to the actual compatibility constraint: Basic SKU resources in the subnet are not compatible with NAT Gateway. NAT Gateway takes precedence over load balancer outbound rules and instance-level public IPs for new outbound flows.
- The outbound IP selection section described hash-based source IP selection and same-destination stickiness. Microsoft documentation only states that NAT Gateway dynamically allocates SNAT ports from the shared inventory and advises not to depend on the specific assignment behavior. Updated the explanation to avoid unsupported source IP selection claims.
- The monitoring example queried `SNATConnectionCount` while describing active SNAT usage. Updated it to query `TotalConnectionCount`, which is the active SNAT connection metric. Also corrected the metric descriptions for `SNATConnectionCount`, `TotalConnectionCount`, and `PacketDropCount`.
- The metric alert example used `DroppedPackets` and `--action-group`, which are not the current Azure metric ID or Azure CLI parameter. Updated the condition to `PacketDropCount` and the action group flag to `--action`.
- The NAT Gateway comparison table had outdated or inaccurate entries for Load Balancer outbound idle timeout and instance-level public IP SNAT behavior. Updated the table to reflect current Azure documentation.
- The NAT Gateway detach command used an empty string for `--nat-gateway`. The Azure CLI reference specifies `null` to detach a NAT Gateway, so the command was corrected.
- The post said subnet removal reverts VMs to default outbound access. Updated this to say VMs fall back to the next configured outbound method, if any, because default outbound access is not always available and other explicit methods may exist.
- The common issue about instance-level public IPs blocking NAT Gateway association was incorrect. Replaced it with the Basic SKU resource compatibility issue documented by Microsoft.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI syntax was validated against the official Microsoft Learn Azure CLI reference rather than local `az --help` output.
