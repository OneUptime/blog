# How to Manage Provider Kubeconfig with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes provider kubeconfig with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Kubernetes resources with OpenTofu lets you declare them in HCL alongside your cloud infrastructure. This guide covers the provider configuration and a working example of Kubernetes resources managed by OpenTofu.

## Provider Setup

```hcl
terraform {
  required_providers {
    kubernetes = {
      source = "hashicorp/kubernetes"
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

# Example Kubernetes resource for this topic

resource "kubernetes_deployment" "app" {
  metadata {
    name      = var.app_name
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = var.replica_count

    selector {
      match_labels = {
        app = var.app_name
      }
    }

    template {
      metadata {
        labels = {
          app = var.app_name
        }
      }

      spec {
        container {
          name  = var.app_name
          image = "${var.image_repository}:${var.image_tag}"

          port {
            container_port = var.container_port
          }

          resources {
            requests = {
              cpu    = var.cpu_request
              memory = var.memory_request
            }
            limits = {
              cpu    = var.cpu_limit
              memory = var.memory_limit
            }
          }
        }
      }
    }
  }
}
```

## Variables

```hcl
variable "namespace"          { type = string }
variable "app_name"           { type = string }
variable "environment"        { type = string }
variable "kube_context"       { type = string }
variable "replica_count"      { type = number; default = 2 }
variable "image_repository"   { type = string }
variable "image_tag"          { type = string; default = "latest" }
variable "container_port"     { type = number; default = 8080 }
variable "cpu_request"        { type = string; default = "100m" }
variable "memory_request"     { type = string; default = "128Mi" }
variable "cpu_limit"          { type = string; default = "500m" }
variable "memory_limit"       { type = string; default = "512Mi" }
```

## Conclusion

Kubernetes resources managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Always set resource requests and limits, use namespaces for isolation, and leverage OpenTofu's ability to reference Kubernetes outputs in subsequent cloud resource configurations.
