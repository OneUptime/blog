# How to Manage Configmaps with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes configmaps with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Kubernetes ConfigMaps with OpenTofu lets you declare application configuration in HCL alongside your cloud infrastructure. This guide covers the complete configuration for this Kubernetes resource type.

## Provider Setup

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
  config_path = "~/.kube/config"
}
```

Resource Configuration

```hcl
resource "kubernetes_namespace" "app" {
  metadata {
    name = var.namespace

    labels = {
      app         = var.app_name
      environment = var.environment
      managed-by  = "opentofu"
    }
  }
}

# Example ConfigMap for this topic

resource "kubernetes_config_map" "app" {
  metadata {
    name      = "${var.app_name}-config"
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app         = var.app_name
      environment = var.environment
      managed-by  = "opentofu"
    }
  }

  data = var.config_data
}
```

## Variables

```hcl
variable "namespace"   { type = string }
variable "app_name"    { type = string }
variable "environment" { type = string }
variable "config_data" { type = map(string) }
```

## Conclusion

ConfigMaps managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Use ConfigMaps for non-sensitive configuration, use namespaces for isolation, and leverage OpenTofu's ability to reference ConfigMap metadata in subsequent Kubernetes resource configurations.
