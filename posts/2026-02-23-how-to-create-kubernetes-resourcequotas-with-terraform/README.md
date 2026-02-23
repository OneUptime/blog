# How to Create Kubernetes ResourceQuotas with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, ResourceQuotas, Resource Management, Infrastructure as Code

Description: How to create Kubernetes ResourceQuotas with Terraform to limit resource consumption per namespace and prevent cluster resource exhaustion.

---

In a shared Kubernetes cluster, one team's runaway deployment can consume all available CPU and memory, starving everyone else's workloads. ResourceQuotas prevent this by setting hard limits on resource consumption per namespace. They are a critical part of multi-tenant cluster management. Managing ResourceQuotas through Terraform ensures your resource boundaries are consistent and auditable.

This guide covers creating ResourceQuotas with Terraform for compute resources, object counts, and storage.

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

## Basic Compute ResourceQuota

Limit CPU and memory consumption in a namespace.

```hcl
# compute_quota.tf - Limit CPU and memory per namespace
resource "kubernetes_resource_quota" "compute" {
  metadata {
    name      = "compute-quota"
    namespace = "team-backend"

    labels = {
      managed-by = "terraform"
    }
  }

  spec {
    hard = {
      # Total CPU requests across all pods
      "requests.cpu" = "10"

      # Total memory requests across all pods
      "requests.memory" = "20Gi"

      # Total CPU limits across all pods
      "limits.cpu" = "20"

      # Total memory limits across all pods
      "limits.memory" = "40Gi"
    }
  }
}
```

When this quota is in place, every pod created in the `team-backend` namespace must specify CPU and memory requests and limits. Kubernetes will reject pods that would push the namespace over its quota.

## Object Count Quota

Limit the number of specific resource types in a namespace.

```hcl
# object_quota.tf - Limit the number of resources
resource "kubernetes_resource_quota" "object_counts" {
  metadata {
    name      = "object-count-quota"
    namespace = "team-backend"
  }

  spec {
    hard = {
      # Maximum number of pods
      pods = "50"

      # Maximum number of services
      services = "20"

      # Maximum number of LoadBalancer services (these cost money)
      "services.loadbalancers" = "2"

      # Maximum number of NodePort services
      "services.nodeports" = "5"

      # Maximum number of ConfigMaps
      configmaps = "30"

      # Maximum number of Secrets
      secrets = "30"

      # Maximum number of PVCs
      persistentvolumeclaims = "10"

      # Maximum number of ReplicationControllers
      replicationcontrollers = "10"
    }
  }
}
```

## Storage Quota

Control how much storage a namespace can consume.

```hcl
# storage_quota.tf - Limit storage usage
resource "kubernetes_resource_quota" "storage" {
  metadata {
    name      = "storage-quota"
    namespace = "team-backend"
  }

  spec {
    hard = {
      # Total storage requested across all PVCs
      "requests.storage" = "500Gi"

      # Number of PVCs
      persistentvolumeclaims = "20"

      # Storage limits per StorageClass
      "ssd.storageclass.storage.k8s.io/requests.storage"          = "200Gi"
      "ssd.storageclass.storage.k8s.io/persistentvolumeclaims"    = "5"
      "standard.storageclass.storage.k8s.io/requests.storage"     = "300Gi"
      "standard.storageclass.storage.k8s.io/persistentvolumeclaims" = "15"
    }
  }
}
```

## Combined Quota

A comprehensive quota covering compute, objects, and storage.

```hcl
# combined_quota.tf - All-in-one quota for a team namespace
resource "kubernetes_resource_quota" "team_quota" {
  metadata {
    name      = "team-quota"
    namespace = "team-backend"
  }

  spec {
    hard = {
      # Compute resources
      "requests.cpu"    = "20"
      "requests.memory" = "40Gi"
      "limits.cpu"      = "40"
      "limits.memory"   = "80Gi"

      # Object counts
      pods                   = "100"
      services               = "30"
      "services.loadbalancers" = "3"
      configmaps             = "50"
      secrets                = "50"
      persistentvolumeclaims = "20"

      # Storage
      "requests.storage" = "1Ti"
    }
  }
}
```

## Quota with Scopes

Scopes let you apply quotas to specific types of pods.

```hcl
# scoped_quota.tf - Different limits for different pod priorities
resource "kubernetes_resource_quota" "best_effort" {
  metadata {
    name      = "best-effort-quota"
    namespace = "development"
  }

  spec {
    hard = {
      pods = "20"
    }

    # Only count pods with BestEffort QoS (no resource requests or limits)
    scope_selector {
      match_expression {
        scope_name = "PriorityClass"
        operator   = "In"
        values     = ["low-priority"]
      }
    }
  }
}

resource "kubernetes_resource_quota" "high_priority" {
  metadata {
    name      = "high-priority-quota"
    namespace = "development"
  }

  spec {
    hard = {
      pods             = "10"
      "requests.cpu"   = "20"
      "limits.cpu"     = "40"
      "requests.memory" = "40Gi"
      "limits.memory"  = "80Gi"
    }

    scope_selector {
      match_expression {
        scope_name = "PriorityClass"
        operator   = "In"
        values     = ["high-priority"]
      }
    }
  }
}
```

## Quotas for Multiple Namespaces

Use `for_each` to apply consistent quotas across team namespaces with different sizes.

```hcl
# multi_namespace_quotas.tf - Quotas sized per team
variable "team_quotas" {
  type = map(object({
    namespace       = string
    cpu_request     = string
    memory_request  = string
    cpu_limit       = string
    memory_limit    = string
    max_pods        = string
    max_storage     = string
  }))
  default = {
    small_team = {
      namespace      = "team-design"
      cpu_request    = "4"
      memory_request = "8Gi"
      cpu_limit      = "8"
      memory_limit   = "16Gi"
      max_pods       = "20"
      max_storage    = "100Gi"
    }
    medium_team = {
      namespace      = "team-backend"
      cpu_request    = "16"
      memory_request = "32Gi"
      cpu_limit      = "32"
      memory_limit   = "64Gi"
      max_pods       = "50"
      max_storage    = "500Gi"
    }
    large_team = {
      namespace      = "team-ml"
      cpu_request    = "32"
      memory_request = "128Gi"
      cpu_limit      = "64"
      memory_limit   = "256Gi"
      max_pods       = "100"
      max_storage    = "2Ti"
    }
  }
}

resource "kubernetes_resource_quota" "team_quotas" {
  for_each = var.team_quotas

  metadata {
    name      = "resource-quota"
    namespace = each.value.namespace
  }

  spec {
    hard = {
      "requests.cpu"    = each.value.cpu_request
      "requests.memory" = each.value.memory_request
      "limits.cpu"      = each.value.cpu_limit
      "limits.memory"   = each.value.memory_limit
      pods              = each.value.max_pods
      "requests.storage" = each.value.max_storage
    }
  }
}
```

## Pairing Quotas with LimitRanges

ResourceQuotas require pods to specify resource requests and limits. To avoid requiring every developer to remember this, pair your quota with a LimitRange that sets defaults.

```hcl
# quota_and_limitrange.tf - Quota with default limits
resource "kubernetes_resource_quota" "namespace_quota" {
  metadata {
    name      = "namespace-quota"
    namespace = "team-backend"
  }

  spec {
    hard = {
      "requests.cpu"    = "20"
      "requests.memory" = "40Gi"
      "limits.cpu"      = "40"
      "limits.memory"   = "80Gi"
      pods              = "50"
    }
  }
}

# LimitRange provides default values so pods don't need to specify them
resource "kubernetes_limit_range" "defaults" {
  metadata {
    name      = "default-limits"
    namespace = "team-backend"
  }

  spec {
    limit {
      type = "Container"

      default = {
        cpu    = "500m"
        memory = "512Mi"
      }

      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }
    }
  }
}
```

## Checking Quota Usage

Monitor quota usage to plan capacity.

```bash
# View quota usage for a namespace
kubectl describe resourcequota -n team-backend

# Output shows used vs hard limits:
# Name:            resource-quota
# Namespace:       team-backend
# Resource         Used   Hard
# --------         ----   ----
# limits.cpu       12     40
# limits.memory    24Gi   80Gi
# pods             15     50
# requests.cpu     6      20
# requests.memory  12Gi   40Gi
```

## Monitoring Quota Consumption

Track quota usage over time to understand consumption patterns and plan for growth. When teams consistently hit their quotas, it is time to either optimize their workloads or increase the limits. [OneUptime](https://oneuptime.com) can monitor the services running within quota-constrained namespaces, helping you correlate performance issues with resource pressure.

## Summary

Kubernetes ResourceQuotas are essential for multi-tenant cluster management. They prevent any single namespace from monopolizing cluster resources. With Terraform, you can define quotas as code, size them appropriately per team, and keep them consistent across environments. Always pair ResourceQuotas with LimitRanges to provide sensible defaults, and monitor usage to adjust limits before teams hit hard ceilings.

For per-container resource defaults, see [Kubernetes LimitRanges with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-limitranges-with-terraform/view).
