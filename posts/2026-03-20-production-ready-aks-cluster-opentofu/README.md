# How to Build a Production-Ready AKS Cluster on Azure with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AKS, Azure Kubernetes Service, Production, Kubernetes, Infrastructure as Code

Description: Learn how to build a production-ready Azure Kubernetes Service cluster with OpenTofu, including node pools, RBAC, monitoring, and autoscaling.

## Introduction

A production-ready AKS cluster requires more than the default configuration. You need multiple node pools for workload isolation, Microsoft Entra integration for Azure RBAC, cluster autoscaling, Azure Monitor integration, Workload Identity for secret access, and proper network policies. This guide covers all of these.

Resource Group and Networking

```hcl
resource "azurerm_resource_group" "aks" {
  name     = "aks-${var.environment}-rg"
  location = var.location
}

resource "azurerm_virtual_network" "aks" {
  name                = "aks-vnet"
  resource_group_name = azurerm_resource_group.aks.name
  location            = azurerm_resource_group.aks.location
  address_space       = ["10.0.0.0/8"]
}

resource "azurerm_subnet" "aks_nodes" {
  name                 = "aks-nodes-subnet"
  resource_group_name  = azurerm_resource_group.aks.name
  virtual_network_name = azurerm_virtual_network.aks.name
  address_prefixes     = ["10.1.0.0/16"]
}

resource "azurerm_log_analytics_workspace" "aks" {
  name                = "aks-${var.environment}-logs"
  resource_group_name = azurerm_resource_group.aks.name
  location            = azurerm_resource_group.aks.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
}
```

## AKS Cluster

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${var.environment}-cluster"
  resource_group_name = azurerm_resource_group.aks.name
  location            = azurerm_resource_group.aks.location
  dns_prefix          = "aks-${var.environment}"

  kubernetes_version        = var.kubernetes_version
  sku_tier                  = var.environment == "prod" ? "Standard" : "Free"
  automatic_upgrade_channel = "stable"
  local_account_disabled    = true  # enforce Microsoft Entra auth only

  # System node pool
  default_node_pool {
    name                 = "system"
    vm_size              = "Standard_D4ds_v5"
    node_count           = null  # use autoscaler
    min_count            = 2
    max_count            = 5
    auto_scaling_enabled = true
    only_critical_addons_enabled = true  # system workloads only

    vnet_subnet_id = azurerm_subnet.aks_nodes.id
    os_disk_size_gb = 100
    os_disk_type    = "Ephemeral"  # faster, cheaper for system pool

    node_labels = {
      "node-type" = "system"
    }
  }

  # Microsoft Entra ID integration
  azure_active_directory_role_based_access_control {
    azure_rbac_enabled = true
    admin_group_object_ids = [var.aks_admin_group_object_id]
  }

  # Network configuration
  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"  # or "calico"
    load_balancer_sku = "standard"
    service_cidr      = "172.20.0.0/16"
    dns_service_ip    = "172.20.0.10"
  }

  # Workload Identity
  workload_identity_enabled = true
  oidc_issuer_enabled       = true

  # Managed identity for the cluster
  identity {
    type = "SystemAssigned"
  }

  # Monitoring
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.aks.id
  }

  # Maintenance window
  maintenance_window_auto_upgrade {
    frequency   = "Weekly"
    interval    = 1
    duration    = 4
    day_of_week = "Sunday"
    start_time  = "02:00"
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [kubernetes_version]  # managed by the auto-upgrade channel
  }
}
```

## Additional Node Pools

```hcl
resource "azurerm_kubernetes_cluster_node_pool" "app" {
  name                  = "app"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_D8ds_v5"
  node_count            = null
  min_count             = 2
  max_count             = 20
  auto_scaling_enabled  = true
  vnet_subnet_id        = azurerm_subnet.aks_nodes.id
  mode                  = "User"

  node_labels = {
    "node-type" = "app"
  }

  node_taints = []  # no taints for general app workloads
}

resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpu"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_NC6s_v3"
  node_count            = 0
  min_count             = 0
  max_count             = 5
  auto_scaling_enabled  = true
  vnet_subnet_id        = azurerm_subnet.aks_nodes.id
  mode                  = "User"

  node_labels = {
    "node-type"     = "gpu"
    "nvidia.com/gpu" = "true"
  }

  node_taints = ["nvidia.com/gpu=present:NoSchedule"]
}
```

## Container Registry Integration

```hcl
resource "azurerm_container_registry" "main" {
  name                = "myapp${var.environment}acr"
  resource_group_name = azurerm_resource_group.aks.name
  location            = azurerm_resource_group.aks.location
  sku                 = "Premium"
  zone_redundancy_enabled = var.environment == "prod"
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  skip_service_principal_aad_check = true
}
```

## Summary

A production-ready AKS cluster uses dedicated system and application node pools, Microsoft Entra integration with Azure RBAC and local accounts disabled, Workload Identity for pod-level Azure authentication, Azure Network Policy for pod-to-pod traffic control, managed identity for the cluster itself, and Azure Monitor integration. Configure an automatic upgrade channel with maintenance windows and use `lifecycle.prevent_destroy` to protect the cluster from accidental deletion.
