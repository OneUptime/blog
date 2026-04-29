# How to Manage Secrets with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes secrets with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Kubernetes Secrets with OpenTofu lets you declare them in HCL alongside your cloud infrastructure. This guide covers the complete configuration for a Kubernetes Secret resource.

## Provider Setup

```hcl
provider "kubernetes" {
  config_path = "~/.kube/config"
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

resource "kubernetes_secret_v1" "app" {
  metadata {
    name      = var.secret_name
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app         = var.app_name
      environment = var.environment
      managed-by  = "opentofu"
    }
  }

  data = {
    username = var.db_username
    password = var.db_password
  }

  type = "kubernetes.io/basic-auth"
}
```

## Variables

```hcl
variable "namespace"          { type = string }
variable "app_name"           { type = string }
variable "environment"        { type = string }
variable "secret_name"        { type = string; default = "app-basic-auth" }
variable "db_username"        { type = string }
variable "db_password"        { type = string; sensitive = true }
```

## Conclusion

Kubernetes Secrets managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Use namespaces for isolation, apply least-privilege access controls, and remember that secret values managed by the Kubernetes provider are stored in OpenTofu state as plain text, so protect your state backend and avoid committing secret values to version control.
