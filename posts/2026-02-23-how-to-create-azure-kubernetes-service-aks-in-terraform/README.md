# How to Create Azure Kubernetes Service (AKS) in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, AKS, Kubernetes, Infrastructure as Code, DevOps, Containers

Description: Learn how to create and configure an Azure Kubernetes Service (AKS) cluster using Terraform with networking, identity, and monitoring setup included.

---

Running Kubernetes in production requires careful planning around networking, identity management, node sizing, and monitoring. Azure Kubernetes Service takes away the burden of managing the control plane, but you still need to get the cluster configuration right. Terraform lets you define all of this in code so your clusters are reproducible and version-controlled.

This guide walks through creating an AKS cluster from scratch using Terraform, covering everything from the provider setup to networking integration and cluster monitoring.

## Prerequisites

Before you start, make sure you have the following ready:

- Terraform 1.5 or later installed
- Azure CLI authenticated with sufficient permissions
- An Azure subscription with the Microsoft.ContainerService provider registered
- Basic familiarity with Kubernetes concepts

## Provider Configuration

Start by setting up the Azure provider in your Terraform configuration.

```hcl
# versions.tf
# Define required providers and their versions

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

# Configure the Azure provider
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}
```

## Resource Group and Networking

AKS needs a VNet and subnet to operate. You can let AKS create its own networking, but defining it yourself gives you more control over IP ranges and peering.

```hcl
# main.tf
# Create a resource group to hold all resources

resource "azurerm_resource_group" "aks" {
  name     = "rg-aks-production"
  location = "East US"

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}

# Create a virtual network for the AKS cluster
resource "azurerm_virtual_network" "aks" {
  name                = "vnet-aks-production"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name
}

# Create a subnet for the AKS nodes
resource "azurerm_subnet" "aks_nodes" {
  name                 = "snet-aks-nodes"
  resource_group_name  = azurerm_resource_group.aks.name
  virtual_network_name = azurerm_virtual_network.aks.name
  address_prefixes     = ["10.0.1.0/24"]
}
```

## Log Analytics Workspace

Setting up monitoring from the start saves headaches later. AKS integrates with Azure Monitor through a Log Analytics workspace.

```hcl
# monitoring.tf
# Create a Log Analytics workspace for container insights

resource "azurerm_log_analytics_workspace" "aks" {
  name                = "law-aks-production"
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}
```

## The AKS Cluster

Here is where the actual cluster gets defined. Pay attention to the networking profile, identity configuration, and default node pool settings.

```hcl
# cluster.tf
# Create the AKS cluster with Azure CNI networking

resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-production"
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name
  dns_prefix          = "aks-prod"

  # Pin to a specific Kubernetes version for stability
  kubernetes_version = "1.28"

  # The default node pool runs system workloads
  default_node_pool {
    name                = "system"
    node_count          = 3
    vm_size             = "Standard_D4s_v5"
    vnet_subnet_id      = azurerm_subnet.aks_nodes.id
    os_disk_size_gb     = 128
    os_disk_type        = "Managed"
    max_pods            = 50
    type                = "VirtualMachineScaleSets"
    zones               = [1, 2, 3]

    # Enable autoscaling for the default pool
    enable_auto_scaling = true
    min_count           = 3
    max_count           = 5
  }

  # Use a system-assigned managed identity instead of a service principal
  identity {
    type = "SystemAssigned"
  }

  # Azure CNI networking gives each pod its own IP from the subnet
  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    service_cidr      = "10.1.0.0/16"
    dns_service_ip    = "10.1.0.10"
    load_balancer_sku = "standard"
  }

  # Enable container insights for monitoring
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.aks.id
  }

  # Enable Azure AD integration for RBAC
  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
  }

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Container Registry Integration

Most AKS deployments pull images from Azure Container Registry. Grant the cluster permission to do so.

```hcl
# acr.tf
# Create an Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = "acrproduction2026"
  resource_group_name = azurerm_resource_group.aks.name
  location            = azurerm_resource_group.aks.location
  sku                 = "Standard"
  admin_enabled       = false
}

# Allow AKS to pull images from ACR
resource "azurerm_role_assignment" "aks_acr" {
  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.main.id
  skip_service_principal_aad_check = true
}
```

## Outputs

Define outputs so other Terraform configurations or CI/CD pipelines can reference cluster details.

```hcl
# outputs.tf
# Export the cluster name and kubeconfig details

output "cluster_name" {
  value       = azurerm_kubernetes_cluster.main.name
  description = "The name of the AKS cluster"
}

output "cluster_id" {
  value       = azurerm_kubernetes_cluster.main.id
  description = "The resource ID of the AKS cluster"
}

output "kube_config" {
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
  description = "Raw kubeconfig for connecting to the cluster"
}

output "kubelet_identity" {
  value       = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  description = "Object ID of the kubelet managed identity"
}
```

## Variables for Reusability

Extract hard-coded values into variables so the configuration works across environments.

```hcl
# variables.tf
# Define input variables for the AKS configuration

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group"
  default     = "rg-aks-production"
}

variable "location" {
  type        = string
  description = "Azure region for all resources"
  default     = "East US"
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version for the AKS cluster"
  default     = "1.28"
}

variable "node_vm_size" {
  type        = string
  description = "VM size for the default node pool"
  default     = "Standard_D4s_v5"
}

variable "node_count" {
  type        = number
  description = "Initial node count for the default pool"
  default     = 3
}
```

## Deploying the Cluster

Run these commands to deploy your AKS cluster:

```bash
# Initialize Terraform and download providers
terraform init

# Preview what will be created
terraform plan -out=tfplan

# Apply the configuration
terraform apply tfplan
```

After the cluster deploys, grab the kubeconfig:

```bash
# Configure kubectl to use the new cluster
az aks get-credentials --resource-group rg-aks-production --name aks-production
```

## Important Considerations

There are a few things worth keeping in mind when running AKS in production with Terraform.

**Version pinning** matters. Always specify a Kubernetes version explicitly. Letting Azure pick the default version can lead to unexpected upgrades when you re-apply your Terraform configuration.

**Availability zones** should be enabled for production workloads. The configuration above spreads nodes across zones 1, 2, and 3 for high availability.

**Network policy** is disabled by default. The configuration above enables Calico, which lets you define network policies to control pod-to-pod traffic.

**Managed identity** is the recommended approach over service principals. It handles credential rotation automatically and integrates cleanly with other Azure services.

**State management** should use a remote backend like Azure Storage for team environments. Do not store Terraform state locally for production infrastructure.

## What Comes Next

Once your cluster is running, you will probably want to add additional node pools for different workload types, configure ingress controllers, and set up GitOps for application deployments. Check out our guide on [configuring AKS node pools in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-aks-node-pools-in-terraform/view) for the next step.

Terraform gives you a solid foundation for managing AKS clusters. The configuration in this post covers the essential building blocks - networking, identity, monitoring, and container registry integration - that every production cluster needs.
