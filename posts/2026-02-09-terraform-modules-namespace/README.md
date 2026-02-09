# Creating Reusable Terraform Modules for Kubernetes Namespace Provisioning
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Terraform, Modules, Namespace, Kubernetes, Infrastructure as Code
Description: Learn how to build reusable Terraform modules that provision Kubernetes namespaces with resource quotas, network policies, RBAC, and default settings.
---

Namespaces are the foundation of multi-tenancy in Kubernetes. Every team, application, and environment gets its own namespace, and each one needs consistent configuration: resource quotas, limit ranges, network policies, RBAC bindings, and labels. Doing this by hand for dozens or hundreds of namespaces is tedious and error-prone. Terraform modules solve this problem by encapsulating all of the namespace provisioning logic into a reusable, version-controlled package. In this post, we will build a production-ready Terraform module for Kubernetes namespace provisioning.

## Module Structure

A well-organized Terraform module follows a standard file layout. Here is the structure for our namespace module:

```
modules/kubernetes-namespace/
  main.tf
  variables.tf
  outputs.tf
  versions.tf
  resource-quota.tf
  limit-range.tf
  network-policy.tf
  rbac.tf
```

## Defining the Module Interface

Start with `versions.tf` to declare provider requirements:

```hcl
# modules/kubernetes-namespace/versions.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.25"
    }
  }
}
```

Next, define the input variables in `variables.tf`:

```hcl
# modules/kubernetes-namespace/variables.tf
variable "name" {
  description = "The name of the namespace"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]*[a-z0-9]$", var.name))
    error_message = "Namespace name must be lowercase alphanumeric with hyphens."
  }
}

variable "labels" {
  description = "Labels to apply to the namespace"
  type        = map(string)
  default     = {}
}

variable "annotations" {
  description = "Annotations to apply to the namespace"
  type        = map(string)
  default     = {}
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "team" {
  description = "Team that owns this namespace"
  type        = string
}

variable "resource_quota" {
  description = "Resource quota configuration"
  type = object({
    cpu_requests    = string
    cpu_limits      = string
    memory_requests = string
    memory_limits   = string
    pods            = number
    services        = number
    pvcs            = number
  })
  default = null
}

variable "default_resource_limits" {
  description = "Default container resource limits"
  type = object({
    cpu    = string
    memory = string
  })
  default = {
    cpu    = "500m"
    memory = "512Mi"
  }
}

variable "default_resource_requests" {
  description = "Default container resource requests"
  type = object({
    cpu    = string
    memory = string
  })
  default = {
    cpu    = "100m"
    memory = "128Mi"
  }
}

variable "network_policy_enabled" {
  description = "Whether to create a default deny network policy"
  type        = bool
  default     = true
}

variable "admin_groups" {
  description = "List of groups that get admin access to the namespace"
  type        = list(string)
  default     = []
}

variable "readonly_groups" {
  description = "List of groups that get read-only access to the namespace"
  type        = list(string)
  default     = []
}
```

## Creating the Namespace

The main namespace resource goes in `main.tf`:

```hcl
# modules/kubernetes-namespace/main.tf
resource "kubernetes_namespace" "this" {
  metadata {
    name = var.name

    labels = merge(
      {
        "app.kubernetes.io/managed-by" = "terraform"
        "environment"                   = var.environment
        "team"                          = var.team
      },
      var.labels
    )

    annotations = merge(
      {
        "terraform-module" = "kubernetes-namespace"
      },
      var.annotations
    )
  }
}
```

## Resource Quotas

Resource quotas prevent any single namespace from consuming too many cluster resources:

```hcl
# modules/kubernetes-namespace/resource-quota.tf
resource "kubernetes_resource_quota" "this" {
  count = var.resource_quota != null ? 1 : 0

  metadata {
    name      = "${var.name}-quota"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = var.resource_quota.cpu_requests
      "limits.cpu"      = var.resource_quota.cpu_limits
      "requests.memory" = var.resource_quota.memory_requests
      "limits.memory"   = var.resource_quota.memory_limits
      "pods"            = var.resource_quota.pods
      "services"        = var.resource_quota.services
      "persistentvolumeclaims" = var.resource_quota.pvcs
    }
  }
}
```

## Limit Ranges

Limit ranges set default resource requests and limits for containers that do not specify them:

```hcl
# modules/kubernetes-namespace/limit-range.tf
resource "kubernetes_limit_range" "this" {
  metadata {
    name      = "${var.name}-limits"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    limit {
      type = "Container"

      default = {
        cpu    = var.default_resource_limits.cpu
        memory = var.default_resource_limits.memory
      }

      default_request = {
        cpu    = var.default_resource_requests.cpu
        memory = var.default_resource_requests.memory
      }

      min = {
        cpu    = "50m"
        memory = "64Mi"
      }

      max = {
        cpu    = "4"
        memory = "8Gi"
      }
    }

    limit {
      type = "PersistentVolumeClaim"

      max = {
        storage = "100Gi"
      }

      min = {
        storage = "1Gi"
      }
    }
  }
}
```

## Network Policies

A default-deny network policy is a security best practice. It blocks all ingress traffic unless explicitly allowed:

```hcl
# modules/kubernetes-namespace/network-policy.tf
resource "kubernetes_network_policy" "default_deny_ingress" {
  count = var.network_policy_enabled ? 1 : 0

  metadata {
    name      = "default-deny-ingress"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    pod_selector {}

    policy_types = ["Ingress"]
  }
}

resource "kubernetes_network_policy" "allow_same_namespace" {
  count = var.network_policy_enabled ? 1 : 0

  metadata {
    name      = "allow-same-namespace"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    pod_selector {}

    ingress {
      from {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = var.name
          }
        }
      }
    }

    policy_types = ["Ingress"]
  }
}

resource "kubernetes_network_policy" "allow_monitoring" {
  count = var.network_policy_enabled ? 1 : 0

  metadata {
    name      = "allow-monitoring"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    pod_selector {}

    ingress {
      from {
        namespace_selector {
          match_labels = {
            "app.kubernetes.io/name" = "monitoring"
          }
        }
      }

      ports {
        port     = "metrics"
        protocol = "TCP"
      }
    }

    policy_types = ["Ingress"]
  }
}
```

## RBAC Bindings

Namespace-scoped RBAC bindings give teams access to their namespaces:

```hcl
# modules/kubernetes-namespace/rbac.tf
resource "kubernetes_role_binding" "admin" {
  for_each = toset(var.admin_groups)

  metadata {
    name      = "admin-${each.value}"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "admin"
  }

  subject {
    kind      = "Group"
    name      = each.value
    api_group = "rbac.authorization.k8s.io"
  }
}

resource "kubernetes_role_binding" "readonly" {
  for_each = toset(var.readonly_groups)

  metadata {
    name      = "readonly-${each.value}"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "view"
  }

  subject {
    kind      = "Group"
    name      = each.value
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Module Outputs

```hcl
# modules/kubernetes-namespace/outputs.tf
output "name" {
  description = "The name of the created namespace"
  value       = kubernetes_namespace.this.metadata[0].name
}

output "uid" {
  description = "The UID of the created namespace"
  value       = kubernetes_namespace.this.metadata[0].uid
}

output "labels" {
  description = "The labels applied to the namespace"
  value       = kubernetes_namespace.this.metadata[0].labels
}
```

## Using the Module

With the module built, consuming it is straightforward. You can define all of your namespaces in a single Terraform configuration using a map:

```hcl
locals {
  namespaces = {
    "frontend-prod" = {
      environment = "production"
      team        = "frontend"
      resource_quota = {
        cpu_requests    = "8"
        cpu_limits      = "16"
        memory_requests = "16Gi"
        memory_limits   = "32Gi"
        pods            = 50
        services        = 10
        pvcs            = 5
      }
      admin_groups    = ["frontend-devs"]
      readonly_groups = ["platform-team"]
    }
    "backend-prod" = {
      environment = "production"
      team        = "backend"
      resource_quota = {
        cpu_requests    = "16"
        cpu_limits      = "32"
        memory_requests = "32Gi"
        memory_limits   = "64Gi"
        pods            = 100
        services        = 20
        pvcs            = 15
      }
      admin_groups    = ["backend-devs"]
      readonly_groups = ["platform-team", "sre-team"]
    }
  }
}

module "namespaces" {
  source   = "./modules/kubernetes-namespace"
  for_each = local.namespaces

  name        = each.key
  environment = each.value.environment
  team        = each.value.team

  resource_quota  = each.value.resource_quota
  admin_groups    = each.value.admin_groups
  readonly_groups = each.value.readonly_groups
}
```

## Versioning and Publishing

For organization-wide use, publish the module to a Terraform registry or a Git repository with semantic versioning:

```hcl
module "namespace" {
  source  = "git::https://github.com/myorg/terraform-modules.git//kubernetes-namespace?ref=v2.1.0"

  name        = "my-app"
  environment = "production"
  team        = "platform"
}
```

Tag your releases carefully and maintain a changelog. Breaking changes to the module interface should increment the major version, while new optional features increment the minor version.

Building reusable Terraform modules for namespace provisioning ensures that every namespace in your cluster meets your organization's standards for resource governance, network security, and access control. The module approach makes it trivial to onboard new teams and applications while maintaining consistency across your entire fleet.
