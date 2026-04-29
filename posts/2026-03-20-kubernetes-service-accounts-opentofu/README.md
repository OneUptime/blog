# How to Manage Service Accounts with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes service accounts with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Kubernetes service accounts with OpenTofu lets you declare them in HCL alongside your cloud infrastructure. This guide covers the complete configuration for this Kubernetes resource type.

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

resource "kubernetes_service_account_v1" "app" {
  metadata {
    name      = var.service_account_name
    namespace = kubernetes_namespace_v1.app.metadata[0].name

    labels = {
      app         = var.app_name
      environment = var.environment
      managed-by  = "opentofu"
    }
  }

  automount_service_account_token = var.automount_service_account_token
}
```

## Variables

```hcl
variable "namespace"                      { type = string }
variable "app_name"                       { type = string }
variable "environment"                    { type = string }
variable "service_account_name"           { type = string }
variable "kube_context"                   { type = string }
variable "automount_service_account_token" { type = bool; default = true }
```

## Conclusion

Kubernetes service accounts managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Create them in the correct namespace, grant only the RBAC permissions they need, and prefer short-lived tokens via the TokenRequest API instead of relying on long-lived Secret-based tokens.
