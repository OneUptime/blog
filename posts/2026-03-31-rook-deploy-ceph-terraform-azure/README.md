# How to Deploy Ceph with Terraform on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Terraform, Azure, Kubernetes, Infrastructure as Code

Description: Use Terraform to provision an AKS cluster with Azure Managed Disks and deploy Rook-Ceph for distributed storage on Microsoft Azure.

---

Azure Kubernetes Service (AKS) combined with Azure Managed Disks provides the compute and storage foundation for Rook-Ceph on Azure. Terraform automates the entire provisioning workflow.

## Project Structure

```text
ceph-azure/
  main.tf
  aks.tf
  rook.tf
  variables.tf
  outputs.tf
```

## Azure Provider Setup

```hcl
# main.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "ceph" {
  name     = "${var.prefix}-ceph-rg"
  location = var.location
}

resource "azurerm_virtual_network" "ceph" {
  name                = "${var.prefix}-ceph-vnet"
  address_space       = ["10.0.0.0/8"]
  location            = azurerm_resource_group.ceph.location
  resource_group_name = azurerm_resource_group.ceph.name
}

resource "azurerm_subnet" "ceph" {
  name                 = "ceph-subnet"
  resource_group_name  = azurerm_resource_group.ceph.name
  virtual_network_name = azurerm_virtual_network.ceph.name
  address_prefixes     = ["10.1.0.0/16"]
}
```

## AKS Cluster with Storage Node Pool

```hcl
# aks.tf
resource "azurerm_kubernetes_cluster" "ceph" {
  name                = "${var.prefix}-ceph-aks"
  location            = azurerm_resource_group.ceph.location
  resource_group_name = azurerm_resource_group.ceph.name
  dns_prefix          = "${var.prefix}-ceph"

  default_node_pool {
    name       = "system"
    node_count = 2
    vm_size    = "Standard_D2s_v3"
    vnet_subnet_id = azurerm_subnet.ceph.id
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
    service_cidr   = "10.2.0.0/16"
    dns_service_ip = "10.2.0.10"
  }
}

resource "azurerm_kubernetes_cluster_node_pool" "ceph_storage" {
  name                  = "cephstorage"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.ceph.id
  vm_size               = "Standard_L8s_v3"
  node_count            = var.osd_node_count
  vnet_subnet_id        = azurerm_subnet.ceph.id

  node_labels = {
    role = "ceph-storage"
  }

  node_taints = ["dedicated=ceph:NoSchedule"]

  os_disk_size_gb = 128
  os_disk_type    = "Managed"
}
```

## Azure Managed Disk Provisioning

```hcl
resource "azurerm_managed_disk" "ceph_osd" {
  count = var.osd_node_count * var.osds_per_node

  name                 = "${var.prefix}-ceph-osd-${count.index}"
  location             = azurerm_resource_group.ceph.location
  resource_group_name  = azurerm_resource_group.ceph.name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = var.osd_disk_size_gb

  tags = {
    purpose = "ceph-osd"
  }
}
```

## Rook-Ceph via Helm

```hcl
# rook.tf
provider "helm" {
  kubernetes {
    host                   = azurerm_kubernetes_cluster.ceph.kube_config[0].host
    client_key             = base64decode(azurerm_kubernetes_cluster.ceph.kube_config[0].client_key)
    client_certificate     = base64decode(azurerm_kubernetes_cluster.ceph.kube_config[0].client_certificate)
    cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.ceph.kube_config[0].cluster_ca_certificate)
  }
}

resource "helm_release" "rook_operator" {
  name             = "rook-ceph"
  repository       = "https://charts.rook.io/release"
  chart            = "rook-ceph"
  version          = "v1.13.0"
  namespace        = "rook-ceph"
  create_namespace = true

  depends_on = [
    azurerm_kubernetes_cluster_node_pool.ceph_storage
  ]
}

resource "helm_release" "rook_cluster" {
  name       = "rook-ceph-cluster"
  repository = "https://charts.rook.io/release"
  chart      = "rook-ceph-cluster"
  version    = "v1.13.0"
  namespace  = "rook-ceph"

  set {
    name  = "cephClusterSpec.storage.useAllDevices"
    value = "false"
  }

  depends_on = [helm_release.rook_operator]
}
```

## Variables and Outputs

```hcl
# variables.tf
variable "prefix" { type = string; default = "prod" }
variable "location" { type = string; default = "eastus" }
variable "osd_node_count" { type = number; default = 3 }
variable "osds_per_node" { type = number; default = 2 }
variable "osd_disk_size_gb" { type = number; default = 512 }

# outputs.tf
output "kubeconfig_command" {
  value = "az aks get-credentials --resource-group ${azurerm_resource_group.ceph.name} --name ${azurerm_kubernetes_cluster.ceph.name}"
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.ceph.name
}
```

## Deploying

```bash
terraform init
terraform apply -var="prefix=myorg"

# Get credentials
az aks get-credentials --resource-group myorg-ceph-rg --name myorg-ceph-aks

# Verify
kubectl -n rook-ceph get pods -w
```

## Summary

Deploying Rook-Ceph on Azure with Terraform provisions AKS with dedicated storage node pools and encrypted Premium Managed Disks. The Terraform configuration manages the full stack from virtual network to Rook Helm chart, enabling consistent deployments across development, staging, and production environments on Azure.
