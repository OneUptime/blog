# How to Manage Network Policies with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, K8s, Container Orchestration

Description: Learn how to manage Kubernetes network policies with OpenTofu for declarative, version-controlled Kubernetes configuration.

## Introduction

Managing Kubernetes resources with OpenTofu lets you declare them in HCL alongside your cloud infrastructure. This guide covers a complete example configuration for a Kubernetes NetworkPolicy resource. NetworkPolicies are enforced only when your cluster uses a network plugin that supports them.

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

resource "kubernetes_network_policy_v1" "app" {
  metadata {
    name      = "${var.app_name}-ingress"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  spec {
    pod_selector {
      match_labels = {
        app = var.app_name
      }
    }

    ingress {
      from {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = var.allowed_namespace
          }
        }
      }

      ports {
        port     = tostring(var.container_port)
        protocol = "TCP"
      }
    }

    policy_types = ["Ingress"]
  }
}
```

## Variables

```hcl
variable "namespace"          { type = string }
variable "app_name"           { type = string }
variable "environment"        { type = string }
variable "kube_context"       { type = string; default = "default" }
variable "allowed_namespace"  { type = string }
variable "container_port"     { type = number; default = 8080 }
```

## Conclusion

Kubernetes NetworkPolicy resources managed with OpenTofu benefit from the same plan/apply workflow as cloud infrastructure. Use pod and namespace selectors to scope allowed traffic, and remember that the policy only takes effect when your cluster's network plugin supports NetworkPolicy enforcement.
