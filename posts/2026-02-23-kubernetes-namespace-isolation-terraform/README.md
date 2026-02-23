# How to Handle Kubernetes Namespace Isolation with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Namespaces, Network Policies, RBAC, Security, DevOps

Description: Learn how to implement Kubernetes namespace isolation with Terraform using network policies, RBAC, resource quotas, and limit ranges for multi-tenant clusters.

---

In a shared Kubernetes cluster, namespaces provide the primary boundary between teams, applications, and environments. But namespaces alone are just names - without proper isolation, pods in one namespace can freely communicate with pods in another, and teams can consume unlimited resources. Real namespace isolation requires network policies, RBAC, resource quotas, and limit ranges working together.

Terraform is well suited for this because you can define isolation policies as reusable modules and apply them consistently across every namespace.

## Creating Isolated Namespaces

Start with a namespace module that bundles all isolation components together.

```hcl
# variables for the namespace module
variable "namespace_name" {
  type = string
}

variable "team" {
  type = string
}

variable "environment" {
  type    = string
  default = "production"
}

variable "cpu_limit" {
  type    = string
  default = "10"
}

variable "memory_limit" {
  type    = string
  default = "20Gi"
}

# Create the namespace with labels
resource "kubernetes_namespace" "ns" {
  metadata {
    name = var.namespace_name

    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
      "team"                          = var.team
      "environment"                   = var.environment
      # Used for network policy targeting
      "kubernetes.io/metadata.name" = var.namespace_name
    }
  }
}
```

## Network Policies for Isolation

By default, Kubernetes allows all pod-to-pod communication. Network policies restrict this.

```hcl
# Default deny all ingress and egress traffic
resource "kubernetes_network_policy" "default_deny" {
  metadata {
    name      = "default-deny-all"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  spec {
    pod_selector {}

    # Empty ingress and egress means deny all
    policy_types = ["Ingress", "Egress"]
  }
}

# Allow DNS resolution (required for service discovery)
resource "kubernetes_network_policy" "allow_dns" {
  metadata {
    name      = "allow-dns"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  spec {
    pod_selector {}

    # Allow outbound DNS queries
    egress {
      ports {
        protocol = "UDP"
        port     = "53"
      }
      ports {
        protocol = "TCP"
        port     = "53"
      }

      to {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = "kube-system"
          }
        }
      }
    }

    policy_types = ["Egress"]
  }
}

# Allow intra-namespace communication
resource "kubernetes_network_policy" "allow_same_namespace" {
  metadata {
    name      = "allow-same-namespace"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  spec {
    pod_selector {}

    ingress {
      from {
        pod_selector {}
      }
    }

    egress {
      to {
        pod_selector {}
      }
    }

    policy_types = ["Ingress", "Egress"]
  }
}

# Allow ingress from the ingress controller namespace
resource "kubernetes_network_policy" "allow_ingress_controller" {
  metadata {
    name      = "allow-ingress-controller"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  spec {
    pod_selector {}

    ingress {
      from {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = "ingress-nginx"
          }
        }
      }
    }

    policy_types = ["Ingress"]
  }
}

# Allow egress to specific external services
resource "kubernetes_network_policy" "allow_external" {
  metadata {
    name      = "allow-external-egress"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  spec {
    pod_selector {}

    # Allow HTTPS traffic to external services
    egress {
      ports {
        protocol = "TCP"
        port     = "443"
      }
    }

    # Allow communication with the database namespace
    egress {
      to {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = "database"
          }
        }
      }

      ports {
        protocol = "TCP"
        port     = "5432"
      }
    }

    policy_types = ["Egress"]
  }
}
```

## Resource Quotas

Resource quotas prevent a single namespace from consuming all cluster resources.

```hcl
# Resource quota for the namespace
resource "kubernetes_resource_quota" "quota" {
  metadata {
    name      = "namespace-quota"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  spec {
    hard = {
      # CPU and memory limits
      "requests.cpu"    = var.cpu_limit
      "limits.cpu"      = var.cpu_limit
      "requests.memory" = var.memory_limit
      "limits.memory"   = var.memory_limit

      # Object count limits
      "pods"                   = "100"
      "services"               = "20"
      "services.loadbalancers" = "2"
      "persistentvolumeclaims" = "20"
      "secrets"                = "50"
      "configmaps"             = "50"

      # Storage limits
      "requests.storage" = "100Gi"
    }
  }
}
```

## Limit Ranges

Limit ranges set default and maximum resource requests for pods that do not specify them.

```hcl
# Limit range for the namespace
resource "kubernetes_limit_range" "limits" {
  metadata {
    name      = "default-limits"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  spec {
    # Default limits for containers
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

      max = {
        cpu    = "4"
        memory = "8Gi"
      }

      min = {
        cpu    = "50m"
        memory = "64Mi"
      }
    }

    # Limits for PVCs
    limit {
      type = "PersistentVolumeClaim"

      max = {
        storage = "50Gi"
      }

      min = {
        storage = "1Gi"
      }
    }
  }
}
```

## RBAC for Namespace Access

Control who can do what in each namespace.

```hcl
# Create a role for developers in this namespace
resource "kubernetes_role" "developer" {
  metadata {
    name      = "developer"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  # Allow managing most resources
  rule {
    api_groups = ["", "apps", "batch"]
    resources  = ["deployments", "services", "pods", "configmaps", "jobs", "cronjobs"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }

  # Allow reading logs
  rule {
    api_groups = [""]
    resources  = ["pods/log", "pods/exec"]
    verbs      = ["get", "list", "create"]
  }

  # Allow reading events
  rule {
    api_groups = [""]
    resources  = ["events"]
    verbs      = ["get", "list", "watch"]
  }

  # Do not allow modifying secrets directly
  rule {
    api_groups = [""]
    resources  = ["secrets"]
    verbs      = ["get", "list", "watch"]
  }

  # Allow managing ingresses
  rule {
    api_groups = ["networking.k8s.io"]
    resources  = ["ingresses"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }
}

# Bind the role to a group
resource "kubernetes_role_binding" "developer" {
  metadata {
    name      = "developer-binding"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.developer.metadata[0].name
  }

  # Bind to an OIDC group
  subject {
    kind      = "Group"
    name      = "${var.team}-developers"
    api_group = "rbac.authorization.k8s.io"
  }
}

# Read-only role for viewers
resource "kubernetes_role" "viewer" {
  metadata {
    name      = "viewer"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  rule {
    api_groups = ["", "apps", "batch", "networking.k8s.io"]
    resources  = ["*"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_role_binding" "viewer" {
  metadata {
    name      = "viewer-binding"
    namespace = kubernetes_namespace.ns.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.viewer.metadata[0].name
  }

  subject {
    kind      = "Group"
    name      = "${var.team}-viewers"
    api_group = "rbac.authorization.k8s.io"
  }
}
```

## Reusable Namespace Module

Package everything into a reusable module.

```hcl
# modules/isolated-namespace/main.tf contains all the above resources

# Use the module for each team
module "team_alpha" {
  source = "./modules/isolated-namespace"

  namespace_name = "team-alpha"
  team           = "alpha"
  environment    = "production"
  cpu_limit      = "20"
  memory_limit   = "40Gi"
}

module "team_beta" {
  source = "./modules/isolated-namespace"

  namespace_name = "team-beta"
  team           = "beta"
  environment    = "production"
  cpu_limit      = "10"
  memory_limit   = "20Gi"
}
```

## Cross-Namespace Communication

Sometimes teams need to talk to shared services. Create explicit network policies for this.

```hcl
# Allow team-alpha to access the shared database namespace
resource "kubernetes_network_policy" "allow_db_access" {
  metadata {
    name      = "allow-from-team-alpha"
    namespace = "shared-database"
  }

  spec {
    pod_selector {
      match_labels = {
        app = "postgresql"
      }
    }

    ingress {
      from {
        namespace_selector {
          match_labels = {
            team = "alpha"
          }
        }
      }

      ports {
        protocol = "TCP"
        port     = "5432"
      }
    }

    policy_types = ["Ingress"]
  }
}
```

## Best Practices

- Start with a default-deny network policy in every namespace
- Always allow DNS egress - without it, service discovery breaks
- Use resource quotas to prevent noisy-neighbor problems
- Set limit ranges so pods without resource specs get reasonable defaults
- Use RBAC to restrict what each team can do in their namespace
- Package isolation policies into a reusable Terraform module
- Label namespaces consistently for network policy targeting
- Review network policies regularly - overly restrictive policies cause hard-to-debug issues

For more on Kubernetes security patterns, see our guide on [handling Kubernetes secrets from Vault with Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-secrets-vault-terraform/view).
