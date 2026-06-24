# How to Use Azure Network Watcher for IPv6 Diagnostics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, Network Watcher, Diagnostic, Flow Logs, Troubleshooting

Description: Use Azure Network Watcher tools to diagnose IPv6 connectivity issues, analyze IPv6 flow logs, verify NSG rules for IPv6 traffic, and trace IPv6 packet paths.

## Introduction

Azure Network Watcher provides a suite of diagnostic tools for IPv6 troubleshooting: IP flow verify checks how traffic is evaluated by security rules, connection troubleshoot tests end-to-end connectivity, and flow logs capture IP traffic data. These tools are essential for diagnosing IPv6 connectivity issues without needing to access individual VMs.

## Enable Network Watcher

```bash
# Network Watcher is automatically enabled per region unless you opted out

# Verify it exists
az network watcher list \
    --query "[*].{name:name, region:location, status:provisioningState}"

# Create Network Watcher if not present
az network watcher configure \
    --resource-group NetworkWatcherRG \
    --locations eastus \
    --enabled true
```

## IP Flow Verify

```bash
# Test if traffic is allowed from source to destination
VM_ID=$(az vm show \
    --resource-group "$RG" \
    --name vm-web-01 \
    --query id --output tsv)

NIC_ID=$(az vm show \
    --resource-group "$RG" \
    --name vm-web-01 \
    --query "networkProfile.networkInterfaces[0].id" \
    --output tsv)

# Verify inbound HTTP traffic to the VM
az network watcher test-ip-flow \
    --direction Inbound \
    --protocol TCP \
    --local "10.0.0.4:80" \
    --remote "198.51.100.10:*" \
    --nic "$NIC_ID" \
    --vm "$VM_ID"

# Output shows:
# access: Allow (or Deny)
# ruleName: The NSG rule that made the decision
```

## Connection Troubleshoot

```bash
# Test connectivity between two VMs
SOURCE_VM_ID=$(az vm show \
    --resource-group "$RG" \
    --name vm-source \
    --query id --output tsv)

DEST_VM_ID=$(az vm show \
    --resource-group "$RG" \
    --name vm-dest \
    --query id --output tsv)

az network watcher test-connectivity \
    --source-resource "$SOURCE_VM_ID" \
    --dest-resource "$DEST_VM_ID" \
    --dest-port 80 \
    --protocol TCP

# The output shows:
# connectionStatus: Reachable/Unreachable
# avgLatencyInMs: Round-trip latency
# hops: Each hop in the path
```

## Enable IPv6 Flow Logs

```bash
# Create storage account for flow logs
az storage account create \
    --resource-group "$RG" \
    --name mystorageflowlogs \
    --sku Standard_LRS \
    --kind StorageV2

STORAGE_ID=$(az storage account show \
    --resource-group "$RG" \
    --name mystorageflowlogs \
    --query id --output tsv)

NSG_ID=$(az network nsg show \
    --resource-group "$RG" \
    --name nsg-web \
    --query id --output tsv)

# New NSG flow logs can't be created after 2025-06-30.
# Update an existing NSG flow log to enable logging and Traffic Analytics.
az network watcher flow-log update \
    --resource-group NetworkWatcherRG \
    --location eastus \
    --name flowlog-web \
    --nsg "$NSG_ID" \
    --storage-account "$STORAGE_ID" \
    --enabled true \
    --format JSON \
    --log-version 2 \
    --retention 7 \
    --traffic-analytics true \
    --workspace "/subscriptions/xxx/resourceGroups/rg-law/providers/Microsoft.OperationalInsights/workspaces/law-main" \
    --interval 10
```

## Analyze IPv6 Flow Logs

```bash
# Flow log JSON format (version 2)
# IPv6 entries contain ":" in source/destination addresses

# Example flow log entry for IPv6:
# "flows": [{
#   "mac": "000D3A....",
#   "flowTuples": [
#     "1234567890,2001:db8::100,fd00:db8::10,50000,80,T,I,A,B,,,,"
#     # timestamp, src_ip, dst_ip, src_port, dst_port, protocol, direction, action, flow_state, packets_sent, bytes_sent, packets_received, bytes_received
#   ]
# }]
```

## Terraform Flow Logs with Traffic Analytics

```hcl
# network_watcher.tf

data "azurerm_network_watcher" "main" {
  name                = "NetworkWatcher_eastus"
  resource_group_name = "NetworkWatcherRG"
}

resource "azurerm_network_watcher_flow_log" "web" {
  network_watcher_name = data.azurerm_network_watcher.main.name
  resource_group_name  = data.azurerm_network_watcher.main.resource_group_name
  name                 = "flowlog-web"

  # Existing NSG flow logs only. New NSG flow logs can't be created after 2025-06-30.
  target_resource_id = azurerm_network_security_group.web.id
  storage_account_id = azurerm_storage_account.flow_logs.id
  enabled            = true
  version            = 2

  retention_policy {
    enabled = true
    days    = 7
  }

  traffic_analytics {
    enabled               = true
    workspace_id          = azurerm_log_analytics_workspace.main.workspace_id
    workspace_region      = azurerm_log_analytics_workspace.main.location
    workspace_resource_id = azurerm_log_analytics_workspace.main.id
    interval_in_minutes   = 10
  }
}
```

## Query IPv6 Traffic in Log Analytics

```kusto
// KQL query for IPv6 traffic in NSG flow logs in Log Analytics
AzureNetworkAnalytics_CL
| where TimeGenerated > ago(1h)
| where SrcIP_s contains ":" or DestIP_s contains ":"  // IPv6 addresses
| summarize count() by SrcIP_s, DestIP_s, DestPort_d, FlowDirection_s, FlowStatus_s
| order by count_ desc
| take 20
```

## Conclusion

Azure Network Watcher's IP flow verify tool (`az network watcher test-ip-flow`) tests whether specific traffic is allowed by NSGs, returning the exact rule name that permits or denies the traffic. Connection troubleshoot tests end-to-end reachability between VMs. Existing NSG flow logs capture IPv6 traffic alongside IPv4, identifiable by the `:` in IP addresses, but new NSG flow logs can't be created after June 30, 2025. Use Log Analytics KQL queries with `SrcIP_s contains ":"` to filter IPv6 flows for security and performance analysis.
