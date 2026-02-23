# How to Create Kubernetes RBAC with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, RBAC, Security, Infrastructure as Code

Description: Learn how to create and manage Kubernetes Role-Based Access Control using Terraform for consistent and auditable cluster access management.

---

Kubernetes Role-Based Access Control (RBAC) is the standard mechanism for controlling who can do what in your cluster. While kubectl and YAML manifests are common approaches, managing RBAC with Terraform brings the same benefits you get for other infrastructure: version control, plan and apply workflows, and a single source of truth. This guide shows you how to implement comprehensive Kubernetes RBAC using Terraform.

## Understanding Kubernetes RBAC

Kubernetes RBAC consists of four main resources. Roles define a set of permissions within a namespace. ClusterRoles define permissions across the entire cluster. RoleBindings grant a Role to a user, group, or service account within a namespace. ClusterRoleBindings grant a ClusterRole across the entire cluster.

## Setting Up the Provider

```hcl
# Configure the Kubernetes provider
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# Connect to your cluster using kubeconfig
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster-context"
}
```

## Creating Namespace-Scoped Roles

Start with namespace-scoped roles for team access:

```hcl
# Create a namespace for the development team
resource "kubernetes_namespace" "development" {
  metadata {
    name = "development"
    labels = {
      team        = "developers"
      environment = "dev"
    }
  }
}

# Create a Role that allows common developer actions
resource "kubernetes_role" "developer" {
  metadata {
    name      = "developer"
    namespace = kubernetes_namespace.development.metadata[0].name
  }

  # Allow full access to pods
  rule {
    api_groups = [""]
    resources  = ["pods", "pods/log", "pods/exec"]
    verbs      = ["get", "list", "watch", "create", "update", "delete"]
  }

  # Allow managing deployments
  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "replicasets"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }

  # Allow managing services
  rule {
    api_groups = [""]
    resources  = ["services", "endpoints"]
    verbs      = ["get", "list", "watch", "create", "update", "delete"]
  }

  # Allow managing configmaps and secrets (read-only for secrets)
  rule {
    api_groups = [""]
    resources  = ["configmaps"]
    verbs      = ["get", "list", "watch", "create", "update", "delete"]
  }

  rule {
    api_groups = [""]
    resources  = ["secrets"]
    verbs      = ["get", "list", "watch"]
  }
}

# Bind the developer role to a group
resource "kubernetes_role_binding" "developer" {
  metadata {
    name      = "developer-binding"
    namespace = kubernetes_namespace.development.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.developer.metadata[0].name
  }

  # Bind to a group (sourced from your identity provider)
  subject {
    kind      = "Group"
    name      = "dev-team"
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Creating ClusterRoles

ClusterRoles apply across all namespaces:

```hcl
# Create a ClusterRole for viewing resources across all namespaces
resource "kubernetes_cluster_role" "cluster_viewer" {
  metadata {
    name = "cluster-viewer"
    labels = {
      "rbac.example.com/aggregate-to-monitoring" = "true"
    }
  }

  # Allow reading all core resources
  rule {
    api_groups = [""]
    resources  = ["pods", "services", "nodes", "namespaces", "events"]
    verbs      = ["get", "list", "watch"]
  }

  # Allow reading workload resources
  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs      = ["get", "list", "watch"]
  }

  # Allow reading ingresses
  rule {
    api_groups = ["networking.k8s.io"]
    resources  = ["ingresses", "networkpolicies"]
    verbs      = ["get", "list", "watch"]
  }

  # Allow accessing metrics
  rule {
    api_groups = ["metrics.k8s.io"]
    resources  = ["pods", "nodes"]
    verbs      = ["get", "list"]
  }
}

# Bind the ClusterRole to the operations team
resource "kubernetes_cluster_role_binding" "cluster_viewer" {
  metadata {
    name = "cluster-viewer-binding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.cluster_viewer.metadata[0].name
  }

  subject {
    kind      = "Group"
    name      = "ops-team"
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Service Account RBAC

Create service accounts with specific permissions for your applications:

```hcl
# Create a service account for the application
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "app-service-account"
    namespace = kubernetes_namespace.development.metadata[0].name
    annotations = {
      "description" = "Service account for the main application"
    }
  }
}

# Create a Role with minimal permissions for the application
resource "kubernetes_role" "app_role" {
  metadata {
    name      = "app-role"
    namespace = kubernetes_namespace.development.metadata[0].name
  }

  # Allow reading configmaps for configuration
  rule {
    api_groups = [""]
    resources  = ["configmaps"]
    verbs      = ["get", "watch"]
    # Restrict to specific configmap names
    resource_names = ["app-config", "app-feature-flags"]
  }

  # Allow reading secrets for credentials
  rule {
    api_groups     = [""]
    resources      = ["secrets"]
    verbs          = ["get"]
    resource_names = ["app-db-credentials", "app-api-keys"]
  }
}

# Bind the role to the service account
resource "kubernetes_role_binding" "app_role" {
  metadata {
    name      = "app-role-binding"
    namespace = kubernetes_namespace.development.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.app_role.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.app.metadata[0].name
    namespace = kubernetes_namespace.development.metadata[0].name
  }
}
```

## Dynamic RBAC with Terraform Variables

Manage RBAC for multiple teams and namespaces using loops:

```hcl
# Define team configurations
variable "teams" {
  type = map(object({
    namespace   = string
    group_name  = string
    permissions = string  # "admin", "developer", or "viewer"
  }))
  default = {
    "frontend" = {
      namespace   = "frontend"
      group_name  = "frontend-team"
      permissions = "developer"
    }
    "backend" = {
      namespace   = "backend"
      group_name  = "backend-team"
      permissions = "developer"
    }
    "data" = {
      namespace   = "data-pipeline"
      group_name  = "data-team"
      permissions = "admin"
    }
    "qa" = {
      namespace   = "staging"
      group_name  = "qa-team"
      permissions = "viewer"
    }
  }
}

# Create namespaces for each team
resource "kubernetes_namespace" "team" {
  for_each = var.teams

  metadata {
    name = each.value.namespace
    labels = {
      team = each.key
    }
  }
}

# Map permission levels to verb sets
locals {
  permission_verbs = {
    "admin"     = ["get", "list", "watch", "create", "update", "patch", "delete"]
    "developer" = ["get", "list", "watch", "create", "update", "patch"]
    "viewer"    = ["get", "list", "watch"]
  }
}

# Create a Role for each team
resource "kubernetes_role" "team" {
  for_each = var.teams

  metadata {
    name      = "${each.key}-role"
    namespace = kubernetes_namespace.team[each.key].metadata[0].name
  }

  rule {
    api_groups = ["", "apps", "batch"]
    resources  = ["pods", "deployments", "services", "configmaps", "jobs", "cronjobs"]
    verbs      = local.permission_verbs[each.value.permissions]
  }
}

# Create RoleBindings for each team
resource "kubernetes_role_binding" "team" {
  for_each = var.teams

  metadata {
    name      = "${each.key}-binding"
    namespace = kubernetes_namespace.team[each.key].metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.team[each.key].metadata[0].name
  }

  subject {
    kind      = "Group"
    name      = each.value.group_name
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Aggregated ClusterRoles

Use label-based aggregation to compose ClusterRoles from smaller pieces:

```hcl
# Create an aggregated monitoring ClusterRole
resource "kubernetes_cluster_role" "monitoring_aggregate" {
  metadata {
    name = "monitoring"
  }

  # Aggregate all ClusterRoles with the monitoring label
  aggregation_rule {
    cluster_role_selectors {
      match_labels = {
        "rbac.example.com/aggregate-to-monitoring" = "true"
      }
    }
  }
}

# Component ClusterRole for pod monitoring
resource "kubernetes_cluster_role" "monitoring_pods" {
  metadata {
    name = "monitoring-pods"
    labels = {
      "rbac.example.com/aggregate-to-monitoring" = "true"
    }
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "pods/log"]
    verbs      = ["get", "list", "watch"]
  }
}

# Component ClusterRole for metrics access
resource "kubernetes_cluster_role" "monitoring_metrics" {
  metadata {
    name = "monitoring-metrics"
    labels = {
      "rbac.example.com/aggregate-to-monitoring" = "true"
    }
  }

  rule {
    api_groups = ["metrics.k8s.io"]
    resources  = ["pods", "nodes"]
    verbs      = ["get", "list"]
  }
}
```

## Best Practices

Always use the principle of least privilege. Start with minimal permissions and add more only as needed. Prefer namespace-scoped Roles over ClusterRoles when possible. Use groups instead of individual users for RoleBindings so that access is managed through your identity provider. Restrict service accounts to only the specific resources they need by using resource_names. Regularly review RBAC configurations and remove unused bindings.

For integrating Kubernetes RBAC with cloud provider IAM, see our guide on [multi-cloud IAM with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-multi-cloud-iam-with-terraform/view).

## Conclusion

Managing Kubernetes RBAC with Terraform provides a structured, version-controlled approach to cluster access management. From namespace-scoped developer roles to cluster-wide viewer access and service account permissions, Terraform handles the full spectrum of Kubernetes authorization. By using variables and loops, you can scale RBAC management across many teams and namespaces while maintaining consistency and auditability.
