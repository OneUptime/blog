# How to Configure AKS Node Pools with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AKS, Azure, Kubernetes, Node Pool, Infrastructure as Code

Description: Learn how to define and manage Azure Kubernetes Service node pools using OpenTofu, including system and user pools with autoscaling.

---

Azure Kubernetes Service (AKS) supports multiple node pools, allowing you to run workloads on different VM sizes or OS types within a single cluster. OpenTofu lets you define these pools declaratively so your cluster topology is version-controlled and reproducible.

---

## Define the AKS Cluster with a System Node Pool

```hcl
# main.tf

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
}

resource "azurerm_resource_group" "rg" {
  name     = "my-rg"
  location = var.location
}

resource "azurerm_kubernetes_cluster" "aks" {
  name                = "my-aks-cluster"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "myaks"

  default_node_pool {
    name                 = "system"
    node_count           = 2
    vm_size              = "Standard_D4s_v3"
    os_disk_size_gb      = 50
    type                 = "VirtualMachineScaleSets"
    auto_scaling_enabled = true
    min_count            = 1
    max_count            = 3
  }

  identity {
    type = "SystemAssigned"
  }
}
```

---

## Add a User Node Pool

```hcl
resource "azurerm_kubernetes_cluster_node_pool" "workloads" {
  name                  = "workloads"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = "Standard_D4s_v3"
  node_count            = 2
  mode                  = "User"

  auto_scaling_enabled = true
  min_count            = 1
  max_count            = 10

  node_labels = {
    "workload-type" = "general"
  }

  node_taints = []
}
```

---

## Add a GPU Node Pool

```hcl
resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpu"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = "Standard_NC6s_v3"
  node_count            = 0
  mode                  = "User"

  auto_scaling_enabled = true
  min_count            = 0
  max_count            = 4

  node_taints = ["sku=gpu:NoSchedule"]

  node_labels = {
    "accelerator" = "nvidia"
  }
}
```

---

## Variables and Outputs

```hcl
# variables.tf

variable "location" {
  description = "Azure region"
  default     = "eastus"
}

# outputs.tf
output "kube_config" {
  value     = azurerm_kubernetes_cluster.aks.kube_config_raw
  sensitive = true
}

output "cluster_id" {
  value = azurerm_kubernetes_cluster.aks.id
}
```

---

## Apply the Configuration

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan

# Fetch kubeconfig after apply
az aks get-credentials --resource-group my-rg --name my-aks-cluster
kubectl get nodes
```

---

## Summary

OpenTofu's `azurerm_kubernetes_cluster` resource defines the default system node pool inline, while additional user pools are declared with `azurerm_kubernetes_cluster_node_pool`. Use node labels and taints to direct workloads to the correct pool, and enable autoscaling to manage cost dynamically.
