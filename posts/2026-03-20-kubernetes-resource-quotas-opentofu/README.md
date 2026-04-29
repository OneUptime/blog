# How to Create Kubernetes Resource Quotas with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Quota, OpenTofu, Multi-Tenancy, Governance, Infrastructure

Description: Learn how to create Kubernetes Resource Quotas with OpenTofu to limit resource consumption per namespace for fair multi-tenant cluster sharing.

## Overview

Kubernetes Resource Quotas limit the total amount of CPU, memory, storage, and object count that a namespace can consume. They're essential for multi-tenant clusters where multiple teams share the same infrastructure. OpenTofu manages quotas alongside namespaces.

## Step 1: Create a Namespace with Resource Quota

```hcl
# main.tf - Namespace with compute resource quota

resource "kubernetes_namespace_v1" "team_a" {
  metadata {
    name = "team-a"
    labels = {
      team        = "team-a"
      environment = "production"
    }
  }
}

resource "kubernetes_resource_quota_v1" "team_a_quota" {
  metadata {
    name      = "team-a-quota"
    namespace = kubernetes_namespace_v1.team_a.metadata[0].name
  }

  spec {
    hard = {
      # Compute limits
      "requests.cpu"    = "8"      # Total CPU requests across all pods
      "requests.memory" = "16Gi"   # Total memory requests
      "limits.cpu"      = "16"     # Total CPU limits
      "limits.memory"   = "32Gi"   # Total memory limits

      # Object count limits
      "pods"                    = "50"
      "services"                = "20"
      "services.loadbalancers"  = "3"
      "services.nodeports"      = "0"
      "persistentvolumeclaims"  = "20"
      "configmaps"              = "50"
      "secrets"                 = "50"

      # Storage quotas
      "requests.storage"                       = "500Gi"
      "standard.storageclass.storage.k8s.io/requests.storage" = "200Gi"
    }
  }
}
```

## Step 2: Priority Class-Scoped Quotas

```hcl
# Assumes the production namespace and these PriorityClass objects already exist.
# Separate quota for different priority classes
resource "kubernetes_resource_quota_v1" "critical_quota" {
  metadata {
    name      = "critical-quota"
    namespace = "production"
  }

  spec {
    hard = {
      "requests.cpu"    = "20"
      "requests.memory" = "40Gi"
    }

    # Apply only to pods with these priority classes
    scope_selector {
      match_expression {
        scope_name = "PriorityClass"
        operator   = "In"
        values     = ["production-high", "production-critical"]
      }
    }
  }
}

# Separate quota for batch/non-critical workloads
resource "kubernetes_resource_quota_v1" "batch_quota" {
  metadata {
    name      = "batch-quota"
    namespace = "production"
  }

  spec {
    hard = {
      "requests.cpu"    = "4"
      "requests.memory" = "8Gi"
    }

    scope_selector {
      match_expression {
        scope_name = "PriorityClass"
        operator   = "In"
        values     = ["batch-low"]
      }
    }
  }
}
```

## Step 3: Multiple Team Namespaces with Quotas

```hcl
# Define quotas for multiple teams
variable "team_quotas" {
  type = map(object({
    cpu_requests    = string
    memory_requests = string
    cpu_limits      = string
    memory_limits   = string
    max_pods        = string
  }))

  default = {
    "team-backend" = {
      cpu_requests    = "10"
      memory_requests = "20Gi"
      cpu_limits      = "20"
      memory_limits   = "40Gi"
      max_pods        = "100"
    }
    "team-frontend" = {
      cpu_requests    = "4"
      memory_requests = "8Gi"
      cpu_limits      = "8"
      memory_limits   = "16Gi"
      max_pods        = "30"
    }
  }
}

# Create each team namespace before applying its quota
resource "kubernetes_namespace_v1" "team_namespaces" {
  for_each = var.team_quotas

  metadata {
    name = each.key
  }
}

resource "kubernetes_resource_quota_v1" "team_quotas" {
  for_each = var.team_quotas

  metadata {
    name      = "${each.key}-quota"
    namespace = kubernetes_namespace_v1.team_namespaces[each.key].metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = each.value.cpu_requests
      "requests.memory" = each.value.memory_requests
      "limits.cpu"      = each.value.cpu_limits
      "limits.memory"   = each.value.memory_limits
      "pods"            = each.value.max_pods
    }
  }
}
```

## Summary

Kubernetes Resource Quotas with OpenTofu enforce fair resource allocation across namespaces in multi-tenant clusters. Priority class-scoped quotas allow separate budgets for critical and batch workloads within the same namespace. Use `for_each` to manage quotas for multiple teams consistently from a single variable definition.
