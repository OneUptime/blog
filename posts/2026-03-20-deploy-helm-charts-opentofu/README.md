# How to Manage Helm Charts with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes helm charts with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Helm charts with OpenTofu lets you declare releases in HCL alongside your cloud infrastructure. This guide covers the complete configuration for the `helm_release` resource.

## Provider Setup

```hcl
provider "helm" {
  kubernetes {
    config_path    = "~/.kube/config"
    config_context = var.kube_context
  }
}
```

## Resource Configuration

```hcl
resource "helm_release" "app" {
  name             = var.release_name
  repository       = var.chart_repository
  chart            = var.chart_name
  version          = var.chart_version
  namespace        = var.namespace
  create_namespace = true

  values = [
    file("${path.module}/values.yaml")
  ]

  set {
    name  = "image.repository"
    value = var.image_repository
  }

  set {
    name  = "image.tag"
    value = var.image_tag
  }

  set {
    name  = "replicaCount"
    value = var.replica_count
  }

  set {
    name  = "resources.requests.cpu"
    value = var.cpu_request
  }

  set {
    name  = "resources.requests.memory"
    value = var.memory_request
  }

  set {
    name  = "resources.limits.cpu"
    value = var.cpu_limit
  }

  set {
    name  = "resources.limits.memory"
    value = var.memory_limit
  }
}
```

## Variables

```hcl
variable "kube_context" {
  type    = string
  default = "default"
}

variable "release_name" {
  type = string
}

variable "chart_repository" {
  type = string
}

variable "chart_name" {
  type = string
}

variable "chart_version" {
  type = string
}

variable "namespace" {
  type = string
}

variable "image_repository" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "replica_count" {
  type    = number
  default = 2
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

Helm releases managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Pin chart versions for reproducibility, set resource requests and limits via `set` blocks or a `values.yaml` file, and leverage OpenTofu's ability to reference Helm release outputs in subsequent cloud resource configurations.
