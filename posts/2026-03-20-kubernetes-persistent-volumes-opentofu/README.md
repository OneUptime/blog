# How to Manage Persistent Volumes with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes persistent volumes with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Kubernetes storage with OpenTofu lets you declare PersistentVolumeClaims alongside the workloads that use them. This guide covers a namespace, a PersistentVolumeClaim, and a Deployment that mounts the claim.

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

# Persistent storage resources for this workload

resource "kubernetes_persistent_volume_claim_v1" "app_data" {
  metadata {
    name      = "${var.app_name}-data"
    namespace = kubernetes_namespace_v1.app.metadata[0].name

    labels = {
      app         = var.app_name
      environment = var.environment
      managed-by  = "opentofu"
    }
  }

  spec {
    access_modes = [var.access_mode]

    resources {
      requests = {
        storage = var.storage_size
      }
    }

    storage_class_name = var.storage_class_name
  }
}

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

          volume_mount {
            name       = "app-data"
            mount_path = var.mount_path
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

        volume {
          name = "app-data"

          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim_v1.app_data.metadata[0].name
          }
        }
      }
    }
  }
}
```

## Variables

```hcl
variable "namespace" {
  type = string
}

variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "kube_context" {
  type = string
}

variable "replica_count" {
  type    = number
  default = 2
}

variable "image_repository" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "container_port" {
  type    = number
  default = 8080
}

variable "mount_path" {
  type    = string
  default = "/data"
}

variable "storage_size" {
  type    = string
  default = "10Gi"
}

variable "storage_class_name" {
  type = string
}

variable "access_mode" {
  type    = string
  default = "ReadWriteOnce"
}

variable "cpu_request" {
  type    = string
  default = "100m"
}

variable "memory_request" {
  type    = string
  default = "128Mi"
}

variable "cpu_limit" {
  type    = string
  default = "500m"
}

variable "memory_limit" {
  type    = string
  default = "512Mi"
}
```

## Conclusion

Persistent storage on Kubernetes is typically requested through PersistentVolumeClaims and then mounted into workloads. Manage the claim and the workload together in OpenTofu, use an appropriate StorageClass for your cluster, and keep the claim in the same namespace as the pods that consume it.
