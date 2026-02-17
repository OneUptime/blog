# How to Create Azure Batch Account and Pool Configurations with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Terraform, Batch Computing, Infrastructure as Code, HPC, Cloud Computing, Automation

Description: Create Azure Batch accounts and configure compute pools with auto-scaling and start tasks using Terraform for parallel workload processing.

---

Azure Batch is the service you reach for when you need to run large-scale parallel computing workloads without managing the underlying infrastructure. Whether it is rendering video frames, running financial simulations, or processing genomic data, Batch handles spinning up compute nodes, distributing work, and scaling down when the job is done. Configuring all of this through the portal works for experimentation, but Terraform is the right tool for production setups where you need repeatable, version-controlled infrastructure.

This post covers creating an Azure Batch account, configuring compute pools with auto-scaling, setting up start tasks, and integrating with storage for input and output data.

## Prerequisites

Azure Batch has a few dependencies. You need a storage account for input/output data and application packages. You also need to decide on the pool allocation mode - Batch Service or User Subscription. Batch Service mode is simpler, while User Subscription mode gives you more control over the VMs but requires a Key Vault.

## Creating the Batch Account

Let us start with the Batch account and its dependencies.

```hcl
# main.tf
# Creates an Azure Batch account with supporting resources

terraform {
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

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "batch" {
  name     = "rg-batch-processing"
  location = "eastus"
  tags = {
    environment = "production"
    workload    = "batch-processing"
  }
}

# Storage account for Batch input/output data and application packages
resource "azurerm_storage_account" "batch" {
  name                     = "stbatchdata001"
  resource_group_name      = azurerm_resource_group.batch.name
  location                 = azurerm_resource_group.batch.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = {
    purpose = "batch-storage"
  }
}

# Containers for organizing batch data
resource "azurerm_storage_container" "input" {
  name                  = "input"
  storage_account_name  = azurerm_storage_account.batch.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "output" {
  name                  = "output"
  storage_account_name  = azurerm_storage_account.batch.name
  container_access_type = "private"
}

# The Batch account itself
resource "azurerm_batch_account" "main" {
  name                                = "batchprocessing001"
  resource_group_name                 = azurerm_resource_group.batch.name
  location                            = azurerm_resource_group.batch.location

  # Batch Service mode - Azure manages the VM allocation
  pool_allocation_mode                = "BatchService"

  # Link the storage account for auto-storage features
  storage_account_id                  = azurerm_storage_account.batch.id
  storage_account_authentication_mode = "StorageKeys"

  tags = {
    environment = "production"
  }
}
```

The `pool_allocation_mode` is an important decision. With `BatchService`, Azure handles VM allocation internally. With `UserSubscription`, the VMs are created in your subscription, giving you access to reserved instances and custom VM images but requiring more setup.

## Configuring a Fixed-Size Pool

Pools are collections of compute nodes that run your jobs. Start with a fixed-size pool for predictable workloads.

```hcl
# pool-fixed.tf
# A fixed-size pool with Linux nodes for general processing

resource "azurerm_batch_pool" "linux_general" {
  name                = "linux-general-pool"
  resource_group_name = azurerm_resource_group.batch.name
  account_name        = azurerm_batch_account.main.name

  # VM size - Standard_D4s_v3 gives 4 vCPUs and 16 GB RAM per node
  vm_size             = "Standard_D4s_v3"
  display_name        = "Linux General Processing"

  # Node agent SKU must match the OS image
  node_agent_sku_id   = "batch.node.ubuntu 22.04"

  # Fixed scaling - always keep 4 dedicated nodes running
  fixed_scale {
    target_dedicated_nodes    = 4
    target_low_priority_nodes = 2  # Add low-priority nodes for cost savings
    resize_timeout            = "PT15M"
  }

  # OS image configuration
  storage_image_reference {
    publisher = "canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  # Start task runs on every node when it joins the pool
  start_task {
    # Install dependencies needed by all tasks
    command_line = "/bin/bash -c 'apt-get update && apt-get install -y python3-pip ffmpeg && pip3 install azure-storage-blob'"

    # Run as admin to install packages
    user_identity {
      auto_user {
        elevation_level = "Admin"
        scope           = "Pool"
      }
    }

    # Wait for the start task to complete before scheduling tasks on this node
    wait_for_success = true

    # Number of times to retry the start task
    task_retry_maximum = 3

    # Make resource files available to the start task
    resource_file {
      http_url  = "https://stbatchdata001.blob.core.windows.net/input/setup-script.sh"
      file_path = "setup-script.sh"
    }
  }

  # Container configuration if you want to run Docker containers
  container_configuration {
    type = "DockerCompatible"
    container_registries {
      registry_server = "myregistry.azurecr.io"
      user_name       = var.acr_username
      password        = var.acr_password
    }
  }
}
```

## Auto-Scaling Pools

For variable workloads, auto-scaling adjusts the pool size based on pending tasks, time of day, or custom metrics.

```hcl
# pool-autoscale.tf
# Auto-scaling pool that adjusts based on pending work

resource "azurerm_batch_pool" "autoscale" {
  name                = "autoscale-processing-pool"
  resource_group_name = azurerm_resource_group.batch.name
  account_name        = azurerm_batch_account.main.name
  vm_size             = "Standard_D8s_v3"
  display_name        = "Auto-Scaling Processing Pool"
  node_agent_sku_id   = "batch.node.ubuntu 22.04"

  # Auto-scale configuration
  auto_scale {
    # Evaluate the formula every 5 minutes
    evaluation_interval = "PT5M"

    # Auto-scale formula
    # This scales based on pending tasks with min/max bounds
    formula = <<-EOT
      // Get the number of pending tasks (waiting and active)
      pendingTaskCount = $PendingTasks.GetSample(1);

      // Calculate desired nodes: 1 node per 4 tasks, minimum 1, maximum 20
      desiredNodes = max(1, min(20, pendingTaskCount / 4));

      // Scale dedicated nodes based on task count
      $TargetDedicatedNodes = desiredNodes;

      // Use low-priority nodes for additional capacity (50% of dedicated)
      $TargetLowPriorityNodes = desiredNodes / 2;

      // Allow 10 minutes for scaling operations
      $NodeDeallocationOption = taskcompletion;
    EOT
  }

  storage_image_reference {
    publisher = "canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  start_task {
    command_line = "/bin/bash -c 'echo Node started at $(date) >> /tmp/node-start.log'"

    user_identity {
      auto_user {
        elevation_level = "NonAdmin"
        scope           = "Task"
      }
    }

    wait_for_success = true
  }
}
```

The auto-scale formula language is specific to Azure Batch. Key variables include `$PendingTasks` for work waiting to be scheduled, `$ActiveTasks` for currently running tasks, and `$RunningTasks` for tasks actively executing code. The `$NodeDeallocationOption = taskcompletion` setting ensures that when scaling down, nodes finish their current tasks before being removed.

## Network Configuration

For pools that need to access private resources, configure VNet integration.

```hcl
# network.tf
# VNet configuration for Batch pool nodes

resource "azurerm_virtual_network" "batch" {
  name                = "vnet-batch"
  resource_group_name = azurerm_resource_group.batch.name
  location            = azurerm_resource_group.batch.location
  address_space       = ["10.0.0.0/16"]
}

# Subnet for Batch pool nodes
resource "azurerm_subnet" "batch_nodes" {
  name                 = "snet-batch-nodes"
  resource_group_name  = azurerm_resource_group.batch.name
  virtual_network_name = azurerm_virtual_network.batch.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Pool with VNet integration
resource "azurerm_batch_pool" "vnet_pool" {
  name                = "vnet-connected-pool"
  resource_group_name = azurerm_resource_group.batch.name
  account_name        = azurerm_batch_account.main.name
  vm_size             = "Standard_D4s_v3"
  node_agent_sku_id   = "batch.node.ubuntu 22.04"

  fixed_scale {
    target_dedicated_nodes = 2
  }

  storage_image_reference {
    publisher = "canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  # Place nodes in the VNet subnet
  network_configuration {
    subnet_id = azurerm_subnet.batch_nodes.id

    # Public IP configuration
    public_address_provisioning_type = "NoPublicIPAddresses"
  }

  start_task {
    command_line = "echo VNet pool node started"
    user_identity {
      auto_user {
        elevation_level = "NonAdmin"
        scope           = "Task"
      }
    }
    wait_for_success = true
  }
}
```

## Monitoring and Diagnostics

Enable diagnostic logging to track pool and job metrics.

```hcl
# diagnostics.tf
# Enable diagnostic logging for the Batch account

resource "azurerm_monitor_diagnostic_setting" "batch" {
  name                       = "batch-diagnostics"
  target_resource_id         = azurerm_batch_account.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "ServiceLog"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
```

## Outputs

Export the values needed by your job submission scripts.

```hcl
# outputs.tf
output "batch_account_name" {
  value = azurerm_batch_account.main.name
}

output "batch_account_endpoint" {
  value = "https://${azurerm_batch_account.main.account_endpoint}"
}

output "storage_account_name" {
  value = azurerm_storage_account.batch.name
}

output "fixed_pool_id" {
  value = azurerm_batch_pool.linux_general.name
}

output "autoscale_pool_id" {
  value = azurerm_batch_pool.autoscale.name
}
```

## Summary

Azure Batch with Terraform gives you infrastructure-as-code for high-performance computing workloads. The key pieces are the Batch account, storage integration for data, and properly configured pools. Fixed-size pools work for predictable workloads, while auto-scaling pools handle variable demand. Start tasks prepare nodes with your dependencies, and VNet integration lets nodes access private resources. With everything in Terraform, you can spin up identical Batch environments across dev, staging, and production without manual configuration.
