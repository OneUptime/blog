# How to Configure the Helm Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Helm, Infrastructure as Code, IaC, Helm Provider

Description: Learn how to configure the OpenTofu Helm provider with repository authentication and cluster connection settings.

## Introduction

This guide covers how to configure the Helm provider in OpenTofu with cluster connection settings, repository authentication, and practical `helm_release` examples.

## Prerequisites

- OpenTofu v1.6+
- Access to a Kubernetes cluster and a valid kubeconfig file
- Access to a Helm chart repository; credentials if the repository is private

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.0"
    }
  }
}

provider "helm" {
  kubernetes = {
    config_path    = "~/.kube/config"
    config_context = var.kube_context
  }
}
```

## Step 2: Define Variables

```hcl
variable "kube_context" {
  description = "Kubernetes context to use; leave null to use the kubeconfig default context"
  type        = string
  default     = null
}

variable "namespace" {
  description = "Kubernetes namespace for the Helm release"
  type        = string
  default     = "default"
}

variable "release_name" {
  description = "Helm release name"
  type        = string
  default     = "app"
}

variable "chart_name" {
  description = "Helm chart name"
  type        = string
  default     = "nginx"
}

variable "chart_version" {
  description = "Specific Helm chart version to install; leave null to use the latest version"
  type        = string
  default     = null
}

variable "helm_repository_url" {
  description = "Helm repository URL"
  type        = string
  default     = "https://charts.bitnami.com/bitnami"
}

variable "helm_repository_username" {
  description = "Username for a private Helm repository"
  type        = string
  default     = null
}

variable "helm_repository_password" {
  description = "Password for a private Helm repository"
  type        = string
  sensitive   = true
  default     = null
}
```

## Step 3: Create the Helm Release

```hcl
resource "helm_release" "app" {
  name             = var.release_name
  namespace        = var.namespace
  create_namespace = true

  repository = var.helm_repository_url
  chart      = var.chart_name
  version    = var.chart_version

  wait   = true
  atomic = true
}
```

## Step 4: Configure Workload Values

```hcl
resource "helm_release" "app" {
  # ...existing arguments...

  set = [
    {
      name  = "replicaCount"
      value = "3"
    },
    {
      name  = "service.type"
      value = "ClusterIP"
    }
  ]
}
```

## Step 5: Authenticate to Private Repositories

```hcl
resource "helm_release" "app" {
  # ...existing arguments...

  repository_username = var.helm_repository_username
  repository_password = var.helm_repository_password
}
```

## Step 6: Define Outputs

```hcl
output "release_name" {
  value = helm_release.app.name
}

output "release_status" {
  value = helm_release.app.status
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Best Practices

- Pin both provider and chart versions in root modules
- Use `wait` and `atomic` so failed installs surface clearly and roll back automatically
- Store repository credentials in variables or environment variables, not in committed HCL
- Use `set`, `set_sensitive`, or `values` for chart-specific configuration
- Use the provider `registries` configuration for private OCI registries

## Conclusion

You have successfully configured the Helm provider in OpenTofu. This approach lets you manage Helm releases alongside the rest of your infrastructure code. Combine `helm_release` with other OpenTofu providers when you need cloud resources and Kubernetes releases managed in the same workflow.
