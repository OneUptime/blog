# How to Create Kubernetes RBAC Roles and Bindings with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, RBAC, Security, Access Control, Infrastructure as Code

Description: How to create Kubernetes RBAC Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings with Terraform for secure access control.

---

Role-Based Access Control (RBAC) is how you control who can do what in a Kubernetes cluster. Without proper RBAC, anyone with cluster access can read Secrets, delete Deployments, or modify critical system components. Setting up RBAC through Terraform means your security policies are version-controlled, auditable, and consistently applied across clusters.

This guide covers creating Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings with Terraform, following the principle of least privilege.

## RBAC Concepts

Before writing code, here is a quick overview of the RBAC components:

- **Role** - Defines permissions within a specific namespace
- **ClusterRole** - Defines permissions cluster-wide (or can be reused across namespaces)
- **RoleBinding** - Grants a Role to a user, group, or ServiceAccount within a namespace
- **ClusterRoleBinding** - Grants a ClusterRole cluster-wide

The general pattern is: create a Role or ClusterRole that defines what actions are allowed, then bind it to the subjects who should have those permissions.

## Provider Configuration

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Namespace-Scoped Role

A Role grants permissions within a single namespace.

```hcl
# role.tf - Developer role for a specific namespace
resource "kubernetes_role" "developer" {
  metadata {
    name      = "developer"
    namespace = "development"

    labels = {
      managed-by = "terraform"
    }
  }

  # Allow reading pods, services, and deployments
  rule {
    api_groups = [""]
    resources  = ["pods", "services", "configmaps"]
    verbs      = ["get", "list", "watch"]
  }

  # Allow managing deployments
  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "replicasets"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }

  # Allow reading pod logs
  rule {
    api_groups = [""]
    resources  = ["pods/log"]
    verbs      = ["get", "list"]
  }

  # Allow exec into pods for debugging
  rule {
    api_groups = [""]
    resources  = ["pods/exec"]
    verbs      = ["create"]
  }

  # Allow port-forwarding to pods
  rule {
    api_groups = [""]
    resources  = ["pods/portforward"]
    verbs      = ["create"]
  }
}
```

## ClusterRole for Cluster-Wide Permissions

ClusterRoles define permissions across all namespaces or for cluster-scoped resources.

```hcl
# clusterrole.tf - Read-only access across all namespaces
resource "kubernetes_cluster_role" "readonly" {
  metadata {
    name = "cluster-readonly"

    labels = {
      managed-by = "terraform"
    }
  }

  # Read access to common resources in all namespaces
  rule {
    api_groups = [""]
    resources  = [
      "pods",
      "services",
      "configmaps",
      "endpoints",
      "namespaces",
      "nodes",
      "persistentvolumeclaims",
      "persistentvolumes",
      "events",
    ]
    verbs = ["get", "list", "watch"]
  }

  # Read access to apps resources
  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs      = ["get", "list", "watch"]
  }

  # Read access to batch resources
  rule {
    api_groups = ["batch"]
    resources  = ["jobs", "cronjobs"]
    verbs      = ["get", "list", "watch"]
  }

  # Read access to networking
  rule {
    api_groups = ["networking.k8s.io"]
    resources  = ["ingresses", "networkpolicies"]
    verbs      = ["get", "list", "watch"]
  }
}
```

## ClusterRole for Specific Resource Operations

```hcl
# operator_clusterrole.tf - ClusterRole for a custom operator
resource "kubernetes_cluster_role" "cert_manager_operator" {
  metadata {
    name = "cert-manager-operator"
  }

  # Full control over certificate resources
  rule {
    api_groups = ["cert-manager.io"]
    resources  = ["certificates", "issuers", "clusterissuers"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }

  # Read and update secrets (for storing certificate private keys)
  rule {
    api_groups = [""]
    resources  = ["secrets"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }

  # Read services and ingresses to validate challenges
  rule {
    api_groups = [""]
    resources  = ["services"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["networking.k8s.io"]
    resources  = ["ingresses"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }

  # Events for status reporting
  rule {
    api_groups = [""]
    resources  = ["events"]
    verbs      = ["create", "patch"]
  }
}
```

## RoleBinding - Bind Role to Users

A RoleBinding grants a Role's permissions to subjects within a namespace.

```hcl
# rolebinding.tf - Bind the developer role to a group
resource "kubernetes_role_binding" "dev_team" {
  metadata {
    name      = "dev-team-binding"
    namespace = "development"
  }

  # Reference the Role
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.developer.metadata[0].name
  }

  # Bind to a group
  subject {
    kind      = "Group"
    name      = "dev-team"
    api_group = "rbac.authorization.k8s.io"
  }

  # Bind to a specific user
  subject {
    kind      = "User"
    name      = "jane@example.com"
    api_group = "rbac.authorization.k8s.io"
  }

  # Bind to a ServiceAccount
  subject {
    kind      = "ServiceAccount"
    name      = "ci-deployer"
    namespace = "development"
  }
}
```

## ClusterRoleBinding - Grant Cluster-Wide Access

```hcl
# clusterrolebinding.tf - Grant read-only access cluster-wide
resource "kubernetes_cluster_role_binding" "readonly_binding" {
  metadata {
    name = "cluster-readonly-binding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.readonly.metadata[0].name
  }

  # All members of the ops-team group get read-only access
  subject {
    kind      = "Group"
    name      = "ops-team"
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Common RBAC Patterns

### CI/CD Pipeline Access

```hcl
# cicd_rbac.tf - Permissions for a CI/CD pipeline
resource "kubernetes_service_account" "cicd" {
  metadata {
    name      = "cicd-deployer"
    namespace = "default"
  }
}

resource "kubernetes_cluster_role" "cicd_deployer" {
  metadata {
    name = "cicd-deployer"
  }

  # Deploy applications
  rule {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }

  # Manage services
  rule {
    api_groups = [""]
    resources  = ["services"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }

  # Manage configmaps and secrets
  rule {
    api_groups = [""]
    resources  = ["configmaps", "secrets"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }

  # Check deployment status
  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list", "watch"]
  }

  # Manage ingress routes
  rule {
    api_groups = ["networking.k8s.io"]
    resources  = ["ingresses"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }
}

# Bind to specific namespaces rather than cluster-wide
resource "kubernetes_role_binding" "cicd_production" {
  metadata {
    name      = "cicd-deployer"
    namespace = "production"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.cicd_deployer.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.cicd.metadata[0].name
    namespace = "default"
  }
}
```

### Per-Team Namespace Access

```hcl
# team_rbac.tf - Create RBAC for multiple teams
variable "teams" {
  type = map(object({
    namespace   = string
    group_name  = string
    permissions = string  # "admin", "developer", or "readonly"
  }))
  default = {
    frontend = {
      namespace   = "frontend"
      group_name  = "frontend-team"
      permissions = "admin"
    }
    backend = {
      namespace   = "backend"
      group_name  = "backend-team"
      permissions = "developer"
    }
    data = {
      namespace   = "data-pipeline"
      group_name  = "data-team"
      permissions = "developer"
    }
  }
}

# Bind built-in ClusterRoles to teams in their namespaces
resource "kubernetes_role_binding" "team_access" {
  for_each = var.teams

  metadata {
    name      = "${each.key}-access"
    namespace = each.value.namespace
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    # Use Kubernetes built-in ClusterRoles
    name = each.value.permissions == "admin" ? "admin" : (
      each.value.permissions == "developer" ? "edit" : "view"
    )
  }

  subject {
    kind      = "Group"
    name      = each.value.group_name
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Restricting Access to Specific Resources by Name

You can limit access to specific named resources using `resource_names`.

```hcl
# restricted_role.tf - Access to specific ConfigMaps only
resource "kubernetes_role" "app_config_reader" {
  metadata {
    name      = "app-config-reader"
    namespace = "production"
  }

  rule {
    api_groups     = [""]
    resources      = ["configmaps"]
    resource_names = ["app-config", "feature-flags"]
    verbs          = ["get", "watch"]
  }

  rule {
    api_groups     = [""]
    resources      = ["secrets"]
    resource_names = ["app-tls-cert"]
    verbs          = ["get"]
  }
}
```

## Auditing RBAC Configuration

After setting up RBAC, verify that it works as expected.

```bash
# Check if a user can perform a specific action
kubectl auth can-i create deployments --namespace=production --as=jane@example.com

# Check what a ServiceAccount can do
kubectl auth can-i --list --as=system:serviceaccount:default:cicd-deployer

# Get all role bindings in a namespace
kubectl get rolebindings -n production -o wide
```

## Monitoring Access Patterns

RBAC misconfigurations can lock out legitimate users or leave security gaps. Monitor audit logs for denied requests (which indicate either insufficient permissions or unauthorized access attempts) and for unusual access patterns. [OneUptime](https://oneuptime.com) can monitor the applications and services that depend on proper RBAC configuration, helping you catch issues when permission changes affect application behavior.

## Summary

Kubernetes RBAC managed through Terraform gives you auditable, version-controlled access control. The key principles are: use namespace-scoped Roles when possible (they are easier to reason about), leverage Kubernetes built-in ClusterRoles (admin, edit, view) before creating custom ones, always follow least privilege, and use `for_each` to manage team permissions consistently. Binding ClusterRoles to RoleBindings (rather than ClusterRoleBindings) lets you reuse permission sets while still restricting access to specific namespaces.

For the ServiceAccount side of RBAC, see [Kubernetes ServiceAccounts with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-serviceaccounts-with-terraform/view).
