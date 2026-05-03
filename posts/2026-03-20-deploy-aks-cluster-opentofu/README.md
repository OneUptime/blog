# How to Deploy an AKS Cluster with OpenTofu on Azure - Deploy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, AKS, Kubernetes, Infrastructure as Code

Description: Learn how to deploy an Azure Kubernetes Service cluster with OpenTofu including system and user node pools, RBAC, and monitoring integration.

## Introduction

Azure Kubernetes Service (AKS) provides managed Kubernetes on Azure. OpenTofu deploys AKS clusters with system node pools, optional user node pools, Azure AD integration, workload identity, and Azure Monitor integration.

## AKS Cluster

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${var.name}-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.name}-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                 = "system"
    node_count           = 1
    vm_size              = "Standard_D2s_v3"
    os_disk_size_gb      = 128
    vnet_subnet_id       = var.node_subnet_id
    type                 = "VirtualMachineScaleSets"
    auto_scaling_enabled = true
    min_count            = 1
    max_count            = 3

    upgrade_settings {
      max_surge = "10%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin     = "azure"
    network_policy     = "azure"
    load_balancer_sku  = "standard"
    outbound_type      = "loadBalancer"
  }

  azure_active_directory_role_based_access_control {
    azure_rbac_enabled     = true
    admin_group_object_ids = var.aks_admin_group_ids
  }

  workload_identity_enabled         = true
  oidc_issuer_enabled               = true

  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  tags = { Environment = var.environment }
}
```

## User Node Pool for Application Workloads

```hcl
resource "azurerm_kubernetes_cluster_node_pool" "apps" {
  name                  = "apps"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = "Standard_D4s_v3"
  vnet_subnet_id        = var.node_subnet_id
  auto_scaling_enabled  = true
  min_count             = 2
  max_count             = 10

  node_labels = {
    "workload-type" = "application"
  }

  node_taints = []  # No taints - all pods can schedule here

  tags = { Environment = var.environment }
}
```

## Grant AKS Access to ACR

```hcl
resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = var.container_registry_id
  skip_service_principal_aad_check = true
}
```

## Outputs

```hcl
output "cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "kube_config" {
  value     = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
}

output "cluster_identity" {
  value = azurerm_kubernetes_cluster.main.identity[0].principal_id
}

output "oidc_issuer_url" {
  value = azurerm_kubernetes_cluster.main.oidc_issuer_url
}
```

## Conclusion

AKS with workload identity and Azure RBAC provides a secure, production-ready Kubernetes environment. Separate system and user node pools, enable auto-scaling, and attach Azure Monitor from the start to ensure visibility into cluster and workload health.
