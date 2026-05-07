# How to Create Azure ML Compute Clusters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Azure ML, Machine Learning, Compute Clusters, Infrastructure as Code

Description: Learn how to create Azure Machine Learning workspaces, compute clusters, and compute instances for ML training and experimentation using OpenTofu.

## Introduction

Azure Machine Learning provides a managed platform for training, deploying, and managing ML models. Compute clusters scale automatically for training jobs, while compute instances provide dedicated development environments. OpenTofu manages workspaces and compute resources as code.

## Creating an Azure ML Workspace

```hcl
provider "azurerm" {
  features {}
}

data "azurerm_client_config" "current" {}

variable "location" {
  type = string
}

variable "environment" {
  type = string
}

variable "app_name" {
  type = string
}

variable "developer_alias" {
  type = string
}

variable "developer_object_id" {
  type = string
}

resource "azurerm_resource_group" "ml" {
  name     = "rg-ml-${var.environment}"
  location = var.location
}

resource "azurerm_application_insights" "ml" {
  name                = "appi-ml-${var.environment}"
  resource_group_name = azurerm_resource_group.ml.name
  location            = azurerm_resource_group.ml.location
  application_type    = "web"
}

resource "azurerm_key_vault" "ml" {
  name                = "kv-ml-${var.environment}"
  location            = azurerm_resource_group.ml.location
  resource_group_name = azurerm_resource_group.ml.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"
}

resource "azurerm_storage_account" "ml" {
  name                     = "stml${var.environment}sa"
  resource_group_name      = azurerm_resource_group.ml.name
  location                 = azurerm_resource_group.ml.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_machine_learning_workspace" "main" {
  name                    = "mlw-${var.app_name}-${var.environment}"
  location                = azurerm_resource_group.ml.location
  resource_group_name     = azurerm_resource_group.ml.name
  application_insights_id = azurerm_application_insights.ml.id
  key_vault_id            = azurerm_key_vault.ml.id
  storage_account_id      = azurerm_storage_account.ml.id

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "opentofu"
  }
}
```

## Creating a Compute Cluster

```hcl
resource "azurerm_machine_learning_compute_cluster" "gpu_cluster" {
  name                          = "gpu-cluster"
  location                      = azurerm_resource_group.ml.location
  machine_learning_workspace_id = azurerm_machine_learning_workspace.main.id
  vm_priority                   = "LowPriority"  # or "Dedicated"
  vm_size                       = "Standard_NC6s_v3"  # GPU instances

  scale_settings {
    min_node_count                       = 0    # scale to zero when idle
    max_node_count                       = 4
    scale_down_nodes_after_idle_duration = "PT2M"  # 2 minutes idle before scale down
  }

  identity {
    type = "SystemAssigned"
  }

  ssh_public_access_enabled = false
}

resource "azurerm_machine_learning_compute_cluster" "cpu_cluster" {
  name                          = "cpu-cluster"
  location                      = azurerm_resource_group.ml.location
  machine_learning_workspace_id = azurerm_machine_learning_workspace.main.id
  vm_priority                   = "Dedicated"
  vm_size                       = "Standard_DS3_v2"

  scale_settings {
    min_node_count                       = 0
    max_node_count                       = 10
    scale_down_nodes_after_idle_duration = "PT5M"
  }

  identity {
    type = "SystemAssigned"
  }
}
```

## Compute Instance for Development

```hcl
resource "azurerm_machine_learning_compute_instance" "dev" {
  name                          = "dev-instance-${var.developer_alias}"
  machine_learning_workspace_id = azurerm_machine_learning_workspace.main.id
  virtual_machine_size          = "Standard_DS3_v2"

  authorization_type = "personal"

  assign_to_user {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = var.developer_object_id
  }
}
```

## Outputs

```hcl
output "workspace_id" {
  value = azurerm_machine_learning_workspace.main.id
}

output "gpu_cluster_name" {
  value = azurerm_machine_learning_compute_cluster.gpu_cluster.name
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Azure ML workspaces and compute clusters provide a managed platform for ML experimentation and training. OpenTofu manages workspaces, CPU and GPU clusters with auto-scaling, and development compute instances - giving your data science team a consistent, cost-efficient environment.
