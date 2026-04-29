# How to Create Kubernetes Cluster Roles and Bindings with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, ClusterRole, OpenTofu, Security, Access Control

Description: Learn how to create Kubernetes ClusterRoles and ClusterRoleBindings with OpenTofu to implement cluster-wide RBAC for users, service accounts, and groups.

## Overview

Kubernetes RBAC controls access to API resources through Roles and ClusterRoles. Roles are namespaced, while ClusterRoles are cluster-scoped and can be bound within a namespace or across all namespaces. ClusterRoleBindings assign those roles cluster-wide to subjects, while RoleBindings can scope a ClusterRole to a single namespace. OpenTofu manages the full RBAC hierarchy.

## Step 1: Create a Read-Only ClusterRole

```hcl
# main.tf - Read-only ClusterRole for monitoring tools

resource "kubernetes_cluster_role_v1" "monitoring_reader" {
  metadata {
    name = "monitoring-reader"
    labels = {
      "rbac.example.com/managed-by" = "opentofu"
    }
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "nodes", "services", "endpoints", "namespaces"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "daemonsets", "statefulsets", "replicasets"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["metrics.k8s.io"]
    resources  = ["nodes", "pods"]
    verbs      = ["get", "list"]
  }
}
```

## Step 2: Create a Custom Application ClusterRole

```hcl
# ClusterRole for applications that need to manage ConfigMaps and Secrets
resource "kubernetes_cluster_role_v1" "app_operator" {
  metadata {
    name = "app-operator"
  }

  # Allow managing ConfigMaps when this ClusterRole is bound
  rule {
    api_groups = [""]
    resources  = ["configmaps"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }

  # Allow reading Secrets (not creating/deleting)
  rule {
    api_groups = [""]
    resources  = ["secrets"]
    verbs      = ["get", "list", "watch"]
  }

  # Allow managing custom resources
  rule {
    api_groups = ["myapp.example.com"]
    resources  = ["*"]
    verbs      = ["*"]
  }
}
```

## Step 3: Bind ClusterRole to Users and Groups

```hcl
# Bind monitoring reader to the monitoring service account
resource "kubernetes_cluster_role_binding_v1" "monitoring_sa_binding" {
  metadata {
    name = "monitoring-reader-binding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role_v1.monitoring_reader.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = "prometheus"
    namespace = "monitoring"
  }
}

# Bind to a group (e.g., from OIDC/LDAP)
resource "kubernetes_cluster_role_binding_v1" "devops_binding" {
  metadata {
    name = "devops-team-binding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "cluster-admin"
  }

  subject {
    kind      = "Group"
    name      = "devops-team"
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Step 4: Namespace-Scoped Role and RoleBinding

```hcl
# Namespace-scoped Role (not Cluster-level)
resource "kubernetes_role_v1" "developer_role" {
  metadata {
    name      = "developer-role"
    namespace = "team-a"
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "pods/log", "services", "configmaps"]
    verbs      = ["get", "list", "watch", "create", "update", "delete"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }
}

resource "kubernetes_role_binding_v1" "developer_binding" {
  metadata {
    name      = "developer-role-binding"
    namespace = "team-a"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.developer_role.metadata[0].name
  }

  subject {
    kind      = "User"
    name      = "developer@example.com"
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Summary

Kubernetes ClusterRoles and ClusterRoleBindings with OpenTofu implement cluster-wide RBAC. Use ClusterRoles for resources that span namespaces (like nodes and PVs) and namespace-scoped Roles for team-specific access. Version-control RBAC definitions in OpenTofu to maintain an auditable access control matrix.
