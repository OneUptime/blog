# How to Manage Helm Values Files with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes helm values files with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Helm releases with OpenTofu lets you keep chart configuration in version-controlled values files while declaring the release in HCL alongside your infrastructure. This guide covers a complete configuration for passing Helm values files to Kubernetes with OpenTofu.

## Provider Setup

```hcl
terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.1"
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

Resource Configuration

```hcl
resource "helm_release" "app" {
  name             = var.release_name
  repository       = var.chart_repository
  chart            = var.chart_name
  version          = var.chart_version
  namespace        = var.namespace
  create_namespace = true

  values = [
    file("${path.module}/values/common.yaml"),
    file("${path.module}/values/${var.environment}.yaml")
  ]
}
```

## Variables

```hcl
variable "release_name"     { type = string }
variable "chart_repository" { type = string }
variable "chart_name"       { type = string }
variable "chart_version"    { type = string }
variable "namespace"        { type = string }
variable "environment"      { type = string }
variable "kube_context"     { type = string }
```

## Conclusion

Helm releases managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Keep base and environment-specific values files in version control, pass them through the `values` argument, and remember that later values files override earlier ones using Helm's normal precedence rules.
