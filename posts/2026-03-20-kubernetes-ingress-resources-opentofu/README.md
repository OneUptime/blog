# How to Manage Ingress Resources with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes ingress resources with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Kubernetes resources with OpenTofu lets you declare them in HCL alongside your cloud infrastructure. This guide covers the complete configuration for this Kubernetes resource type.

## Provider Setup

```hcl
provider "kubernetes" {
  config_path = "~/.kube/config"
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

# Example Kubernetes resources for this topic

resource "kubernetes_deployment_v1" "app" {
  metadata {
    name      = var.app_name
    namespace = kubernetes_namespace_v1.app.metadata[0].name
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

resource "kubernetes_service_v1" "app" {
  metadata {
    name      = "${var.app_name}-service"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
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

resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "${var.app_name}-ingress"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  spec {
    ingress_class_name = var.ingress_class_name

    rule {
      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service_v1.app.metadata[0].name

              port {
                number = var.service_port
              }
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
variable "ingress_class_name" { type = string }
variable "replica_count"      { type = number; default = 2 }
variable "image_repository"   { type = string }
variable "image_tag"          { type = string; default = "latest" }
variable "container_port"     { type = number; default = 8080 }
variable "service_port"       { type = number; default = 80 }
variable "cpu_request"        { type = string; default = "100m" }
variable "memory_request"     { type = string; default = "128Mi" }
variable "cpu_limit"          { type = string; default = "500m" }
variable "memory_limit"       { type = string; default = "512Mi" }
```

## Conclusion

Kubernetes ingress resources managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Always ensure your ingress points to an existing Service in the same namespace, specify a `path_type` for each route, and set `ingress_class_name` when your cluster does not define a default IngressClass.
