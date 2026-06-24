# How to Create Azure Batch Accounts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Batch, HPC, Infrastructure as Code, Compute

Description: Learn how to create Azure Batch accounts, pools, and jobs for large-scale parallel batch processing workloads using OpenTofu.

## Introduction

Azure Batch is a managed service for running large-scale parallel and high-performance computing (HPC) applications. OpenTofu manages Batch accounts, pools with auto-scaling, and Batch applications as code.

## Creating a Batch Account

```hcl
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "rg-batch-${var.environment}"
  location = var.location
}

resource "azurerm_storage_account" "batch" {
  name                     = "st${var.app_name}batch${var.environment}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_batch_account" "main" {
  name                                = "${var.app_name}batch${var.environment}"
  resource_group_name                 = azurerm_resource_group.main.name
  location                            = azurerm_resource_group.main.location
  pool_allocation_mode                = "BatchService"
  storage_account_id                  = azurerm_storage_account.batch.id
  storage_account_authentication_mode = "StorageKeys"

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Creating a Batch Pool

```hcl
resource "azurerm_batch_pool" "linux_workers" {
  name                = "linux-workers"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_batch_account.main.name
  display_name        = "Linux Worker Pool"
  vm_size             = "Standard_D4s_v3"
  node_agent_sku_id   = "batch.node.ubuntu 22.04"

  # VM image configuration
  storage_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  # Auto-scaling formula – scale based on pending tasks
  auto_scale {
    evaluation_interval = "PT5M"

    formula = <<-EOF
      startingNumberOfVMs = 1;
      maxNumberofVMs = 20;
      pendingTaskSamplePercent = $PendingTasks.GetSamplePercent(180 * TimeInterval_Second);
      pendingTaskSamples = pendingTaskSamplePercent < 70 ? startingNumberOfVMs : avg($PendingTasks.GetSample(180 * TimeInterval_Second));
      $TargetDedicatedNodes = min(maxNumberofVMs, pendingTaskSamples);
      $NodeDeallocationOption = taskcompletion;
    EOF
  }

  # Start task to install Python dependencies on each node
  start_task {
    command_line         = "/bin/bash -c 'apt-get update && apt-get install -y python3-pip && pip3 install pandas numpy scikit-learn'"
    wait_for_success     = true
    task_retry_maximum   = 1

    user_identity {
      auto_user {
        elevation_level = "Admin"
        scope           = "Pool"
      }
    }
  }
}
```

## Creating a Batch Application

```hcl
resource "azurerm_batch_application" "data_processor" {
  name                = "data-processor"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_batch_account.main.name
  display_name        = "Data Processor Application"
  allow_updates       = true
}
```

## Variables and Outputs

```hcl
variable "app_name"    { type = string }
variable "environment" { type = string }
variable "location"    { type = string  default = "East US" }

output "batch_account_endpoint" {
  value = azurerm_batch_account.main.account_endpoint
}

output "batch_account_name" {
  value = azurerm_batch_account.main.name
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Azure Batch enables large-scale parallel workloads without managing cluster infrastructure. OpenTofu provisions Batch accounts, pools with auto-scaling formulas, and Batch applications - giving you a fully automated, reproducible HPC platform.
