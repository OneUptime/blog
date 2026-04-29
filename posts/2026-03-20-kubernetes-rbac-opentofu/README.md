# How to Create RBAC Roles and Bindings with OpenTofu on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Kubernetes, Infrastructure as Code, IaC, RBAC, Security

Description: Learn how to create Kubernetes RBAC Roles, ClusterRoles, and bindings for fine-grained access control using OpenTofu.

## Introduction

This guide covers How to Create RBAC Roles and Bindings with OpenTofu on Kubernetes using OpenTofu with production-ready configurations, best practices, and practical examples.

## Prerequisites

- OpenTofu v1.6+
- Access to a Kubernetes cluster and a kubeconfig file with permission to manage RBAC resources
- HashiCorp Kubernetes provider

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
  config_path = "~/.kube/config"
}
```

## Step 2: Define Variables

```hcl
variable "namespace" {
  description = "Namespace for namespaced RBAC resources"
  type        = string
  default     = "rbac-demo"
}

variable "service_account_name" {
  description = "Service account to bind RBAC permissions to"
  type        = string
  default     = "app-reader"
}
```

## Step 3: Create Core Kubernetes Resources

```hcl
# Create a namespace for namespaced RBAC objects
resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = var.namespace
    labels = {
      managed-by = "opentofu"
    }
  }
}

# Create the service account that will receive the RBAC permissions
resource "kubernetes_service_account_v1" "app" {
  metadata {
    name      = var.service_account_name
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
}
```

## Step 4: Create RBAC Roles

```hcl
resource "kubernetes_role_v1" "pod_reader" {
  metadata {
    name      = "${var.namespace}-pod-reader"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_cluster_role_v1" "namespace_reader" {
  metadata {
    name = "${var.namespace}-namespace-reader"
  }

  rule {
    api_groups = [""]
    resources  = ["namespaces"]
    verbs      = ["get", "list", "watch"]
  }
}
```

## Step 5: Create RBAC Bindings

```hcl
resource "kubernetes_role_binding_v1" "pod_reader" {
  metadata {
    name      = "${var.namespace}-pod-reader-binding"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.pod_reader.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account_v1.app.metadata[0].name
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
}

resource "kubernetes_cluster_role_binding_v1" "namespace_reader" {
  metadata {
    name = "${var.namespace}-namespace-reader-binding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role_v1.namespace_reader.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account_v1.app.metadata[0].name
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
}
```

## Step 6: Define Outputs

```hcl
output "namespace" {
  value = kubernetes_namespace_v1.app.metadata[0].name
}

output "service_account" {
  value = kubernetes_service_account_v1.app.metadata[0].name
}

output "role_binding" {
  value = kubernetes_role_binding_v1.pod_reader.metadata[0].name
}

output "cluster_role_binding" {
  value = kubernetes_cluster_role_binding_v1.namespace_reader.metadata[0].name
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Best Practices

- Follow least privilege and grant only the verbs and resources a workload needs
- Prefer namespace-scoped Roles and RoleBindings unless cluster-wide access is required
- Bind permissions to ServiceAccounts used by workloads instead of broad user or group subjects
- Reuse ClusterRoles for common permission sets and bind them only where needed
- Remember that Kubernetes RBAC permissions are additive and do not support deny rules

## Conclusion

You have successfully configured RBAC Roles, ClusterRoles, and bindings on Kubernetes using OpenTofu. This approach lets you manage Kubernetes access control as code and keep permission changes reviewable alongside the rest of your infrastructure. Combine these RBAC resources with your application and cluster modules for a complete infrastructure-as-code workflow.
