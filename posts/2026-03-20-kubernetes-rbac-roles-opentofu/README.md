# How to Manage Rbac Roles with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes rbac roles with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Kubernetes resources with OpenTofu lets you declare them in HCL alongside your cloud infrastructure. This guide covers the complete configuration for this Kubernetes resource type.

## Provider Setup

```hcl
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 3.0.0"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.kube_context
}
```

Resource Configuration

```hcl
resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = var.namespace

    labels = {
      app         = var.app_name
      environment = var.environment
      managed-by  = "opentofu"
    }
  }
}

# Example Kubernetes RBAC resource for this topic

resource "kubernetes_role_v1" "app" {
  metadata {
    name      = "${var.app_name}-reader"
    namespace = kubernetes_namespace_v1.app.metadata[0].name

    labels = {
      app         = var.app_name
      environment = var.environment
      managed-by  = "opentofu"
    }
  }

  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["get", "list", "watch"]
  }
}
```

## Variables

```hcl
variable "namespace"          { type = string }
variable "app_name"           { type = string }
variable "environment"        { type = string }
variable "kube_context"       { type = string }
```

## Conclusion

Kubernetes RBAC resources managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Use a Role for namespace-scoped permissions, keep rules minimal to follow least privilege, and switch to a ClusterRole only when you need cluster-wide access.
