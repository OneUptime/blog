# How to Deploy an AKS Cluster with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Infrastructure as Code, IaC, AKS, Kubernetes

Description: Learn how to deploy an Azure Kubernetes Service cluster with node pools, RBAC, and monitoring using OpenTofu.

## Introduction

Azure Kubernetes Service (AKS) simplifies deploying managed Kubernetes clusters in Azure. This guide covers deploying a production-ready AKS cluster with system and user node pools, Azure RBAC, and Azure Monitor integration using OpenTofu.

## Prerequisites

- OpenTofu v1.6+
- Azure CLI and kubectl installed
- Azure credentials configured
- Existing VNet and subnets

## Step 1: Configure the Provider

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
```

## Step 2: Create AKS Cluster

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${var.application}-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.application}-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  # System node pool (required)
  default_node_pool {
    name                 = "system"
    node_count           = 3
    vm_size              = "Standard_D4s_v5"
    os_disk_size_gb      = 128
    os_disk_type         = "Managed"
    vnet_subnet_id       = var.subnet_id
    auto_scaling_enabled = true
    min_count            = 3
    max_count            = 6
    type                 = "VirtualMachineScaleSets"
    zones                = ["1", "2", "3"]

    node_labels = {
      "node-role" = "system"
    }

    upgrade_settings {
      max_surge = "33%"
    }
  }

  # Identity for AKS
  identity {
    type = "SystemAssigned"
  }

  # Azure RBAC
  role_based_access_control_enabled = true
  azure_active_directory_role_based_access_control {
    azure_rbac_enabled     = true
    admin_group_object_ids = [var.admin_group_id]
  }

  # Network configuration
  network_profile {
    network_plugin     = "azure"
    network_policy     = "azure"
    load_balancer_sku  = "standard"
    service_cidr       = "172.16.0.0/16"
    dns_service_ip     = "172.16.0.10"
    outbound_type      = "loadBalancer"
  }

  # Azure Monitor integration
  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  # Microsoft Defender for Containers
  microsoft_defender {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  # Key Vault secrets provider
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  # Maintenance window
  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [1, 2, 3]
    }
  }

  tags = {
    Environment = var.environment
    Application = var.application
  }
}
```

## Step 3: Add User Node Pool

```hcl
resource "azurerm_kubernetes_cluster_node_pool" "app" {
  name                  = "apppool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_D8s_v5"
  os_disk_size_gb       = 128
  vnet_subnet_id        = var.app_subnet_id
  auto_scaling_enabled  = true
  node_count            = 3
  min_count             = 3
  max_count             = 20
  zones                 = ["1", "2", "3"]
  mode                  = "User"

  node_labels = {
    "node-role" = "application"
  }

  node_taints = []

  tags = {
    Environment = var.environment
  }
}
```

## Step 4: Configure kubeconfig

```bash
# Get kubeconfig

az aks get-credentials \
  --resource-group $(tofu output -raw resource_group_name) \
  --name $(tofu output -raw cluster_name)

# Verify connection
kubectl get nodes
```

## Step 5: Outputs

```hcl
output "cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "resource_group_name" {
  value = var.resource_group_name
}

output "kube_config" {
  value     = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully deployed an AKS cluster using OpenTofu with Azure RBAC, system and user node pools across availability zones, Azure CNI networking, and Microsoft Defender integration. This example uses Azure CNI Node Subnet networking with Azure network policies. For new production deployments, review the current AKS CNI guidance: Azure CNI Overlay is recommended for most scenarios, while Azure CNI Pod Subnet is the recommended flat-networking option.
