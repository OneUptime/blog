# How to Configure Azure Network Watcher with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Network Watcher, Flow Logs, Diagnostic, Monitoring, Infrastructure as Code

Description: Learn how to configure Azure Network Watcher with OpenTofu to enable NSG flow logs, connection monitoring, and network diagnostic capabilities for your Azure infrastructure.

## Introduction

Azure Network Watcher provides tools to monitor, diagnose, and gain insights into Azure network infrastructure. Key features include flow logs (capture network flows for traffic analysis), Connection Monitor (continuously test connectivity between sources and destinations), IP Flow Verify (test if traffic is allowed or denied by NSG rules), and Packet Capture (capture packets from VMs for deep analysis). By default, Network Watcher is automatically enabled in a region when you create or update a virtual network there, unless automatic enablement was previously disabled for the subscription.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials configured
- Microsoft.Insights resource provider registered
- An existing Network Watcher in the target region
- Virtual networks and VMs to monitor
- Network Watcher Agent installed on Azure source VMs for Connection Monitor and packet capture

## Step 1: Enable Virtual Network Flow Logs

```hcl
# Storage account for flow log data

resource "azurerm_storage_account" "flow_logs" {
  name                     = "${var.project_name}flowlogs"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_kind             = "StorageV2"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = {
    Name    = "${var.project_name}-flow-logs-storage"
    Purpose = "network-flow-logs"
  }
}

# Reference an existing Network Watcher in the target region.
# In auto-enabled subscriptions this is typically NetworkWatcher_<regionName> in NetworkWatcherRG.
data "azurerm_network_watcher" "main" {
  name                = var.network_watcher_name
  resource_group_name = var.network_watcher_resource_group_name
}

resource "azurerm_network_watcher_flow_log" "vnet" {
  network_watcher_name = data.azurerm_network_watcher.main.name
  resource_group_name  = data.azurerm_network_watcher.main.resource_group_name
  name                 = "${var.project_name}-vnet-flow-log"

  # Use a virtual network, subnet, or NIC ID for new flow logs.
  target_resource_id = var.virtual_network_id
  storage_account_id = azurerm_storage_account.flow_logs.id
  enabled            = true
  version            = 2  # Version 2 includes throughput information

  retention_policy {
    enabled = true
    days    = 30  # Keep flow logs for 30 days
  }

  # Send to Log Analytics for Traffic Analytics
  traffic_analytics {
    enabled               = true
    workspace_id          = var.log_analytics_workspace_id
    workspace_region      = var.location  # Workspace must be in the same region as the flow log
    workspace_resource_id = var.log_analytics_workspace_resource_id
    interval_in_minutes   = 10  # 10 or 60 minute aggregation intervals
  }

  tags = {
    Name = "${var.project_name}-vnet-flow-log"
  }
}
```

## Step 2: Connection Monitor

```hcl
# The source Azure VM must already have the Network Watcher Agent VM extension installed.
resource "azurerm_network_connection_monitor" "main" {
  name               = "${var.project_name}-connection-monitor"
  network_watcher_id = data.azurerm_network_watcher.main.id
  location           = var.location

  endpoint {
    name               = "source-vm"
    target_resource_id = var.source_vm_id

    filter {
      item {
        address = var.source_vm_id
        type    = "AgentAddress"
      }
      type = "Include"
    }
  }

  endpoint {
    name    = "destination-sql"
    address = var.sql_server_fqdn
  }

  endpoint {
    name    = "destination-storage"
    address = "${var.storage_account_name}.blob.core.windows.net"
  }

  test_configuration {
    name                      = "tcp-test-sql"
    protocol                  = "Tcp"
    test_frequency_in_seconds = 30

    tcp_configuration {
      port = 1433
    }

    success_threshold {
      checks_failed_percent = 5
      round_trip_time_ms    = 100
    }
  }

  test_configuration {
    name                      = "https-test-storage"
    protocol                  = "Http"
    test_frequency_in_seconds = 60

    http_configuration {
      method = "Get"
      port   = 443
    }

    success_threshold {
      checks_failed_percent = 5
      round_trip_time_ms    = 500
    }
  }

  test_group {
    name                     = "sql-connectivity"
    destination_endpoints    = ["destination-sql"]
    source_endpoints         = ["source-vm"]
    test_configuration_names = ["tcp-test-sql"]
    enabled                  = true
  }

  test_group {
    name                     = "storage-connectivity"
    destination_endpoints    = ["destination-storage"]
    source_endpoints         = ["source-vm"]
    test_configuration_names = ["https-test-storage"]
    enabled                  = true
  }

  output_workspace_resource_ids = [var.log_analytics_workspace_resource_id]

  tags = {
    Name = "${var.project_name}-connection-monitor"
  }
}
```

## Step 3: Flow Logs for Multiple Virtual Networks

```hcl
variable "vnet_ids" {
  description = "Map of virtual network name to virtual network ID"
  type        = map(string)
}

resource "azurerm_network_watcher_flow_log" "all_vnets" {
  for_each = var.vnet_ids

  network_watcher_name = data.azurerm_network_watcher.main.name
  resource_group_name  = data.azurerm_network_watcher.main.resource_group_name
  name                 = "${each.key}-flow-log"
  target_resource_id   = each.value
  storage_account_id   = azurerm_storage_account.flow_logs.id
  enabled              = true
  version              = 2

  retention_policy {
    enabled = true
    days    = 30
  }

  traffic_analytics {
    enabled               = true
    workspace_id          = var.log_analytics_workspace_id
    workspace_region      = var.location
    workspace_resource_id = var.log_analytics_workspace_resource_id
    interval_in_minutes   = 10
  }
}
```

## Step 4: Deploy

```bash
# Register the resource provider required for virtual network flow logs.
az provider register --namespace Microsoft.Insights --wait

tofu init
tofu plan
tofu apply

# IP flow verify - test if inbound HTTPS traffic is allowed to the VM
az network watcher test-ip-flow \
  --vm <vm-id> \
  --direction Inbound \
  --protocol TCP \
  --local 10.0.1.5:443 \
  --remote 203.0.113.1:60000

# Next hop - trace routing path
az network watcher show-next-hop \
  --vm <vm-id> \
  --source-ip 10.0.1.5 \
  --dest-ip 8.8.8.8

# Initiate packet capture (requires the Network Watcher Agent VM extension)
az network watcher packet-capture create \
  --resource-group <rg> \
  --vm <vm-name> \
  --name capture1 \
  --storage-account <sa-name>
```

## Conclusion

Use virtual network flow logs version 2 with Traffic Analytics for new deployments. Azure no longer allows creation of new NSG flow logs, so virtual network flow logs are the supported replacement for monitoring traffic patterns across production virtual networks, subnets, or NICs without requiring packet capture. Traffic Analytics requires a Log Analytics workspace and aggregates flow data every 10 or 60 minutes; use 10-minute intervals for near real-time visibility. Connection Monitor with the Network Watcher agent on Azure source VMs provides end-to-end latency and packet loss measurements to supported Azure and hybrid destinations, making it a strong tool for proactive connectivity monitoring.
