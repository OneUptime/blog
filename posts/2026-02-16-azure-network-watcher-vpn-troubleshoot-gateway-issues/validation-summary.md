# Validation Summary: How to Use Azure Network Watcher VPN Troubleshoot to Diagnose Gateway Issues

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Network Watcher VPN troubleshoot
- Azure VPN Gateway
- Azure CLI
- Azure Storage
- Azure Monitor metrics and alerts
- IPsec/IKE and BGP troubleshooting

## Sources Consulted
- Microsoft Learn: Azure CLI `az network watcher troubleshooting` reference - https://learn.microsoft.com/en-us/cli/azure/network/watcher/troubleshooting?view=azure-cli-latest
- Microsoft Learn: Troubleshoot VPN virtual network gateways and connections using the Azure CLI - https://learn.microsoft.com/en-us/azure/network-watcher/vpn-troubleshoot-cli
- Microsoft Learn: VPN troubleshoot overview - https://learn.microsoft.com/en-us/azure/network-watcher/vpn-troubleshoot-overview
- Microsoft Learn: Azure CLI `az network vpn-connection` reference - https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network vpn-connection ipsec-policy` reference - https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection/ipsec-policy?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network vnet-gateway` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway?view=azure-cli-latest
- Microsoft Learn: Upgrade a VPN Gateway SKU - https://learn.microsoft.com/en-us/azure/vpn-gateway/gateway-sku-change
- Microsoft Learn: Supported metrics for `microsoft.network/virtualnetworkgateways` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-virtualnetworkgateways-metrics

## Issues Found
- The gateway troubleshooting command used `--resource-type vpnGateway`, which is not an accepted Azure CLI value. Changed it to `vnetGateway` in both the interactive command and the automation script.
- The prerequisites said the storage account must be in the same region as the VPN gateway. Microsoft documents that, for Azure CLI VPN troubleshoot, the VPN Gateway and Storage account need to be in the same resource group. Updated the prerequisite.
- The result example and field descriptions used incorrect API casing and field names: `Unhealthy`, `NoConnection`, and `detail`. Updated them to documented values and fields such as `UnHealthy`, `Authentication`, and `detailed`.
- The post described result categories as `Healthy`, `Unhealthy`, and `Not Run`. Updated this to documented overall health/result code language, including `Healthy`, `UnHealthy`, and `NoFault`.
- The log download example tried to download `IKEErrors.txt` directly from the blob container. Microsoft documents generated zipped troubleshooting logs, with newer gateways using `IkeLogs.txt` instead of `IKEErrors.txt`. Updated the example to download the generated zip and inspect IKE log files inside it.
- The CPU/memory section claimed to check CPU and memory but queried the `TunnelAverageBandwidth` metric. Updated it to read `CPUStats.txt` from the VPN troubleshoot output.
- The gateway resize comment claimed same-generation upgrades are non-disruptive. Microsoft documents minimal downtime for most supported SKU upgrades, with no downtime only for specific same-tier AZ transitions. Updated the comment to avoid overstating the guarantee.
- The BGP alert comment incorrectly referred to P2S connection count. Updated the comment to match the `BgpPeerStatus` metric.
- The introductory checklist overstated VPN Troubleshoot coverage by listing certificate validity, route table consistency, BGP session status, and bandwidth metrics as direct checks. Replaced those with the documented gateway faults, connection faults, and generated troubleshooting logs.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI verification was performed against the current Microsoft Learn Azure CLI reference instead of local `az --help` output.
