# How to Build Azure Synapse Analytics Workspace with Spark Pools Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Synapse Analytics, Terraform, Spark, Infrastructure as Code, Big Data, Data Engineering

Description: A practical guide to provisioning Azure Synapse Analytics workspaces with Apache Spark pools using Terraform for scalable data engineering pipelines.

---

Azure Synapse Analytics brings together data warehousing and big data analytics into a single unified platform. One of its most useful features is the ability to run Apache Spark pools for large-scale data processing alongside dedicated SQL pools and serverless SQL endpoints. When you need to set this up repeatedly across environments or for multiple teams, Terraform is the right tool for the job.

This guide walks through provisioning a complete Synapse Analytics workspace with Spark pools, including all the supporting resources you need for a production-ready setup.

## What You Need Before Starting

Synapse Analytics has several dependencies that need to exist before the workspace itself. You will need:

- A storage account with hierarchical namespace enabled (Azure Data Lake Storage Gen2)
- A resource group
- Proper RBAC assignments for the Synapse workspace managed identity
- Network configuration if you want private endpoints

Terraform handles all of this declaratively, so let us build it up piece by piece.

## Provider Configuration

Start with the Terraform provider configuration and some shared variables.

```hcl
# Configure the Azure provider with required features
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {
    # Purge soft-deleted Synapse workspaces on destroy
    synapse_workspace {
      purge_on_destroy = true
    }
  }
}

# Variables for configurable deployment
variable "location" {
  type    = string
  default = "eastus2"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "project_name" {
  type    = string
  default = "analytics"
}

variable "sql_admin_login" {
  type      = string
  sensitive = true
}

variable "sql_admin_password" {
  type      = string
  sensitive = true
}

# Local values for consistent naming
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = var.project_name
  }
}
```

## Resource Group and Storage Account

The Data Lake Storage Gen2 account is the backbone of Synapse. It stores everything from Spark pool metadata to your actual data files. The hierarchical namespace feature must be enabled because Synapse relies on it for folder-level access control and performance.

```hcl
# Resource group for all Synapse resources
resource "azurerm_resource_group" "synapse" {
  name     = "rg-${local.name_prefix}-synapse"
  location = var.location
  tags     = local.tags
}

# Data Lake Storage Gen2 account - the primary data store for Synapse
resource "azurerm_storage_account" "datalake" {
  name                     = replace("st${local.name_prefix}lake", "-", "")
  resource_group_name      = azurerm_resource_group.synapse.name
  location                 = azurerm_resource_group.synapse.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  # This MUST be true for Synapse
  is_hns_enabled = true

  # Security settings
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false

  tags = local.tags
}

# File system (container) within the data lake for Synapse workspace data
resource "azurerm_storage_data_lake_gen2_filesystem" "synapse" {
  name               = "synapse"
  storage_account_id = azurerm_storage_account.datalake.id
}

# Additional file system for raw data ingestion
resource "azurerm_storage_data_lake_gen2_filesystem" "raw_data" {
  name               = "raw-data"
  storage_account_id = azurerm_storage_account.datalake.id
}
```

## The Synapse Workspace

With the storage in place, the workspace itself is straightforward. The key decisions here involve SQL admin credentials, managed identity configuration, and which features to enable.

```hcl
# The Synapse Analytics workspace
resource "azurerm_synapse_workspace" "main" {
  name                                 = "syn-${local.name_prefix}"
  resource_group_name                  = azurerm_resource_group.synapse.name
  location                             = azurerm_resource_group.synapse.location
  storage_data_lake_gen2_filesystem_id = azurerm_storage_data_lake_gen2_filesystem.synapse.id

  # SQL administrator credentials for the built-in serverless SQL pool
  sql_administrator_login          = var.sql_admin_login
  sql_administrator_login_password = var.sql_admin_password

  # Enable managed virtual network for network isolation
  managed_virtual_network_enabled = true

  # Managed identity for the workspace
  identity {
    type = "SystemAssigned"
  }

  # Azure AD authentication settings
  aad_admin {
    login     = "AzureAD Admin"
    object_id = data.azurerm_client_config.current.object_id
    tenant_id = data.azurerm_client_config.current.tenant_id
  }

  tags = local.tags
}

# Get the current client configuration for AAD admin setup
data "azurerm_client_config" "current" {}
```

The `managed_virtual_network_enabled` flag is worth highlighting. When set to true, Synapse creates a managed virtual network that isolates the workspace's compute resources. Spark pools and integration runtimes run inside this network, which adds a layer of security without you having to manage VNet peering yourself.

## Apache Spark Pool Configuration

Now for the Spark pools. Synapse supports multiple Spark pools per workspace, each with different configurations. This is useful for separating workloads - for example, a small pool for interactive development and a larger one for production batch jobs.

```hcl
# Development Spark pool - smaller, with auto-pause enabled
resource "azurerm_synapse_spark_pool" "dev" {
  name                 = "sparkdev"
  synapse_workspace_id = azurerm_synapse_workspace.main.id
  node_size_family     = "MemoryOptimized"
  node_size            = "Small"     # 4 vCores, 32 GB memory per node
  node_count           = 3

  # Auto-pause to save costs when idle
  auto_pause {
    delay_in_minutes = 15   # Pause after 15 minutes of inactivity
  }

  # Auto-scale between 3 and 10 nodes based on workload
  auto_scale {
    min_node_count = 3
    max_node_count = 10
  }

  # Spark version and configuration
  spark_version = "3.4"

  # Session-level configuration defaults
  spark_config {
    content  = <<-EOT
      spark.shuffle.spill.compress true
      spark.sql.adaptive.enabled true
      spark.sql.adaptive.coalescePartitions.enabled true
      spark.dynamicAllocation.enabled false
    EOT
    filename = "spark-defaults.conf"
  }

  # Library requirements for Python packages
  library_requirement {
    content  = <<-EOT
      pandas==2.1.0
      pyarrow==13.0.0
      delta-spark==3.0.0
    EOT
    filename = "requirements.txt"
  }

  tags = local.tags
}

# Production Spark pool - larger, optimized for batch workloads
resource "azurerm_synapse_spark_pool" "prod" {
  name                 = "sparkprod"
  synapse_workspace_id = azurerm_synapse_workspace.main.id
  node_size_family     = "MemoryOptimized"
  node_size            = "Medium"    # 8 vCores, 64 GB memory per node

  # Fixed size for predictable performance in production
  node_count = 10

  # Auto-pause disabled for production workloads
  auto_pause {
    delay_in_minutes = 0   # 0 means auto-pause is disabled
  }

  spark_version = "3.4"

  # Enable cache for faster repeated queries
  cache_size = 50    # 50% of disk space allocated for caching

  tags = local.tags
}
```

The `auto_scale` block on the dev pool is particularly useful. It lets the cluster grow when running a heavy notebook session and shrink back down when the workload lightens. Combined with `auto_pause`, this keeps development costs reasonable.

## RBAC Assignments

Synapse's managed identity needs access to the Data Lake storage account. Without these role assignments, the workspace cannot read or write data.

```hcl
# Grant the Synapse workspace managed identity access to the data lake
resource "azurerm_role_assignment" "synapse_storage_contributor" {
  scope                = azurerm_storage_account.datalake.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_synapse_workspace.main.identity[0].principal_id
}

# Grant the deploying user/service principal Synapse Administrator role
resource "azurerm_synapse_role_assignment" "admin" {
  synapse_workspace_id = azurerm_synapse_workspace.main.id
  role_name            = "Synapse Administrator"
  principal_id         = data.azurerm_client_config.current.object_id

  depends_on = [
    azurerm_synapse_workspace.main  # Workspace must be fully provisioned first
  ]
}
```

## Firewall Rules

By default, Synapse blocks all external access. You will want to add firewall rules for your team's IP ranges and optionally allow Azure services to connect.

```hcl
# Allow Azure services to access the workspace
resource "azurerm_synapse_firewall_rule" "allow_azure" {
  name                 = "AllowAllWindowsAzureIps"
  synapse_workspace_id = azurerm_synapse_workspace.main.id
  start_ip_address     = "0.0.0.0"
  end_ip_address       = "0.0.0.0"   # Special range that means "Azure services only"
}

# Allow a specific IP range for development access
variable "allowed_ip_range" {
  type = object({
    start = string
    end   = string
  })
  default = {
    start = "10.0.0.0"
    end   = "10.0.0.255"
  }
}

resource "azurerm_synapse_firewall_rule" "dev_access" {
  name                 = "DevTeamAccess"
  synapse_workspace_id = azurerm_synapse_workspace.main.id
  start_ip_address     = var.allowed_ip_range.start
  end_ip_address       = var.allowed_ip_range.end
}
```

## Outputs

Expose useful information from the deployment for downstream automation.

```hcl
# Outputs for reference and downstream automation
output "synapse_workspace_id" {
  value       = azurerm_synapse_workspace.main.id
  description = "The resource ID of the Synapse workspace"
}

output "synapse_studio_url" {
  value       = "https://web.azuresynapse.net?workspace=%2fsubscriptions%2f${data.azurerm_client_config.current.subscription_id}%2fresourceGroups%2f${azurerm_resource_group.synapse.name}%2fproviders%2fMicrosoft.Synapse%2fworkspaces%2f${azurerm_synapse_workspace.main.name}"
  description = "URL to access Synapse Studio"
}

output "spark_dev_pool_id" {
  value       = azurerm_synapse_spark_pool.dev.id
  description = "Resource ID of the development Spark pool"
}

output "datalake_endpoint" {
  value       = azurerm_storage_account.datalake.primary_dfs_endpoint
  description = "The ADLS Gen2 DFS endpoint for data access"
}
```

## Running the Deployment

Execute the Terraform deployment with sensitive variables passed via a `terraform.tfvars` file or environment variables.

```bash
# Initialize and plan
terraform init
terraform plan -var="sql_admin_login=synapseadmin" -var="sql_admin_password=YourSecureP@ss123"

# Apply the configuration
terraform apply -var="sql_admin_login=synapseadmin" -var="sql_admin_password=YourSecureP@ss123"
```

## Performance Tuning Tips

Once the infrastructure is deployed, there are a few things to keep in mind for getting the best performance from your Spark pools:

- Use the `Medium` or `Large` node sizes for production batch jobs. The `Small` size is fine for development but struggles with datasets over 100 GB.
- Set `spark.sql.adaptive.enabled` to `true` in the Spark configuration. Adaptive query execution can dramatically improve join performance.
- Use the Delta Lake format for your data files. It provides ACID transactions and better performance than raw Parquet for read-heavy workloads.
- Monitor Spark pool utilization through the Synapse Studio monitoring hub and adjust node counts based on actual usage.

## Wrapping Up

Setting up Azure Synapse Analytics with Terraform gives you a reproducible, auditable way to manage your analytics infrastructure. The combination of a Synapse workspace with right-sized Spark pools, proper RBAC assignments, and Data Lake Gen2 storage forms a solid foundation for data engineering. From here, you can extend the configuration with dedicated SQL pools, linked services, and pipeline definitions - all managed as code.
