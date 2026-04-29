# How to Create Ingress Resources with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, IaC, Ingress, Networking

Description: Learn how to create Kubernetes Ingress resources with TLS, path routing, and annotations for HTTP traffic management using OpenTofu.

## Introduction

This guide covers How to Create Ingress Resources with OpenTofu on Kubernetes using OpenTofu with production-ready configurations, best practices, and practical examples.

## Prerequisites

- OpenTofu v1.6+
- Access to a Kubernetes cluster with an installed Ingress controller such as ingress-nginx
- A configured kubeconfig context for the target cluster
- An existing TLS secret in the target namespace, or cert-manager managing it

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.0"
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
  description = "Optional Kubernetes context to use"
  type        = string
  default     = null
  nullable    = true
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "ingress-demo"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "container_image" {
  description = "Container image that serves HTTP on port 8080 and exposes /health"
  type        = string
}

variable "ingress_class_name" {
  description = "IngressClass name handled by your ingress controller"
  type        = string
  default     = "nginx"
}

variable "ingress_host" {
  description = "DNS host name to route with the ingress resource"
  type        = string
  default     = "app.example.com"
}

variable "tls_secret_name" {
  description = "Existing TLS secret used by the ingress resource"
  type        = string
  default     = "app-tls"
}
```

## Step 3: Create Core Kubernetes Resources

```hcl
# Create namespace

resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = var.namespace
    labels = {
      environment = var.environment
      managed-by  = "opentofu"
    }
  }
}

# Resource quota to limit namespace resources
resource "kubernetes_resource_quota_v1" "app" {
  metadata {
    name      = "app-quota"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
  spec {
    hard = {
      "pods"            = "20"
      "requests.cpu"    = "4"
      "requests.memory" = "8Gi"
      "limits.cpu"      = "8"
      "limits.memory"   = "16Gi"
    }
  }
}
```

## Step 4: Deploy Workloads

```hcl
resource "kubernetes_deployment_v1" "app" {
  metadata {
    name      = "app"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
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

          readiness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 5
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
resource "kubernetes_service_v1" "app" {
  metadata {
    name      = "app-service"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
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

resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "app-ingress"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
    annotations = {
      "nginx.ingress.kubernetes.io/ssl-redirect" = "true"
    }
  }

  spec {
    ingress_class_name = var.ingress_class_name

    tls {
      hosts       = [var.ingress_host]
      secret_name = var.tls_secret_name
    }

    rule {
      host = var.ingress_host

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service_v1.app.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }

        path {
          path      = "/health"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service_v1.app.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}
```

## Step 6: Define Outputs

```hcl
output "namespace" {
  value = kubernetes_namespace_v1.app.metadata[0].name
}

output "service_cluster_ip" {
  value = kubernetes_service_v1.app.spec[0].cluster_ip
}

output "ingress_name" {
  value = kubernetes_ingress_v1.app.metadata[0].name
}

output "ingress_endpoint" {
  value = try(
    kubernetes_ingress_v1.app.status[0].load_balancer[0].ingress[0].hostname,
    kubernetes_ingress_v1.app.status[0].load_balancer[0].ingress[0].ip,
    null
  )
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

You have successfully configured How to Create Ingress Resources with OpenTofu on Kubernetes using OpenTofu. This approach enables GitOps-style management of Kubernetes resources alongside your infrastructure code. Combine OpenTofu Kubernetes resources with Helm releases for a complete infrastructure-as-code solution.
