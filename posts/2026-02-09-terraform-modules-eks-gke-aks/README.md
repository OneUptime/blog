# How to Manage Kubernetes Cluster Infrastructure with Terraform Modules for EKS, GKE, and AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Infrastructure-as-Code

Description: Learn how to build reusable Terraform modules for managing managed Kubernetes clusters across AWS EKS, Google GKE, and Azure AKS with consistent patterns and best practices.

---

Managing Kubernetes infrastructure across multiple cloud providers creates complexity. Each provider has its own resource structure, authentication methods, and configuration patterns. Terraform modules provide a solution by encapsulating cloud-specific implementations behind consistent interfaces.

This guide shows you how to build Terraform modules that work across AWS EKS, Google GKE, and Azure AKS while maintaining flexibility and following best practices for production deployments.

## Understanding Multi-Cloud Module Architecture

Before diving into code, understand the module structure. A well-designed multi-cloud Kubernetes module needs three layers: provider-specific implementation modules, a unified interface module, and workspace configuration that selects the appropriate provider.

The key insight is separating interface from implementation. Your root module should accept generic parameters like cluster name, node count, and machine size. Each provider-specific submodule then translates these into provider-specific resources.

## Building the EKS Module

Start with AWS EKS. The module needs to create the cluster, node groups, and supporting infrastructure like VPC subnets and security groups.

```hcl
# modules/eks/main.tf
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}

variable "node_instance_type" {
  description = "EC2 instance type for nodes"
  type        = string
  default     = "t3.medium"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

# Create the EKS cluster
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy
  ]
}

# IAM role for cluster
resource "aws_iam_role" "cluster" {
  name = "${var.cluster_name}-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

# Managed node group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-nodes"
  node_role_arn   = aws_iam_role.nodes.arn
  subnet_ids      = aws_subnet.private[*].id

  scaling_config {
    desired_size = var.node_count
    max_size     = var.node_count + 2
    min_size     = 1
  }

  instance_types = [var.node_instance_type]

  depends_on = [
    aws_iam_role_policy_attachment.nodes_policy
  ]
}

# IAM role for nodes
resource "aws_iam_role" "nodes" {
  name = "${var.cluster_name}-nodes-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "nodes_policy" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ])

  policy_arn = each.value
  role       = aws_iam_role.nodes.name
}

# Output kubeconfig details
output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "cluster_name" {
  value = aws_eks_cluster.main.name
}

output "cluster_ca_certificate" {
  value = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
}
```

This module handles EKS-specific requirements like IAM roles for both the cluster and nodes. Notice how the node group uses managed scaling configuration to allow automatic scaling later.

## Creating the GKE Module

Google Cloud's GKE has different resource names and authentication patterns. The module structure mirrors EKS but uses GCP-specific resources.

```hcl
# modules/gke/main.tf
variable "cluster_name" {
  description = "Name of the GKE cluster"
  type        = string
}

variable "node_count" {
  description = "Number of worker nodes per zone"
  type        = number
  default     = 1
}

variable "node_machine_type" {
  description = "Machine type for nodes"
  type        = string
  default     = "e2-medium"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

# Create GKE cluster
resource "google_container_cluster" "main" {
  name     = var.cluster_name
  location = var.region

  # Regional cluster with 3 zones
  node_locations = [
    "${var.region}-a",
    "${var.region}-b",
    "${var.region}-c"
  ]

  min_master_version = var.kubernetes_version

  # Remove default node pool immediately
  remove_default_node_pool = true
  initial_node_count       = 1

  # Enable workload identity
  workload_identity_config {
    workload_pool = "${data.google_project.current.project_id}.svc.id.goog"
  }

  # Network configuration
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  ip_allocation_policy {
    cluster_ipv4_cidr_block  = "10.100.0.0/16"
    services_ipv4_cidr_block = "10.101.0.0/16"
  }
}

# Separately managed node pool
resource "google_container_node_pool" "main" {
  name       = "${var.cluster_name}-nodes"
  location   = var.region
  cluster    = google_container_cluster.main.name
  node_count = var.node_count

  node_config {
    machine_type = var.node_machine_type

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      managed_by = "terraform"
    }

    # Enable workload identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }

  autoscaling {
    min_node_count = 1
    max_node_count = var.node_count + 2
  }
}

data "google_project" "current" {}

output "cluster_endpoint" {
  value = google_container_cluster.main.endpoint
}

output "cluster_name" {
  value = google_container_cluster.main.name
}

output "cluster_ca_certificate" {
  value = base64decode(google_container_cluster.main.master_auth[0].cluster_ca_certificate)
}
```

GKE uses workload identity instead of IAM roles, and regional clusters span multiple zones automatically. The module removes the default node pool and creates a separate managed pool with autoscaling enabled.

## Implementing the AKS Module

Azure AKS requires its own module with managed identity support and Azure-specific networking.

```hcl
# modules/aks/main.tf
variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}

variable "node_vm_size" {
  description = "VM size for nodes"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "resource_group_name" {
  description = "Azure resource group name"
  type        = string
}

variable "location" {
  description = "Azure location"
  type        = string
  default     = "eastus"
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = var.node_count
    vm_size             = var.node_vm_size
    enable_auto_scaling = true
    min_count           = 1
    max_count           = var.node_count + 2
    vnet_subnet_id      = azurerm_subnet.aks.id
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin     = "azure"
    network_policy     = "calico"
    load_balancer_sku  = "standard"
    service_cidr       = "10.200.0.0/16"
    dns_service_ip     = "10.200.0.10"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.aks.id
  }

  tags = {
    managed_by = "terraform"
  }
}

# Log Analytics for monitoring
resource "azurerm_log_analytics_workspace" "aks" {
  name                = "${var.cluster_name}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

output "cluster_endpoint" {
  value = azurerm_kubernetes_cluster.main.kube_config[0].host
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "cluster_ca_certificate" {
  value = base64decode(azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate)
}
```

The AKS module uses system-assigned managed identity, which simplifies authentication. It also integrates Log Analytics for cluster monitoring from day one.

## Building the Unified Interface Module

Now create a root module that presents a consistent interface regardless of cloud provider.

```hcl
# main.tf
variable "provider_type" {
  description = "Cloud provider: aws, gcp, or azure"
  type        = string
  validation {
    condition     = contains(["aws", "gcp", "azure"], var.provider_type)
    error_message = "Provider must be aws, gcp, or azure"
  }
}

variable "cluster_name" {
  description = "Name of the cluster"
  type        = string
}

variable "node_count" {
  description = "Number of nodes"
  type        = number
  default     = 3
}

variable "node_size" {
  description = "Node size (maps to provider-specific types)"
  type        = string
  default     = "medium"
}

# Map generic sizes to provider-specific types
locals {
  node_type_map = {
    aws = {
      small  = "t3.small"
      medium = "t3.medium"
      large  = "t3.large"
    }
    gcp = {
      small  = "e2-small"
      medium = "e2-medium"
      large  = "e2-standard-4"
    }
    azure = {
      small  = "Standard_B2s"
      medium = "Standard_D2s_v3"
      large  = "Standard_D4s_v3"
    }
  }
}

module "eks" {
  count               = var.provider_type == "aws" ? 1 : 0
  source              = "./modules/eks"
  cluster_name        = var.cluster_name
  node_count          = var.node_count
  node_instance_type  = local.node_type_map.aws[var.node_size]
}

module "gke" {
  count              = var.provider_type == "gcp" ? 1 : 0
  source             = "./modules/gke"
  cluster_name       = var.cluster_name
  node_count         = var.node_count
  node_machine_type  = local.node_type_map.gcp[var.node_size]
}

module "aks" {
  count               = var.provider_type == "azure" ? 1 : 0
  source              = "./modules/aks"
  cluster_name        = var.cluster_name
  node_count          = var.node_count
  node_vm_size        = local.node_type_map.azure[var.node_size]
  resource_group_name = azurerm_resource_group.main[0].name
  location            = azurerm_resource_group.main[0].location
}

# Azure requires a resource group
resource "azurerm_resource_group" "main" {
  count    = var.provider_type == "azure" ? 1 : 0
  name     = "${var.cluster_name}-rg"
  location = "eastus"
}

output "cluster_endpoint" {
  value = (
    var.provider_type == "aws" ? module.eks[0].cluster_endpoint :
    var.provider_type == "gcp" ? module.gke[0].cluster_endpoint :
    module.aks[0].cluster_endpoint
  )
}
```

This unified module uses conditional logic to instantiate only the selected provider's module. The local map translates generic size names to provider-specific instance types, making configurations portable.

## Using the Module

Deploy a cluster by specifying the provider and common parameters:

```hcl
# terraform.tfvars for AWS
provider_type = "aws"
cluster_name  = "production-cluster"
node_count    = 5
node_size     = "large"
```

Run standard Terraform commands to deploy:

```bash
terraform init
terraform plan
terraform apply
```

To switch to GCP, just change the provider type:

```hcl
provider_type = "gcp"
cluster_name  = "production-cluster"
node_count    = 5
node_size     = "large"
```

The same configuration works across all three providers with minimal changes.

## Managing Multi-Environment Deployments

Use Terraform workspaces to manage multiple clusters:

```bash
# Create production workspace with EKS
terraform workspace new production
terraform apply -var="provider_type=aws"

# Create staging workspace with GKE
terraform workspace new staging
terraform apply -var="provider_type=gcp"
```

Each workspace maintains separate state, allowing you to run different providers in parallel.

## Summary

Terraform modules provide a powerful abstraction for managing Kubernetes infrastructure across multiple cloud providers. By separating interface from implementation, you can build systems that work consistently across AWS EKS, Google GKE, and Azure AKS while preserving provider-specific optimizations. The key is designing a clean interface layer that translates generic parameters into provider-specific configurations, letting teams switch providers without rewriting infrastructure code.
