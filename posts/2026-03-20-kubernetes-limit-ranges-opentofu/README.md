# How to Create Kubernetes Limit Ranges with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Limit Ranges, OpenTofu, Resource Management, Infrastructure, Multi-Tenancy

Description: Learn how to create Kubernetes Limit Ranges with OpenTofu to enforce default CPU and memory limits on containers and prevent runaway resource consumption.

## Overview

Kubernetes Limit Ranges set default resource requests/limits for containers that don't specify them, and enforce minimum/maximum bounds. Without LimitRanges, containers without resource specs run with unbounded compute resources unless other policies, such as ResourceQuotas, constrain them. OpenTofu manages LimitRanges alongside Resource Quotas.

## Step 1: Create a LimitRange with Defaults

```hcl
# main.tf - LimitRange with defaults for containers

resource "kubernetes_limit_range_v1" "default_limits" {
  metadata {
    name      = "default-container-limits"
    namespace = "production"
  }

  spec {
    limit {
      type = "Container"

      # Default resource limits applied if not specified
      default = {
        cpu    = "500m"
        memory = "512Mi"
      }

      # Default resource requests applied if not specified
      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }

      # Maximum allowed for any single container
      max = {
        cpu    = "4"
        memory = "8Gi"
      }

      # Minimum allowed for any single container
      min = {
        cpu    = "50m"
        memory = "64Mi"
      }

      # Max limit/request ratio (prevents setting limits too high vs requests)
      max_limit_request_ratio = {
        cpu    = "10"
        memory = "4"
      }
    }
  }
}
```

## Step 2: LimitRange for Persistent Volume Claims

```hcl
resource "kubernetes_limit_range_v1" "pvc_limits" {
  metadata {
    name      = "pvc-size-limits"
    namespace = "production"
  }

  spec {
    # Enforce storage bounds on PVCs
    limit {
      type = "PersistentVolumeClaim"

      min = {
        storage = "1Gi"  # Minimum PVC size
      }

      max = {
        storage = "100Gi"  # Maximum PVC size
      }
    }
  }
}
```

## Step 3: LimitRange for Pods

```hcl
resource "kubernetes_limit_range_v1" "pod_limits" {
  metadata {
    name      = "pod-resource-limits"
    namespace = "batch"
  }

  spec {
    # Pod-level limits (sum of all containers in the pod)
    limit {
      type = "Pod"

      max = {
        cpu    = "8"    # Max total CPU across all containers in a pod
        memory = "16Gi" # Max total memory
      }
    }

    # Container-level defaults in this namespace
    limit {
      type = "Container"

      default = {
        cpu    = "200m"
        memory = "256Mi"
      }

      default_request = {
        cpu    = "50m"
        memory = "64Mi"
      }
    }
  }
}
```

## Step 4: Environment-Specific LimitRanges

```hcl
# Alternative pattern: generate one container-default LimitRange per environment namespace.
# Avoid defining multiple LimitRanges with container defaults in the same namespace,
# because Kubernetes does not guarantee which default is applied.
locals {
  namespace_limit_configs = {
    development = {
      default_cpu    = "200m"
      default_memory = "256Mi"
      max_cpu        = "2"
      max_memory     = "4Gi"
    }
    production = {
      default_cpu    = "500m"
      default_memory = "512Mi"
      max_cpu        = "8"
      max_memory     = "16Gi"
    }
  }
}

resource "kubernetes_limit_range_v1" "env_limits" {
  for_each = local.namespace_limit_configs

  metadata {
    name      = "${each.key}-limits"
    namespace = each.key
  }

  spec {
    limit {
      type = "Container"

      default = {
        cpu    = each.value.default_cpu
        memory = each.value.default_memory
      }

      default_request = {
        cpu    = each.value.default_cpu
        memory = each.value.default_memory
      }

      max = {
        cpu    = each.value.max_cpu
        memory = each.value.max_memory
      }
    }
  }
}
```

## Summary

Kubernetes Limit Ranges with OpenTofu help prevent a single workload from monopolizing namespace resources by applying default resource requests and limits when you configure them, and by enforcing min/max bounds. Default values reduce the need for developers to specify resources on every container, while min/max bounds prevent abuse. Combine with Resource Quotas for complete namespace-level resource governance.
