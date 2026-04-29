# How to Manage Services with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes services with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Kubernetes Services with OpenTofu lets you declare them in HCL alongside your cloud infrastructure. This guide covers a complete configuration for exposing an application with a Kubernetes Service.

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

# Example Kubernetes resources for this topic

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

resource "kubernetes_service" "app" {
  metadata {
    name      = var.app_name
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    selector = {
      app = var.app_name
    }

    port {
      port        = var.service_port
      target_port = var.container_port
    }

    type = "ClusterIP"
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
variable "service_port"       { type = number; default = 80 }
variable "container_port"     { type = number; default = 8080 }
variable "cpu_request"        { type = string; default = "100m" }
variable "memory_request"     { type = string; default = "128Mi" }
variable "cpu_limit"          { type = string; default = "500m" }
variable "memory_limit"       { type = string; default = "512Mi" }
```

## Conclusion

Kubernetes Services managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Always set resource requests and limits, use namespaces for isolation, and leverage OpenTofu's ability to reference Kubernetes resource attributes in subsequent cloud resource configurations.
