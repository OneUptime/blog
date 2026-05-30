# Validation Summary: How to Use Azure Network Watcher to Diagnose VM Connectivity Problems

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Network Watcher
- Azure CLI
- Azure Virtual Machines
- Network Security Groups
- Azure routing and next hop diagnostics
- Virtual Network Flow Logs
- Traffic Analytics and Log Analytics KQL
- Packet Capture
- VPN gateway troubleshooting

## Sources Consulted
- Azure Network Watcher overview: https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-overview
- Azure CLI `az network watcher` reference: https://learn.microsoft.com/en-us/cli/azure/network/watcher
- Azure CLI `az network watcher flow-log` reference: https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log
- Manage virtual network flow logs: https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-manage
- Manage NSG flow logs: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-manage
- Traffic Analytics schema: https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics-schema
- Manage packet captures with Azure Network Watcher: https://learn.microsoft.com/en-us/azure/network-watcher/packet-capture-manage
- How network security groups filter network traffic: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- Azure CLI VPN troubleshoot documentation: https://learn.microsoft.com/en-us/azure/network-watcher/vpn-troubleshoot-cli

## Issues Found
- The post recommended creating NSG flow logs in a 2026-dated article. Microsoft documentation states NSG flow logs cannot be created after June 30, 2025 and should be replaced with virtual network flow logs for new deployments. Updated Tool 4 to use Virtual Network Flow Logs and the current `az network watcher flow-log create --vnet` example.
- The Log Analytics queries used the NSG flow logs Traffic Analytics table `AzureNetworkAnalytics_CL`. Virtual network flow logs use `NTANetAnalytics`, with unsuffixed field names such as `SrcIp`, `DestIp`, `FlowStatus`, `BytesDestToSrc`, and `BytesSrcToDest`. Updated both KQL examples.
- The `az network watcher test-connectivity` examples used `--protocol TCP`; the current Azure CLI reference lists protocol values as `Tcp`, `Http`, `Https`, and `Icmp`. Updated the examples to `Tcp`.
- The VPN troubleshoot example omitted `--resource-type`, which is needed to distinguish `vnetGateway` from `vpnConnection` when using a resource name. Added `--resource-type vnetGateway`.
- The Network Watcher enablement description was too loose. Updated it to match current Microsoft documentation: Network Watcher is automatically enabled when a virtual network is created or updated unless automatic enablement was previously opted out.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against official Microsoft Learn CLI references rather than local `az --help` output.
