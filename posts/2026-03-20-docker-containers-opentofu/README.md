# How to Create Docker Containers with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Docker, Infrastructure as Code, IaC, Container

Description: Learn how to create and manage Docker containers with environment variables, volume mounts, and port bindings using OpenTofu.

## Introduction

This guide covers How to Create Docker Containers with OpenTofu using OpenTofu with production-ready configurations, best practices, and practical examples.

## Prerequisites

- OpenTofu v1.6+
- Access to a Kubernetes cluster or Docker daemon
- Relevant provider configured

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.kube_context
}
```

## Step 2: Define Variables

```hcl
variable "kube_context" {
  description = "Kubernetes context to use"
  type        = string
  default     = "default"
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "default"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "container_image" {
  description = "Container image to deploy"
  type        = string
}
```

## Step 3: Create Core Kubernetes Resources

```hcl
# Create namespace

resource "kubernetes_namespace" "app" {
  metadata {
    name = var.namespace
    labels = {
      environment = var.environment
      managed-by  = "opentofu"
    }
  }
}

# Resource quota to limit namespace resources
resource "kubernetes_resource_quota" "app" {
  metadata {
    name      = "app-quota"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  spec {
    hard = {
      pods               = "20"
      requests_cpu       = "4"
      requests_memory    = "8Gi"
      limits_cpu         = "8"
      limits_memory      = "16Gi"
    }
  }
}
```

## Step 4: Deploy Workloads

```hcl
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "app"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app         = "my-app"
      environment = var.environment
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = var.container_image

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }
        }
      }
    }
  }
}
```

## Step 5: Expose the Workload

```hcl
resource "kubernetes_service" "app" {
  metadata {
    name      = "app-service"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    selector = {
      app = "my-app"
    }

    port {
      port        = 80
      target_port = 8080
    }

    type = "ClusterIP"
  }
}
```

## Step 6: Define Outputs

```hcl
output "namespace" {
  value = kubernetes_namespace.app.metadata[0].name
}

output "service_cluster_ip" {
  value = kubernetes_service.app.spec[0].cluster_ip
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Best Practices

- Always specify resource requests and limits for all containers
- Use namespaces to isolate workloads and apply resource quotas
- Label all resources for easy selection and management
- Use liveness and readiness probes to ensure workload health
- Never run containers as root; use security contexts

## Conclusion

You have successfully configured How to Create Docker Containers with OpenTofu using OpenTofu. This approach enables GitOps-style management of Kubernetes resources alongside your infrastructure code. Combine OpenTofu Kubernetes resources with Helm releases for a complete infrastructure-as-code solution.
