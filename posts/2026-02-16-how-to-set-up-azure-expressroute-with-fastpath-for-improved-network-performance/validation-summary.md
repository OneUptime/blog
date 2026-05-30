# Validation Summary: How to Set Up Azure ExpressRoute with FastPath for Improved Network Performance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure ExpressRoute
- ExpressRoute FastPath
- Azure Virtual Network Gateway
- Azure CLI
- Azure Monitor
- Azure Network Watcher flow logs
- iperf3 and ICMP latency testing

## Sources Consulted
- Azure ExpressRoute FastPath: Features, availability, and limitations: https://learn.microsoft.com/en-us/azure/expressroute/about-fastpath
- Azure CLI `az network vpn-connection` reference: https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection
- Azure CLI `az network vnet-gateway` reference: https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- About ExpressRoute virtual network gateways: https://learn.microsoft.com/en-us/azure/expressroute/expressroute-about-virtual-network-gateways
- Configure a virtual network gateway for ExpressRoute using PowerShell: https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-add-gateway-resource-manager
- Azure Monitor supported metrics for `Microsoft.Network/virtualNetworkGateways`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-virtualnetworkgateways-metrics
- Azure CLI `az monitor diagnostic-settings` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- NSG Flow Logs Overview: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-overview

## Issues Found
- The prerequisites listed only UltraPerformance and ErGw3AZ as supported gateway SKUs. Updated this to include ErGwScale with at least 10 scale units, which is supported for FastPath.
- The circuit requirement incorrectly excluded ExpressRoute Local and framed support as Standard/Premium circuit SKUs. Updated it to match current documentation: FastPath supports ExpressRoute Direct and provider circuits, with advanced features such as VNet peering, UDRs, and Private Link requiring ExpressRoute Direct.
- The gateway upgrade guidance implied any unsupported gateway could be upgraded directly to ErGw3AZ and gave an overly specific 30-60 second downtime estimate. Updated the text to explain SKU-family limits and that family changes require migration or delete-and-recreate workflows.
- The Azure CLI examples used the invalid `--enable-fastpath` option. Replaced it with the current `--express-route-gateway-bypass` option for create, update, and rollback commands.
- The latency validation language promised a round-trip time reduction. Changed it to "may see" because the improvement depends on the circuit, gateway SKU, and traffic path.
- The limitations section incorrectly said VNet peering, UDRs, Private Link, and Basic internal load balancers were not supported. Updated these to the current support model: VNet peering, UDRs, and Private Link are ExpressRoute Direct-only scenarios with additional constraints, and hub VNet internal load balancers are supported while spoke VNet internal load balancers and PaaS services are not.
- The post recommended NSG flow logs for subnet-level visibility. Updated this to recommend virtual network flow logs because new NSG flow logs can no longer be created and NSG flow logs are scheduled for retirement.

## Review Notes
The Azure CLI binary was not installed in the local environment, so CLI option validation was performed against Microsoft Learn's official Azure CLI reference instead of local `az --help` output.
