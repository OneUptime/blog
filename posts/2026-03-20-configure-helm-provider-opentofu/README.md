# How to Manage Helm Provider with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes configure helm provider with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Helm releases with OpenTofu lets you declare chart deployments in HCL alongside your cloud infrastructure. This guide covers the complete configuration for the Helm provider, from authenticating against a cluster to installing a chart with custom values.

## Provider Setup

```hcl
terraform {
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

  set = [
    {
      name  = "image.repository"
      value = var.image_repository
    },
    {
      name  = "image.tag"
      value = var.image_tag
    },
    {
      name  = "replicaCount"
      value = var.replica_count
    },
    {
      name  = "service.type"
      value = var.service_type
    },
    {
      name  = "resources.requests.cpu"
      value = var.cpu_request
    },
    {
      name  = "resources.requests.memory"
      value = var.memory_request
    },
    {
      name  = "resources.limits.cpu"
      value = var.cpu_limit
    },
    {
      name  = "resources.limits.memory"
      value = var.memory_limit
    },
  ]
}
```

## Variables

```hcl
variable "release_name"      { type = string }
variable "namespace"         { type = string }
variable "chart_repository"  { type = string }
variable "chart_name"        { type = string }
variable "chart_version"     { type = string }
variable "kube_context"      { type = string; default = "default" }
variable "image_repository"  { type = string }
variable "image_tag"         { type = string; default = "latest" }
variable "replica_count"     { type = number; default = 2 }
variable "service_type"      { type = string; default = "ClusterIP" }
variable "cpu_request"       { type = string; default = "100m" }
variable "memory_request"    { type = string; default = "128Mi" }
variable "cpu_limit"         { type = string; default = "500m" }
variable "memory_limit"      { type = string; default = "512Mi" }
```

## Conclusion

Helm releases managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Always pin chart versions, check in your values.yaml alongside the configuration, and leverage OpenTofu's ability to reference outputs from cluster resources (EKS, GKE, AKS) so the Helm provider always uses fresh credentials.
