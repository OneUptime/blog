# How to Create Kubernetes Namespaces with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Namespaces, Infrastructure as Code, DevOps

Description: A hands-on guide to creating and managing Kubernetes namespaces using Terraform with practical examples and best practices.

---

Namespaces are one of the first things you set up in a Kubernetes cluster. They provide logical isolation between workloads, let you apply resource quotas per team, and keep your cluster organized as it grows. While you can create namespaces with kubectl, managing them through Terraform means they become part of your infrastructure-as-code workflow, versioned and reviewable just like everything else.

This guide covers creating Kubernetes namespaces with the Terraform Kubernetes provider, from basic setup to advanced configurations with labels, annotations, and associated resources.

## Setting Up the Kubernetes Provider

Before creating any Kubernetes resources, you need to configure the provider. The provider needs credentials to talk to your cluster.

```hcl
# providers.tf - Configure the Kubernetes provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

# Option 1: Use kubeconfig file
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster-context"
}

# Option 2: Connect to GKE cluster directly
# provider "kubernetes" {
#   host                   = data.google_container_cluster.primary.endpoint
#   token                  = data.google_client_config.default.access_token
#   cluster_ca_certificate = base64decode(data.google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
# }
```

## Creating a Basic Namespace

The simplest namespace just needs a name.

```hcl
# namespaces.tf - Basic namespace creation
resource "kubernetes_namespace" "development" {
  metadata {
    name = "development"
  }
}

resource "kubernetes_namespace" "staging" {
  metadata {
    name = "staging"
  }
}

resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"
  }
}
```

## Namespaces with Labels and Annotations

In practice, you almost always want labels and annotations on your namespaces. Labels are used for selecting and organizing resources. Annotations store non-identifying metadata.

```hcl
# labeled_namespace.tf - Namespace with labels and annotations
resource "kubernetes_namespace" "team_backend" {
  metadata {
    name = "team-backend"

    labels = {
      # Team ownership label - used for cost attribution
      "team"        = "backend"
      "environment" = "production"
      "managed-by"  = "terraform"

      # Enable Istio sidecar injection
      "istio-injection" = "enabled"
    }

    annotations = {
      # Contact information for the team owning this namespace
      "owner-email"    = "backend-team@example.com"
      "slack-channel"  = "#backend-alerts"
      "cost-center"    = "engineering-42"
      "created-by"     = "terraform"
    }
  }
}
```

## Creating Multiple Namespaces with for_each

When you need to create several namespaces with a consistent structure, `for_each` keeps things DRY.

```hcl
# multi_namespace.tf - Create multiple namespaces from a map
variable "namespaces" {
  description = "Map of namespaces to create"
  type = map(object({
    labels      = optional(map(string), {})
    annotations = optional(map(string), {})
  }))
  default = {
    "frontend" = {
      labels = {
        team        = "frontend"
        environment = "production"
      }
      annotations = {
        owner-email = "frontend@example.com"
      }
    }
    "backend" = {
      labels = {
        team        = "backend"
        environment = "production"
      }
      annotations = {
        owner-email = "backend@example.com"
      }
    }
    "data-pipeline" = {
      labels = {
        team        = "data-engineering"
        environment = "production"
      }
      annotations = {
        owner-email = "data-eng@example.com"
      }
    }
    "monitoring" = {
      labels = {
        team        = "platform"
        environment = "production"
      }
      annotations = {
        owner-email = "platform@example.com"
      }
    }
  }
}

resource "kubernetes_namespace" "teams" {
  for_each = var.namespaces

  metadata {
    name = each.key

    labels = merge(
      {
        "managed-by" = "terraform"
        "namespace"  = each.key
      },
      each.value.labels
    )

    annotations = merge(
      {
        "created-by" = "terraform"
      },
      each.value.annotations
    )
  }
}
```

## Namespace with Resource Quota

A common pattern is to create a namespace along with its resource quota. This prevents any single namespace from consuming all cluster resources.

```hcl
# namespace_with_quota.tf - Namespace paired with resource limits
resource "kubernetes_namespace" "team_ml" {
  metadata {
    name = "team-ml"

    labels = {
      team       = "machine-learning"
      managed-by = "terraform"
    }
  }
}

# Attach a resource quota to the namespace
resource "kubernetes_resource_quota" "team_ml_quota" {
  metadata {
    name      = "team-ml-quota"
    namespace = kubernetes_namespace.team_ml.metadata[0].name
  }

  spec {
    hard = {
      # Limit CPU and memory
      "requests.cpu"    = "10"
      "requests.memory" = "20Gi"
      "limits.cpu"      = "20"
      "limits.memory"   = "40Gi"

      # Limit the number of pods and services
      pods     = "50"
      services = "10"

      # Limit persistent volume claims
      persistentvolumeclaims = "10"
    }
  }
}
```

## Namespace with Network Policy

For security, you might want to create a default network policy that restricts traffic within the namespace.

```hcl
# namespace_with_netpol.tf - Namespace with default deny network policy
resource "kubernetes_namespace" "secure_app" {
  metadata {
    name = "secure-app"

    labels = {
      "managed-by"       = "terraform"
      "network-policy"   = "restricted"
    }
  }
}

# Default deny all ingress traffic in the namespace
resource "kubernetes_network_policy" "default_deny" {
  metadata {
    name      = "default-deny-ingress"
    namespace = kubernetes_namespace.secure_app.metadata[0].name
  }

  spec {
    pod_selector {}  # Empty selector matches all pods

    policy_types = ["Ingress"]

    # No ingress rules means all ingress is denied by default
  }
}
```

## Referencing Namespaces in Other Resources

Once you create namespaces with Terraform, you should reference them in other resources instead of hardcoding namespace names. This creates proper dependency ordering and prevents typos.

```hcl
# deployment.tf - Reference namespace from Terraform resource
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    # Reference the namespace resource instead of hardcoding
    namespace = kubernetes_namespace.team_backend.metadata[0].name
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "nginx:1.25"
        }
      }
    }
  }
}
```

## Importing Existing Namespaces

If you have namespaces that were created manually or by another tool, you can import them into Terraform state.

```bash
# Import an existing namespace into Terraform state
terraform import kubernetes_namespace.production production
```

After importing, run `terraform plan` to see if there are any differences between your Terraform code and the actual state of the namespace. Adjust your code until the plan shows no changes.

## Handling Namespace Deletion

By default, destroying a Terraform-managed namespace will delete all resources within it. This can be dangerous in production. Consider adding lifecycle rules to prevent accidental deletion.

```hcl
# protected_namespace.tf - Namespace with deletion protection
resource "kubernetes_namespace" "production_critical" {
  metadata {
    name = "production-critical"

    labels = {
      environment = "production"
      managed-by  = "terraform"
    }
  }

  # Prevent accidental deletion through Terraform
  lifecycle {
    prevent_destroy = true
  }
}
```

## Monitoring Namespace Health

After creating namespaces, you want visibility into what is running in each one. Use [OneUptime](https://oneuptime.com) to monitor the services deployed across your namespaces, tracking uptime and performance for each team's workloads.

## Summary

Kubernetes namespaces are straightforward to create with Terraform, but the real value comes from the patterns you build around them. Using `for_each` for consistency, pairing namespaces with resource quotas and network policies, referencing namespaces through Terraform resources instead of strings, and adding lifecycle protection for critical namespaces - these practices make your cluster management more reliable and your team more productive.

For the next step, check out how to create [Kubernetes Deployments with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-deployments-with-terraform/view) to start deploying workloads into your namespaces.
