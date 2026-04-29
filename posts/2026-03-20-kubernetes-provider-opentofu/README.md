# How to Configure the Kubernetes Provider in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, IaC, Kubernetes Provider

Description: Learn how to configure the OpenTofu Kubernetes provider with various authentication methods to manage Kubernetes resources as code.

## Introduction

The Kubernetes provider in OpenTofu allows you to manage Kubernetes resources declaratively. This guide covers provider configuration with different authentication methods including kubeconfig and managed cluster credentials.

## Prerequisites

- OpenTofu v1.6+
- Access to a Kubernetes cluster
- Cloud provider credentials configured for AWS, Google Cloud, or Azure if you use the EKS, GKE, or AKS examples

## Step 1: Configure Provider with Kubeconfig

```hcl
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.0"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"       # Path to kubeconfig file
  config_context = "my-cluster-context"   # Specific context to use
}
```

## Step 2: Configure Provider with EKS Cluster Credentials

```hcl
data "aws_eks_cluster" "main" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "main" {
  name = var.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}
```

## Step 3: Configure Provider with GKE Cluster

```hcl
data "google_container_cluster" "main" {
  name     = var.cluster_name
  location = var.region
  project  = var.project_id
}

data "google_client_config" "default" {}

provider "kubernetes" {
  host                   = "https://${data.google_container_cluster.main.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(data.google_container_cluster.main.master_auth[0].cluster_ca_certificate)
}
```

## Step 4: Configure Provider with AKS Cluster

```hcl
data "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  resource_group_name = var.resource_group_name
}

provider "kubernetes" {
  host                   = data.azurerm_kubernetes_cluster.main.kube_config[0].host
  client_certificate     = base64decode(data.azurerm_kubernetes_cluster.main.kube_config[0].client_certificate)
  client_key             = base64decode(data.azurerm_kubernetes_cluster.main.kube_config[0].client_key)
  cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate)
}
```

## Step 5: Configure Multiple Cluster Providers

```hcl
provider "kubernetes" {
  alias          = "staging"
  config_path    = "~/.kube/config"
  config_context = "staging-cluster"
}

provider "kubernetes" {
  alias          = "production"
  config_path    = "~/.kube/config"
  config_context = "production-cluster"
}

# Deploy to specific cluster

resource "kubernetes_namespace" "staging_ns" {
  provider = kubernetes.staging
  metadata {
    name = "my-app"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have successfully configured the Kubernetes provider for OpenTofu. Dynamic configuration using cloud provider data sources can simplify provider setup for existing managed Kubernetes services by eliminating the need to manually manage kubeconfig files. When you rely on short-lived cloud credentials, prefer cloud-specific authentication methods supported by the provider, such as exec-based plugins, so credentials are refreshed as needed.
