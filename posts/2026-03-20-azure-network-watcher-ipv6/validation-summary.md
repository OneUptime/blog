# Validation Summary: How to Use Azure Network Watcher for IPv6 Diagnostics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Azure Network Watcher
- Azure CLI
- Azure NSG flow logs
- Azure Traffic Analytics / Log Analytics
- Kusto Query Language (KQL)
- Terraform (`hashicorp/azurerm`)

## Sources Consulted
- Azure Network Watcher overview: https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-overview
- Enable or disable Azure Network Watcher: https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-create
- Azure CLI `az network watcher` reference: https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest
- IP flow verify overview: https://learn.microsoft.com/en-us/azure/network-watcher/ip-flow-verify-overview
- Troubleshoot outbound connections with Azure Network Watcher: https://learn.microsoft.com/en-us/azure/network-watcher/connection-troubleshoot-manage
- Connection troubleshoot overview: https://learn.microsoft.com/en-us/azure/network-watcher/connection-troubleshoot-overview
- Manage NSG flow logs: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-manage
- NSG flow logs overview: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-overview
- Azure CLI `az network watcher flow-log` reference: https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log?view=azure-cli-latest
- Traffic analytics schema: https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics-schema
- Terraform Registry `azurerm_network_watcher_flow_log`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_watcher_flow_log

## Issues Found
1. The `az network watcher test-ip-flow` example used non-current CLI flags (`--local-ip`, `--local-port`, `--remote-ip`, `--remote-port`) and an invalid IPv6 literal (`2001:db8:client::1`). I changed it to the current Azure CLI syntax using `--local` and `--remote` in `address:port` format.

2. The `az network watcher test-connectivity` example passed `--resource-group NetworkWatcherRG` while already using VM resource IDs for source and destination. I removed the extra resource group argument so the command matches the documented CLI usage and doesn't imply the VMs must live in `NetworkWatcherRG`.

3. The flow-log section attempted to create a new NSG flow log and used outdated Traffic Analytics flags. Microsoft Learn now documents that new NSG flow logs can't be created after `2025-06-30`, and the current CLI uses `--traffic-analytics`, `--workspace`, and `--interval`. I changed the example to update an existing NSG flow log, added `--log-version 2`, and corrected the flag names.

4. The version 2 flow tuple explanation was incomplete and the IPv6 detection note was too narrow. I corrected `::` to `:` and expanded the tuple comment to include the version 2 flow-state and counter fields that are present in the example record.

5. The Terraform example used the outdated `network_security_group_id` argument. Current provider documentation uses `target_resource_id`, so I updated that field, added `version = 2` to match the later flow-log analysis section, and noted the current NSG flow-log creation limitation.

## Review Notes
- Azure Network Watcher overview says IP flow verify can evaluate IPv4 or IPv6 traffic, but the current Azure CLI reference for `az network watcher test-ip-flow` documents `--local` and `--remote` as IPv4 `address:port` inputs. The post now uses the current CLI syntax; verify portal/API behavior separately before publishing CLI-specific IPv6 packet examples.
- The KQL example is correct for Traffic Analytics on NSG flow logs, which use the `AzureNetworkAnalytics_CL` table. For virtual network flow logs, Traffic Analytics uses `NTANetAnalytics` instead.
- NSG flow logs are still relevant for existing deployments, but Microsoft recommends virtual network flow logs for new deployments because NSG flow logs are retired on `2027-09-30`.
