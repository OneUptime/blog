# How to Create Azure Log Analytics Workspaces in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Log Analytics, Monitoring, Infrastructure as Code, Azure Monitor

Description: A practical guide to provisioning Azure Log Analytics workspaces with Terraform, including data collection rules, solutions, and workspace configuration.

---

Log Analytics workspaces are the backbone of Azure's monitoring and observability stack. They collect, store, and analyze log and performance data from virtually any Azure resource, on-premises servers, and even other cloud providers. If you are running anything meaningful in Azure, you almost certainly need at least one Log Analytics workspace.

Setting these up through Terraform gives you the ability to standardize your monitoring infrastructure across environments and make sure every deployment follows the same logging configuration. Let us walk through how to do this properly.

## What Is a Log Analytics Workspace?

A Log Analytics workspace is a centralized data store within Azure Monitor. It ingests data from multiple sources - Azure resources, virtual machines, containers, custom applications - and lets you query that data using Kusto Query Language (KQL). It also powers alerts, workbooks, dashboards, and integrations like Microsoft Sentinel for security monitoring.

Each workspace has its own data retention settings, access controls, and pricing tier. Getting the configuration right from the start saves headaches down the road.

## Prerequisites

You will need:

- Terraform 1.3 or later
- An Azure subscription with Contributor access
- Azure CLI configured and authenticated

## Provider Configuration

```hcl
# main.tf - Terraform and provider setup
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Creating a Basic Log Analytics Workspace

Let us start with a straightforward workspace:

```hcl
# Resource group to hold the workspace
resource "azurerm_resource_group" "monitoring" {
  name     = "rg-monitoring-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Create the Log Analytics workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-prod-eastus-001"
  location            = azurerm_resource_group.monitoring.location
  resource_group_name = azurerm_resource_group.monitoring.name

  # PerGB2018 is the standard pay-as-you-go tier
  sku = "PerGB2018"

  # Retention in days (30 is free, up to 730 days)
  retention_in_days = 90

  # Daily ingestion cap in GB (-1 means no cap)
  daily_quota_gb = 10

  # Enable ingestion and query over the internet
  internet_ingestion_enabled = true
  internet_query_enabled     = true

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}
```

The `sku` field accepts several values, but `PerGB2018` is the most common choice for most workloads. The commitment tier options (`CapacityReservation`) make sense when you are ingesting more than 100 GB per day.

## Configuring Workspace with Commitment Tiers

If your organization ingests large volumes of log data, commitment tiers offer significant cost savings:

```hcl
# High-volume workspace with commitment tier pricing
resource "azurerm_log_analytics_workspace" "high_volume" {
  name                = "law-prod-highvol-001"
  location            = azurerm_resource_group.monitoring.location
  resource_group_name = azurerm_resource_group.monitoring.name

  # Use capacity reservation for high-volume workloads
  sku               = "CapacityReservation"
  reservation_capacity_in_gb_per_day = 200

  retention_in_days = 180

  tags = {
    Environment = "Production"
    CostCenter  = "Platform"
  }
}
```

## Adding Log Analytics Solutions

Solutions extend workspace functionality. While many have been superseded by Azure Monitor features, some are still relevant:

```hcl
# Install the Container Insights solution
resource "azurerm_log_analytics_solution" "containers" {
  solution_name         = "ContainerInsights"
  location              = azurerm_resource_group.monitoring.location
  resource_group_name   = azurerm_resource_group.monitoring.name
  workspace_resource_id = azurerm_log_analytics_workspace.main.id
  workspace_name        = azurerm_log_analytics_workspace.main.name

  plan {
    publisher = "Microsoft"
    product   = "OMSGallery/ContainerInsights"
  }
}

# Install the Security and Audit solution (useful for Sentinel)
resource "azurerm_log_analytics_solution" "security" {
  solution_name         = "SecurityInsights"
  location              = azurerm_resource_group.monitoring.location
  resource_group_name   = azurerm_resource_group.monitoring.name
  workspace_resource_id = azurerm_log_analytics_workspace.main.id
  workspace_name        = azurerm_log_analytics_workspace.main.name

  plan {
    publisher = "Microsoft"
    product   = "OMSGallery/SecurityInsights"
  }
}
```

## Data Collection Rules

Data Collection Rules (DCRs) are the modern way to configure what data gets sent to your workspace. They replace the older agent-based configuration:

```hcl
# Create a data collection rule for VM performance counters and syslog
resource "azurerm_monitor_data_collection_rule" "vm_logs" {
  name                = "dcr-vm-perf-syslog"
  location            = azurerm_resource_group.monitoring.location
  resource_group_name = azurerm_resource_group.monitoring.name

  # Define where data should be sent
  destinations {
    log_analytics {
      workspace_resource_id = azurerm_log_analytics_workspace.main.id
      name                  = "log-analytics-destination"
    }
  }

  # Collect performance counters
  data_flow {
    streams      = ["Microsoft-Perf"]
    destinations = ["log-analytics-destination"]
  }

  # Collect syslog data
  data_flow {
    streams      = ["Microsoft-Syslog"]
    destinations = ["log-analytics-destination"]
  }

  # Performance counter data source configuration
  data_sources {
    performance_counter {
      name                          = "perfCounters"
      streams                       = ["Microsoft-Perf"]
      sampling_frequency_in_seconds = 60
      counter_specifiers = [
        "\\Processor(*)\\% Processor Time",
        "\\Memory\\Available Bytes",
        "\\LogicalDisk(*)\\% Free Space",
        "\\Network Interface(*)\\Bytes Total/sec"
      ]
    }

    syslog {
      name    = "syslogDataSource"
      streams = ["Microsoft-Syslog"]
      facility_names = [
        "auth",
        "authpriv",
        "daemon",
        "kern",
        "syslog"
      ]
      log_levels = ["Warning", "Error", "Critical", "Alert", "Emergency"]
    }
  }

  tags = {
    Environment = "Production"
  }
}
```

## Linking Resources to the Workspace

A common pattern is configuring Azure resources to send their diagnostic logs to your workspace:

```hcl
# Example: Send Key Vault diagnostics to Log Analytics
resource "azurerm_key_vault" "example" {
  name                = "kv-prod-demo-001"
  location            = azurerm_resource_group.monitoring.location
  resource_group_name = azurerm_resource_group.monitoring.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"
}

data "azurerm_client_config" "current" {}

# Configure diagnostic settings to send logs to the workspace
resource "azurerm_monitor_diagnostic_setting" "keyvault" {
  name                       = "diag-keyvault-to-law"
  target_resource_id         = azurerm_key_vault.example.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  # Send audit events
  enabled_log {
    category = "AuditEvent"
  }

  # Send metrics
  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Workspace Access Control

You can control who has access to the workspace data using role-based access control:

```hcl
# Grant a group read-only access to the workspace
resource "azurerm_role_assignment" "log_reader" {
  scope                = azurerm_log_analytics_workspace.main.id
  role_definition_name = "Log Analytics Reader"
  principal_id         = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" # Azure AD group object ID
}

# Grant a service principal contributor access for automation
resource "azurerm_role_assignment" "log_contributor" {
  scope                = azurerm_log_analytics_workspace.main.id
  role_definition_name = "Log Analytics Contributor"
  principal_id         = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy" # Service principal object ID
}
```

## Saved Searches and Custom Log Tables

You can pre-configure saved searches that your team uses frequently:

```hcl
# Create a saved search for failed sign-in attempts
resource "azurerm_log_analytics_saved_search" "failed_signins" {
  name                       = "FailedSignIns"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  category                   = "Security"
  display_name               = "Failed Sign-in Attempts (Last 24h)"

  query = <<-QUERY
    SigninLogs
    | where ResultType != "0"
    | where TimeGenerated > ago(24h)
    | summarize FailedAttempts = count() by UserPrincipalName, IPAddress, ResultDescription
    | sort by FailedAttempts desc
  QUERY
}

# Create a saved search for high CPU VMs
resource "azurerm_log_analytics_saved_search" "high_cpu" {
  name                       = "HighCPUVMs"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  category                   = "Performance"
  display_name               = "VMs with High CPU Usage"

  query = <<-QUERY
    Perf
    | where ObjectName == "Processor" and CounterName == "% Processor Time"
    | where InstanceName == "_Total"
    | summarize AvgCPU = avg(CounterValue) by Computer, bin(TimeGenerated, 5m)
    | where AvgCPU > 90
    | sort by AvgCPU desc
  QUERY
}
```

## Multi-Workspace Architecture with Outputs

For larger organizations, you might need multiple workspaces. Using outputs makes it easy to reference workspaces from other Terraform configurations:

```hcl
# Output the workspace details for use in other modules
output "workspace_id" {
  description = "The ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "workspace_customer_id" {
  description = "The Workspace (Customer) ID for agent configuration"
  value       = azurerm_log_analytics_workspace.main.workspace_id
}

output "workspace_primary_key" {
  description = "The primary shared key for the workspace"
  value       = azurerm_log_analytics_workspace.main.primary_shared_key
  sensitive   = true
}
```

## Best Practices

**Plan your workspace topology.** Most organizations work well with a centralized workspace per region. Only split workspaces when you have specific data sovereignty or access control requirements.

**Set retention carefully.** Data beyond 30 days costs money. Set retention based on your compliance and operational needs. For long-term archival, consider exporting data to a storage account.

**Use daily caps wisely.** A daily cap prevents runaway costs from unexpected log spikes, but it also means you could lose visibility during an incident. Set it high enough to handle normal peaks.

**Tag everything.** Tags on the workspace and resource group make cost allocation and management much easier.

**Use Data Collection Rules over legacy agents.** The Azure Monitor Agent with DCRs is the modern path forward. Legacy Log Analytics agents are on a deprecation timeline.

## Conclusion

A well-configured Log Analytics workspace is foundational to observability in Azure. With Terraform, you can stamp out consistent workspace configurations across environments, automate diagnostic settings for all your resources, and ensure your monitoring infrastructure is as reliable as the systems it watches. Start with a simple workspace, layer on solutions and data collection rules as needed, and you will have a solid monitoring foundation.

For more on monitoring infrastructure, see our post on [How to Create Azure Application Insights in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-application-insights-in-terraform/view).
