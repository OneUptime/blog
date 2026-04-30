# How to Deploy Helm Charts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Helm, Infrastructure as Code, IaC, Package Management

Description: Learn how to deploy Helm charts with custom values, version pinning, and lifecycle management using OpenTofu.

## Introduction

This guide covers how to deploy Helm charts with OpenTofu using the Helm provider, version pinning, lifecycle controls, and practical examples.

## Prerequisites

- OpenTofu v1.6+
- Access to a Kubernetes cluster and a kubeconfig file
- A valid Kubernetes context for the target cluster

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
    config_path = "~/.kube/config"
  }
}
```

## Step 2: Define Variables

```hcl
variable "release_name" {
  description = "Helm release name"
  type        = string
  default     = "my-nginx"
}

variable "namespace" {
  description = "Kubernetes namespace for the release"
  type        = string
  default     = "web"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "chart_version" {
  description = "Bitnami NGINX chart version"
  type        = string
  default     = "23.0.3"
}
```

## Step 3: Create Helm Values

```hcl
locals {
  chart_values = yamlencode({
    replicaCount = 3

    service = {
      type = "ClusterIP"
    }

    resources = {
      requests = {
        cpu    = "100m"
        memory = "128Mi"
      }
      limits = {
        cpu    = "500m"
        memory = "512Mi"
      }
    }

    podLabels = {
      environment = var.environment
      "managed-by" = "opentofu"
    }
  })
}
```

## Step 4: Deploy the Helm Chart

```hcl
resource "helm_release" "app" {
  name             = var.release_name
  namespace        = var.namespace
  create_namespace = true

  repository = "oci://registry-1.docker.io/bitnamicharts"
  chart      = "nginx"
  version    = var.chart_version

  atomic          = true
  cleanup_on_fail = true
  wait            = true
  timeout         = 300

  values = [local.chart_values]
}
```

## Step 5: Control Release Lifecycle

The `version`, `atomic`, `cleanup_on_fail`, `wait`, and `timeout` settings in the `helm_release` resource pin the chart version and make installs and upgrades safer.

## Step 6: Define Outputs

```hcl
output "release_name" {
  value = helm_release.app.name
}

output "release_namespace" {
  value = helm_release.app.namespace
}

output "release_status" {
  value = helm_release.app.status
}

output "chart_version" {
  value = helm_release.app.metadata[0].version
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Best Practices

- Pin chart versions instead of relying on the latest chart release
- Use `atomic`, `cleanup_on_fail`, and `wait` for safer Helm release upgrades
- Prefer `values = [yamlencode(...)]` or checked-in values files for structured Helm overrides
- Use namespaces to isolate releases across environments
- Review chart-specific prerequisites and security settings before deploying to production

## Conclusion

You have successfully configured a Helm chart deployment with OpenTofu. This approach lets OpenTofu manage Helm release installation, upgrades, and rollbacks alongside the rest of your infrastructure code.
