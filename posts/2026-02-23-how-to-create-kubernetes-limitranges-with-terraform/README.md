# How to Create Kubernetes LimitRanges with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, LimitRange, Resource Management, Infrastructure as Code

Description: How to create Kubernetes LimitRanges with Terraform to set default resource constraints and prevent individual pods from consuming too many resources.

---

LimitRanges work at the namespace level to enforce resource constraints on individual pods and containers. While ResourceQuotas limit total resource consumption for a namespace, LimitRanges control per-pod and per-container boundaries. They also provide default values, so developers do not need to specify resource requests and limits on every single container. Managing LimitRanges through Terraform makes your resource policies consistent and easy to audit.

This guide covers creating LimitRanges with Terraform for containers, pods, and PersistentVolumeClaims.

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

## Why LimitRanges Matter

Without LimitRanges, a developer could deploy a container that requests 100 CPUs or set no resource limits at all. LimitRanges solve this by:

- Setting **default** requests and limits for containers that do not specify them
- Enforcing **minimum** and **maximum** resource values
- Setting a **ratio** between requests and limits to prevent over-provisioning
- Controlling **minimum** and **maximum** PVC sizes

## Basic Container LimitRange

The most common LimitRange sets default resource values for containers.

```hcl
# limitrange.tf - Default resource constraints for containers
resource "kubernetes_limit_range" "container_defaults" {
  metadata {
    name      = "container-defaults"
    namespace = "team-backend"

    labels = {
      managed-by = "terraform"
    }
  }

  spec {
    limit {
      type = "Container"

      # Default limits applied when a container has none
      default = {
        cpu    = "500m"
        memory = "512Mi"
      }

      # Default requests applied when a container has none
      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }

      # Maximum allowed for any single container
      max = {
        cpu    = "4"
        memory = "8Gi"
      }

      # Minimum required for any single container
      min = {
        cpu    = "50m"
        memory = "64Mi"
      }
    }
  }
}
```

With this LimitRange, if a developer creates a pod without specifying resource requests, Kubernetes will automatically assign 100m CPU and 128Mi memory as the request, and 500m CPU and 512Mi memory as the limit. If they try to request more than 4 CPUs or 8Gi memory for a single container, the pod will be rejected.

## Pod-Level LimitRange

You can also set limits at the pod level, which constrains the total resources across all containers in a pod.

```hcl
# pod_limitrange.tf - Limits on total pod resources
resource "kubernetes_limit_range" "pod_limits" {
  metadata {
    name      = "pod-limits"
    namespace = "team-backend"
  }

  spec {
    limit {
      type = "Pod"

      # Maximum total resources for all containers in a pod
      max = {
        cpu    = "8"
        memory = "16Gi"
      }

      # Minimum total resources for all containers in a pod
      min = {
        cpu    = "100m"
        memory = "128Mi"
      }
    }
  }
}
```

## PVC LimitRange

Control the size of PersistentVolumeClaims in a namespace.

```hcl
# pvc_limitrange.tf - Limit PVC sizes
resource "kubernetes_limit_range" "pvc_limits" {
  metadata {
    name      = "pvc-limits"
    namespace = "team-backend"
  }

  spec {
    limit {
      type = "PersistentVolumeClaim"

      # Minimum PVC size
      min = {
        storage = "1Gi"
      }

      # Maximum PVC size
      max = {
        storage = "100Gi"
      }
    }
  }
}
```

## Comprehensive LimitRange

Combine container, pod, and PVC limits in a single resource.

```hcl
# comprehensive_limitrange.tf - All limit types in one resource
resource "kubernetes_limit_range" "comprehensive" {
  metadata {
    name      = "comprehensive-limits"
    namespace = "production"
  }

  spec {
    # Container-level limits
    limit {
      type = "Container"

      default = {
        cpu    = "250m"
        memory = "256Mi"
      }

      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }

      max = {
        cpu    = "2"
        memory = "4Gi"
      }

      min = {
        cpu    = "50m"
        memory = "64Mi"
      }

      # Limit-to-request ratio
      # Prevents requesting 100m CPU but setting a limit of 10 CPU
      max_limit_request_ratio = {
        cpu    = "4"    # Limit can be at most 4x the request
        memory = "4"
      }
    }

    # Pod-level limits
    limit {
      type = "Pod"

      max = {
        cpu    = "4"
        memory = "8Gi"
      }

      min = {
        cpu    = "100m"
        memory = "128Mi"
      }
    }

    # PVC limits
    limit {
      type = "PersistentVolumeClaim"

      min = {
        storage = "1Gi"
      }

      max = {
        storage = "50Gi"
      }
    }
  }
}
```

## Environment-Specific LimitRanges

Different environments typically need different resource boundaries.

```hcl
# env_limitranges.tf - Different limits per environment
variable "environments" {
  type = map(object({
    namespace          = string
    container_default_cpu    = string
    container_default_memory = string
    container_max_cpu        = string
    container_max_memory     = string
    container_min_cpu        = string
    container_min_memory     = string
    max_pvc_size             = string
  }))
  default = {
    development = {
      namespace                = "development"
      container_default_cpu    = "100m"
      container_default_memory = "128Mi"
      container_max_cpu        = "1"
      container_max_memory     = "2Gi"
      container_min_cpu        = "10m"
      container_min_memory     = "32Mi"
      max_pvc_size             = "10Gi"
    }
    staging = {
      namespace                = "staging"
      container_default_cpu    = "200m"
      container_default_memory = "256Mi"
      container_max_cpu        = "2"
      container_max_memory     = "4Gi"
      container_min_cpu        = "50m"
      container_min_memory     = "64Mi"
      max_pvc_size             = "50Gi"
    }
    production = {
      namespace                = "production"
      container_default_cpu    = "250m"
      container_default_memory = "512Mi"
      container_max_cpu        = "4"
      container_max_memory     = "8Gi"
      container_min_cpu        = "50m"
      container_min_memory     = "64Mi"
      max_pvc_size             = "200Gi"
    }
  }
}

resource "kubernetes_limit_range" "env_limits" {
  for_each = var.environments

  metadata {
    name      = "resource-limits"
    namespace = each.value.namespace
  }

  spec {
    limit {
      type = "Container"

      default = {
        cpu    = each.value.container_default_cpu
        memory = each.value.container_default_memory
      }

      default_request = {
        cpu    = each.value.container_min_cpu
        memory = each.value.container_min_memory
      }

      max = {
        cpu    = each.value.container_max_cpu
        memory = each.value.container_max_memory
      }

      min = {
        cpu    = each.value.container_min_cpu
        memory = each.value.container_min_memory
      }
    }

    limit {
      type = "PersistentVolumeClaim"

      min = {
        storage = "1Gi"
      }

      max = {
        storage = each.value.max_pvc_size
      }
    }
  }
}
```

## How LimitRanges Interact with ResourceQuotas

LimitRanges and ResourceQuotas work together. When you have a ResourceQuota that requires CPU and memory specifications, a LimitRange with defaults ensures pods are not rejected for missing resource specs.

```hcl
# The quota requires resource specs
resource "kubernetes_resource_quota" "quota" {
  metadata {
    name      = "namespace-quota"
    namespace = "production"
  }

  spec {
    hard = {
      "requests.cpu"    = "20"
      "requests.memory" = "40Gi"
      "limits.cpu"      = "40"
      "limits.memory"   = "80Gi"
    }
  }
}

# The LimitRange provides defaults so pods without specs still work
resource "kubernetes_limit_range" "defaults" {
  metadata {
    name      = "default-limits"
    namespace = "production"
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

Without the LimitRange, any pod deployed without resource specs would be rejected because the ResourceQuota requires them. The LimitRange fills in the gaps.

## Checking LimitRange Configuration

```bash
# View the LimitRange in a namespace
kubectl describe limitrange -n production

# Output shows the applied constraints:
# Type        Resource  Min    Max    Default Request  Default Limit  Max Limit/Request Ratio
# ----        --------  ---    ---    ---------------  -------------  -----------------------
# Container   cpu       50m    4      100m             250m           4
# Container   memory    64Mi   8Gi    128Mi            512Mi          4
# Pod         cpu       100m   4      -                -              -
# Pod         memory    128Mi  8Gi    -                -              -
# PVC         storage   1Gi    50Gi   -                -              -
```

## Monitoring Resource Allocation

Watch for pods hitting LimitRange maximums (indicating they need more resources than allowed) or pods running with just the defaults when they need more. [OneUptime](https://oneuptime.com) can help you monitor application performance, catching cases where default resource allocations are too low and applications are being throttled.

## Summary

Kubernetes LimitRanges managed through Terraform enforce per-container and per-pod resource boundaries while providing sensible defaults. They complement ResourceQuotas by preventing individual workloads from being too large, while quotas prevent the total from being too large. The key patterns are: always set defaults so pods without specs still deploy, use `max_limit_request_ratio` to prevent over-provisioning, and vary limits by environment using Terraform variables and `for_each`.

For namespace-wide resource totals, see [Kubernetes ResourceQuotas with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-resourcequotas-with-terraform/view).
