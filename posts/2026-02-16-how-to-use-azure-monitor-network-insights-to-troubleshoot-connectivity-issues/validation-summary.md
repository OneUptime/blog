# Validation Summary: How to Use Azure Monitor Network Insights to Troubleshoot Connectivity Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Monitor Network Insights
- Azure Network Watcher
- Connection Monitor
- IP flow verify
- Azure Load Balancer
- Azure VPN Gateway
- Azure Application Gateway
- Azure Monitor Logs and KQL
- Virtual network flow logs and Traffic Analytics
- Azure CLI

## Sources Consulted
- Microsoft Learn: View topology in Azure Network Watcher - https://learn.microsoft.com/en-us/azure/network-watcher/network-insights-topology
- Microsoft Learn: Connection monitor overview - https://learn.microsoft.com/en-us/azure/network-watcher/connection-monitor-overview
- Microsoft Learn: Azure CLI `az network watcher connection-monitor` - https://learn.microsoft.com/en-us/cli/azure/network/watcher/connection-monitor
- Microsoft Learn: Azure CLI `az network watcher test-ip-flow` - https://learn.microsoft.com/en-us/cli/azure/network/watcher
- Microsoft Learn: Standard load balancer diagnostics with metrics, alerts, and resource health - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-standard-diagnostics
- Microsoft Learn: Azure Load Balancer monitoring data reference - https://learn.microsoft.com/en-us/azure/load-balancer/monitor-load-balancer-reference
- Microsoft Learn: Supported metrics for Microsoft.Network/loadBalancers - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-loadbalancers-metrics
- Microsoft Learn: Azure CLI `az network vnet-gateway packet-capture` - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway/packet-capture
- Microsoft Learn: Troubleshoot Azure VPN Gateway using diagnostic logs - https://learn.microsoft.com/troubleshoot/azure/vpn-gateway/troubleshoot-vpn-with-azure-diagnostics
- Microsoft Learn: Diagnostic logs for Application Gateway - https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-diagnostics
- Microsoft Learn: AGWAccessLogs table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/agwaccesslogs
- Microsoft Learn: NSG flow logs overview - https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-overview
- Microsoft Learn: Manage virtual network flow logs - https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-cli
- Microsoft Learn: Azure CLI `az network watcher flow-log` - https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log

## Issues Found
- The Connection Monitor CLI example used `--test-frequency-sec`, which is not the current Azure CLI option. Changed it to `--frequency`.
- The NSG flow-log guidance was outdated for a 2026 post. Microsoft states that new NSG flow logs cannot be created after June 30, 2025 and recommends virtual network flow logs. Updated the section and CLI example to use `--vnet` with virtual network flow logs.
- The NSG troubleshooting text implied flow logs directly show exact rule hit counts. Adjusted it to distinguish Traffic Analytics flow visibility from IP flow verify rule decisions.
- The Load Balancer KQL example used a non-current `AzureDiagnostics` category. Replaced it with an `AzureMetrics` query for the `DipAvailability` health probe metric.
- The VPN packet capture CLI example used an invalid command path. Replaced it with `az network vnet-gateway packet-capture start` and the current `--filter` option.
- The Application Gateway KQL example used legacy `AzureDiagnostics` fields. Updated it to the current resource-specific `AGWAccessLogs` table and field names.
- The VPN tunnel alert query filtered on `status_s == "Disconnected"`, but the official diagnostic log guidance identifies `OperationName` values such as `TunnelDisconnected`. Updated the query accordingly.

## Review Notes
The Azure CLI binary was not installed in the local environment, so command verification was done against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
