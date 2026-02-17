# How to Build Azure Machine Learning Workspace with Compute Clusters in Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Terraform, Machine Learning, MLOps, Infrastructure as Code, AI, Compute Clusters

Description: Build Azure Machine Learning workspaces with compute clusters and managed identity access using Terraform for reproducible ML infrastructure.

---

Azure Machine Learning (AML) is Microsoft's platform for building, training, and deploying machine learning models. Setting up an AML workspace involves a surprising number of interconnected resources - a storage account for data, a Key Vault for secrets, an Application Insights instance for monitoring, a container registry for Docker images, and the workspace itself. Then you need compute clusters for training. Doing this through the portal is tedious and error-prone. Terraform makes the whole setup reproducible and version-controlled.

This post walks through building a complete Azure Machine Learning environment with Terraform, including the workspace, its dependencies, compute clusters, and proper network configuration.

## Workspace Dependencies

An AML workspace requires several supporting resources. Let us create them all.

```hcl
# main.tf
# Azure Machine Learning workspace with all required dependencies

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

data "azurerm_client_config" "current" {}

variable "environment" {
  default = "production"
}

resource "azurerm_resource_group" "ml" {
  name     = "rg-ml-${var.environment}"
  location = "eastus"
  tags = {
    environment = var.environment
    team        = "data-science"
  }
}

# Storage account for ML data, models, and artifacts
resource "azurerm_storage_account" "ml" {
  name                     = "stml${var.environment}001"
  location                 = azurerm_resource_group.ml.location
  resource_group_name      = azurerm_resource_group.ml.name
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  # Enable hierarchical namespace for better ML data organization
  is_hns_enabled = true

  tags = azurerm_resource_group.ml.tags
}

# Key Vault for storing secrets, keys, and certificates
resource "azurerm_key_vault" "ml" {
  name                     = "kv-ml-${var.environment}"
  location                 = azurerm_resource_group.ml.location
  resource_group_name      = azurerm_resource_group.ml.name
  tenant_id                = data.azurerm_client_config.current.tenant_id
  sku_name                 = "standard"
  purge_protection_enabled = true

  # Enable RBAC for access management
  enable_rbac_authorization = true

  tags = azurerm_resource_group.ml.tags
}

# Application Insights for monitoring ML experiments and deployments
resource "azurerm_application_insights" "ml" {
  name                = "ai-ml-${var.environment}"
  location            = azurerm_resource_group.ml.location
  resource_group_name = azurerm_resource_group.ml.name
  application_type    = "web"

  tags = azurerm_resource_group.ml.tags
}

# Container registry for storing Docker images used in training and deployment
resource "azurerm_container_registry" "ml" {
  name                = "acrml${var.environment}001"
  location            = azurerm_resource_group.ml.location
  resource_group_name = azurerm_resource_group.ml.name
  sku                 = "Standard"
  admin_enabled       = false

  tags = azurerm_resource_group.ml.tags
}
```

## Creating the Workspace

With dependencies in place, create the ML workspace.

```hcl
# workspace.tf
# The Azure Machine Learning workspace itself

resource "azurerm_machine_learning_workspace" "main" {
  name                    = "mlw-${var.environment}"
  location                = azurerm_resource_group.ml.location
  resource_group_name     = azurerm_resource_group.ml.name
  friendly_name           = "ML Workspace - ${title(var.environment)}"
  description             = "Machine Learning workspace for ${var.environment} workloads"

  # Link to dependent resources
  application_insights_id = azurerm_application_insights.ml.id
  key_vault_id            = azurerm_key_vault.ml.id
  storage_account_id      = azurerm_storage_account.ml.id
  container_registry_id   = azurerm_container_registry.ml.id

  # Use system-assigned managed identity
  identity {
    type = "SystemAssigned"
  }

  # Public network access settings
  public_network_access_enabled = true

  # Image build compute for custom environments
  image_build_compute_name = "cpu-cluster"

  tags = azurerm_resource_group.ml.tags
}

# Grant the workspace identity access to Key Vault
resource "azurerm_role_assignment" "ml_keyvault" {
  scope                = azurerm_key_vault.ml.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = azurerm_machine_learning_workspace.main.identity[0].principal_id
}

# Grant the workspace identity access to Storage
resource "azurerm_role_assignment" "ml_storage" {
  scope                = azurerm_storage_account.ml.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_machine_learning_workspace.main.identity[0].principal_id
}

# Grant the workspace identity access to Container Registry
resource "azurerm_role_assignment" "ml_acr" {
  scope                = azurerm_container_registry.ml.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_machine_learning_workspace.main.identity[0].principal_id
}
```

## Compute Clusters

Compute clusters are where ML training jobs run. You typically want different clusters for different workload types - CPU for data preprocessing, GPU for deep learning training.

```hcl
# compute.tf
# ML compute clusters for training workloads

# CPU cluster for general-purpose training and data preprocessing
resource "azurerm_machine_learning_compute_cluster" "cpu" {
  name                          = "cpu-cluster"
  location                      = azurerm_resource_group.ml.location
  machine_learning_workspace_id = azurerm_machine_learning_workspace.main.id

  vm_size   = "Standard_D4s_v3"  # 4 vCPU, 16 GB RAM
  vm_priority = "Dedicated"

  scale_settings {
    min_node_count                       = 0      # Scale to zero when idle
    max_node_count                       = 10     # Maximum nodes for parallel training
    scale_down_nodes_after_idle_duration = "PT15M" # Scale down after 15 minutes idle
  }

  identity {
    type = "SystemAssigned"
  }

  tags = azurerm_resource_group.ml.tags
}

# GPU cluster for deep learning training
resource "azurerm_machine_learning_compute_cluster" "gpu" {
  name                          = "gpu-cluster"
  location                      = azurerm_resource_group.ml.location
  machine_learning_workspace_id = azurerm_machine_learning_workspace.main.id

  vm_size   = "Standard_NC6s_v3"  # 6 vCPU, 112 GB RAM, 1x V100 GPU
  vm_priority = "Dedicated"

  scale_settings {
    min_node_count                       = 0
    max_node_count                       = 4
    scale_down_nodes_after_idle_duration = "PT30M"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = azurerm_resource_group.ml.tags
}

# Low-priority cluster for cost-effective batch training
resource "azurerm_machine_learning_compute_cluster" "low_priority" {
  name                          = "low-priority-cluster"
  location                      = azurerm_resource_group.ml.location
  machine_learning_workspace_id = azurerm_machine_learning_workspace.main.id

  vm_size   = "Standard_D8s_v3"  # 8 vCPU, 32 GB RAM
  vm_priority = "LowPriority"    # Up to 80% cheaper but can be preempted

  scale_settings {
    min_node_count                       = 0
    max_node_count                       = 20
    scale_down_nodes_after_idle_duration = "PT10M"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = merge(azurerm_resource_group.ml.tags, {
    priority = "low"
  })
}
```

Setting `min_node_count` to 0 is crucial for cost management. Clusters scale to zero when there are no jobs running, so you only pay when training is actually happening. The `scale_down_nodes_after_idle_duration` controls how quickly nodes shut down after finishing their work.

Low-priority VMs can be up to 80% cheaper than dedicated VMs, but Azure can reclaim them at any time. They are ideal for fault-tolerant training jobs that can be checkpointed and resumed.

## Compute Instances for Development

Data scientists also need compute instances for interactive development with Jupyter notebooks.

```hcl
# compute-instances.tf
# Individual compute instances for data scientist development

resource "azurerm_machine_learning_compute_instance" "dev" {
  name                          = "ci-dev-user01"
  location                      = azurerm_resource_group.ml.location
  machine_learning_workspace_id = azurerm_machine_learning_workspace.main.id
  virtual_machine_size          = "Standard_DS3_v2"

  # Auto-shutdown schedule to save costs
  assign_to_user {
    object_id = var.data_scientist_object_id
    tenant_id = data.azurerm_client_config.current.tenant_id
  }

  tags = azurerm_resource_group.ml.tags
}
```

## Network Configuration

For production workloads, you likely want the workspace and compute in a private VNet.

```hcl
# network.tf
# VNet configuration for ML workspace

resource "azurerm_virtual_network" "ml" {
  name                = "vnet-ml-${var.environment}"
  location            = azurerm_resource_group.ml.location
  resource_group_name = azurerm_resource_group.ml.name
  address_space       = ["10.1.0.0/16"]
}

# Subnet for compute clusters
resource "azurerm_subnet" "compute" {
  name                 = "snet-ml-compute"
  resource_group_name  = azurerm_resource_group.ml.name
  virtual_network_name = azurerm_virtual_network.ml.name
  address_prefixes     = ["10.1.1.0/24"]
}

# Subnet for private endpoints
resource "azurerm_subnet" "private_endpoints" {
  name                 = "snet-ml-private-endpoints"
  resource_group_name  = azurerm_resource_group.ml.name
  virtual_network_name = azurerm_virtual_network.ml.name
  address_prefixes     = ["10.1.2.0/24"]
}

# GPU cluster with VNet integration
resource "azurerm_machine_learning_compute_cluster" "gpu_vnet" {
  name                          = "gpu-cluster-vnet"
  location                      = azurerm_resource_group.ml.location
  machine_learning_workspace_id = azurerm_machine_learning_workspace.main.id
  vm_size                       = "Standard_NC6s_v3"
  vm_priority                   = "Dedicated"
  subnet_resource_id            = azurerm_subnet.compute.id

  scale_settings {
    min_node_count                       = 0
    max_node_count                       = 4
    scale_down_nodes_after_idle_duration = "PT30M"
  }

  identity {
    type = "SystemAssigned"
  }
}
```

## Outputs

Export values that data scientists and pipelines need.

```hcl
# outputs.tf
output "workspace_name" {
  value = azurerm_machine_learning_workspace.main.name
}

output "workspace_id" {
  value = azurerm_machine_learning_workspace.main.id
}

output "cpu_cluster_name" {
  value = azurerm_machine_learning_compute_cluster.cpu.name
}

output "gpu_cluster_name" {
  value = azurerm_machine_learning_compute_cluster.gpu.name
}

output "storage_account_name" {
  value = azurerm_storage_account.ml.name
}

output "container_registry_name" {
  value = azurerm_container_registry.ml.name
}
```

## Summary

Terraform gives you a complete, reproducible setup for Azure Machine Learning. The workspace with its dependencies, compute clusters with auto-scaling, and proper RBAC configuration can all be version-controlled and deployed consistently across environments. The key is getting the compute cluster configuration right - scale to zero for cost savings, use low-priority VMs for batch jobs, and put GPU clusters in the right subnets. With this foundation in Terraform, data science teams can focus on building models instead of managing infrastructure.
