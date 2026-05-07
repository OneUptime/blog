# Validation Summary: How to Configure Azure Network Watcher with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure Network Watcher
- Virtual network flow logs
- Traffic Analytics
- Connection Monitor
- Azure CLI
- Azure Storage Account
- Azure Log Analytics

## Sources Consulted
- Azure Network Watcher overview: https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-overview
- Enable or disable Azure Network Watcher: https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-create
- NSG flow logs overview: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-overview
- Create, change, enable, disable, or delete virtual network flow logs: https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-manage
- Connection Monitor overview: https://learn.microsoft.com/en-us/azure/network-watcher/connection-monitor-overview
- Diagnose a virtual machine network traffic filter problem using Azure CLI: https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-traffic-filtering-problem-cli
- Diagnose a virtual machine network routing problem using Azure CLI: https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-routing-problem-cli
- Packet capture overview: https://learn.microsoft.com/en-us/azure/network-watcher/packet-capture-overview
- Azure CLI `az network watcher` reference: https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest
- Azure CLI `az network watcher packet-capture` reference: https://learn.microsoft.com/en-us/cli/azure/network/watcher/packet-capture?view=azure-cli-latest
- Azure CLI `az provider register` reference: https://learn.microsoft.com/en-us/cli/azure/provider
- Terraform Registry `azurerm_network_watcher_flow_log`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_watcher_flow_log
- Terraform Registry `azurerm_network_connection_monitor`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_connection_monitor
- Terraform Registry `azurerm_network_watcher` data source: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/network_watcher

## Issues Found
- The original post focused on creating new NSG flow logs. Microsoft Learn states that new NSG flow logs could no longer be created after June 30, 2025, so I updated the post to use virtual network flow logs for new deployments and adjusted the conclusion accordingly.
- The flow log examples used the outdated `network_security_group_id` argument. Current AzureRM provider documentation uses `target_resource_id`, so I updated the examples to the current schema.
- The original Network Watcher lookup derived the watcher name from `var.location`, which is brittle because Azure location display names and watcher names do not always line up safely. I changed the example to reference explicit Network Watcher name and resource group variables.
- The post did not call out current prerequisites for virtual network flow logs and connection monitoring. I added Microsoft.Insights provider registration, clarified the need for an existing regional Network Watcher, and documented the Network Watcher Agent requirement for Azure source VMs.
- The `az network watcher test-ip-flow` example used incorrect inbound local/remote port semantics. I corrected the example so the VM local endpoint uses port 443 and the remote endpoint uses a client source port.
- The storage account example did not explicitly declare a general-purpose v2 account. I added `account_kind = "StorageV2"` to match the flow-log retention requirement.

## Review Notes
- As of May 7, 2026, Microsoft documents that new NSG flow logs were blocked after June 30, 2025, and NSG flow logs are scheduled for retirement on September 30, 2027. The revised post now reflects that timeline.
- The AzureRM provider documentation notes that `azurerm_network_watcher_flow_log` creates a storage lifecycle management rule that can overwrite existing rules. The post’s dedicated storage account pattern reduces that risk.
