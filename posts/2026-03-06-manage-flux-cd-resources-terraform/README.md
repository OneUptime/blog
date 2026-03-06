# How to Manage Flux CD Resources with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, terraform, gitops, kubernetes, resource management, infrastructure as code

Description: Learn how to create and manage Flux CD custom resources like GitRepositories, Kustomizations, and HelmReleases using Terraform.

---

## Introduction

After bootstrapping Flux CD, you need to define the resources that tell Flux what to deploy and where. While you can write YAML manifests by hand, managing Flux resources with Terraform gives you the same benefits you get for any other infrastructure: variables, modules, state tracking, and plan/apply workflows.

This guide covers how to create and manage Flux CD custom resources using the Kubernetes Terraform provider.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- Terraform v1.5 or later
- kubectl access to the cluster
- Familiarity with Flux CD concepts (GitRepository, Kustomization, HelmRelease)

## Project Setup

Configure the Kubernetes provider to manage Flux resources.

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.27.0"
    }
    kubectl = {
      source  = "alekc/kubectl"
      version = ">= 2.0.0"
    }
  }
}

# Configure provider to connect to your cluster
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.cluster_context
}

provider "kubectl" {
  config_path    = "~/.kube/config"
  config_context = var.cluster_context
}
```

## Managing GitRepository Sources

Define GitRepository resources that tell Flux where to find your manifests.

```hcl
# git_repositories.tf
# Create a GitRepository source pointing to your application repo
resource "kubectl_manifest" "app_repo" {
  yaml_body = yamlencode({
    apiVersion = "source.toolkit.fluxcd.io/v1"
    kind       = "GitRepository"
    metadata = {
      name      = "my-application"
      namespace = "flux-system"
    }
    spec = {
      # Reconcile every 5 minutes to check for new commits
      interval = "5m"
      url      = "https://github.com/${var.github_owner}/${var.app_repo_name}.git"
      ref = {
        # Track the main branch
        branch = var.app_branch
      }
      # Ignore non-essential files to speed up reconciliation
      ignore = <<-EOT
        # Exclude CI/CD files from sync
        /.github/
        /docs/
        /*.md
      EOT
    }
  })
}

# Create a GitRepository for shared infrastructure components
resource "kubectl_manifest" "infra_repo" {
  yaml_body = yamlencode({
    apiVersion = "source.toolkit.fluxcd.io/v1"
    kind       = "GitRepository"
    metadata = {
      name      = "infrastructure"
      namespace = "flux-system"
    }
    spec = {
      interval = "10m"
      url      = "https://github.com/${var.github_owner}/infrastructure.git"
      ref = {
        # Pin to a specific tag for stability
        tag = var.infra_version
      }
    }
  })
}
```

## Managing Kustomizations

Create Kustomization resources to deploy manifests from your Git sources.

```hcl
# kustomizations.tf
# Deploy base infrastructure components first
resource "kubectl_manifest" "infra_kustomization" {
  depends_on = [kubectl_manifest.infra_repo]

  yaml_body = yamlencode({
    apiVersion = "kustomize.toolkit.fluxcd.io/v1"
    kind       = "Kustomization"
    metadata = {
      name      = "infrastructure"
      namespace = "flux-system"
    }
    spec = {
      interval = "10m"
      # Reference the infrastructure GitRepository source
      sourceRef = {
        kind = "GitRepository"
        name = "infrastructure"
      }
      # Path within the repository containing kustomize manifests
      path = "./base"
      # Prune resources that are removed from Git
      prune = true
      # Wait for all resources to be ready before reporting success
      wait = true
      # Timeout for waiting on resource readiness
      timeout = "5m"
      # Health checks for critical components
      healthChecks = [
        {
          apiVersion = "apps/v1"
          kind       = "Deployment"
          name       = "ingress-nginx-controller"
          namespace  = "ingress-nginx"
        }
      ]
    }
  })
}

# Deploy the application after infrastructure is ready
resource "kubectl_manifest" "app_kustomization" {
  depends_on = [
    kubectl_manifest.app_repo,
    kubectl_manifest.infra_kustomization
  ]

  yaml_body = yamlencode({
    apiVersion = "kustomize.toolkit.fluxcd.io/v1"
    kind       = "Kustomization"
    metadata = {
      name      = "my-application"
      namespace = "flux-system"
    }
    spec = {
      interval = "5m"
      sourceRef = {
        kind = "GitRepository"
        name = "my-application"
      }
      path  = "./deploy/${var.environment}"
      prune = true
      # Depend on infrastructure being deployed first
      dependsOn = [
        { name = "infrastructure" }
      ]
      # Substitute environment-specific values into manifests
      postBuild = {
        substitute = {
          ENVIRONMENT   = var.environment
          CLUSTER_NAME  = var.cluster_name
          DOMAIN        = var.domain
        }
      }
    }
  })
}
```

## Managing HelmRepository Sources

Define Helm chart repositories as Flux sources.

```hcl
# helm_repositories.tf
# Define a list of Helm repositories to add
locals {
  helm_repositories = {
    # Bitnami charts for common applications
    bitnami = {
      url      = "https://charts.bitnami.com/bitnami"
      interval = "30m"
    }
    # Prometheus community charts for monitoring
    prometheus = {
      url      = "https://prometheus-community.github.io/helm-charts"
      interval = "30m"
    }
    # Ingress NGINX controller
    ingress-nginx = {
      url      = "https://kubernetes.github.io/ingress-nginx"
      interval = "1h"
    }
  }
}

# Create HelmRepository resources from the map
resource "kubectl_manifest" "helm_repos" {
  for_each = local.helm_repositories

  yaml_body = yamlencode({
    apiVersion = "source.toolkit.fluxcd.io/v1"
    kind       = "HelmRepository"
    metadata = {
      name      = each.key
      namespace = "flux-system"
    }
    spec = {
      interval = each.value.interval
      url      = each.value.url
    }
  })
}
```

## Managing HelmReleases

Create HelmRelease resources to deploy Helm charts via Flux.

```hcl
# helm_releases.tf
# Deploy the ingress-nginx controller via Helm
resource "kubectl_manifest" "ingress_nginx" {
  depends_on = [kubectl_manifest.helm_repos]

  yaml_body = yamlencode({
    apiVersion = "helm.toolkit.fluxcd.io/v2"
    kind       = "HelmRelease"
    metadata = {
      name      = "ingress-nginx"
      namespace = "ingress-nginx"
    }
    spec = {
      interval = "15m"
      chart = {
        spec = {
          chart   = "ingress-nginx"
          version = "4.11.x"
          # Reference the HelmRepository source
          sourceRef = {
            kind      = "HelmRepository"
            name      = "ingress-nginx"
            namespace = "flux-system"
          }
        }
      }
      # Helm values for the chart
      values = {
        controller = {
          replicaCount = var.environment == "production" ? 3 : 1
          resources = {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
          # Enable metrics for Prometheus scraping
          metrics = {
            enabled = true
          }
        }
      }
    }
  })
}

# Deploy Prometheus monitoring stack
resource "kubectl_manifest" "prometheus" {
  depends_on = [kubectl_manifest.helm_repos]

  yaml_body = yamlencode({
    apiVersion = "helm.toolkit.fluxcd.io/v2"
    kind       = "HelmRelease"
    metadata = {
      name      = "kube-prometheus-stack"
      namespace = "monitoring"
    }
    spec = {
      interval = "30m"
      chart = {
        spec = {
          chart   = "kube-prometheus-stack"
          version = "65.x"
          sourceRef = {
            kind      = "HelmRepository"
            name      = "prometheus"
            namespace = "flux-system"
          }
        }
      }
      # Create the target namespace if it does not exist
      install = {
        createNamespace = true
      }
      values = {
        grafana = {
          enabled = true
          adminPassword = "change-me-in-secret"
        }
        prometheus = {
          prometheusSpec = {
            retention = var.environment == "production" ? "30d" : "7d"
          }
        }
      }
    }
  })
}
```

## Creating a Reusable Module

Wrap Flux resource creation into reusable Terraform modules.

```hcl
# modules/flux-helm-release/variables.tf
variable "name" {
  description = "Name of the HelmRelease"
  type        = string
}

variable "namespace" {
  description = "Target namespace for the release"
  type        = string
}

variable "chart_name" {
  description = "Name of the Helm chart"
  type        = string
}

variable "chart_version" {
  description = "Version constraint for the chart"
  type        = string
}

variable "repository_name" {
  description = "Name of the HelmRepository source"
  type        = string
}

variable "values" {
  description = "Helm values to pass to the chart"
  type        = any
  default     = {}
}

variable "depends_on_releases" {
  description = "List of HelmRelease names this release depends on"
  type        = list(string)
  default     = []
}
```

```hcl
# modules/flux-helm-release/main.tf
# Reusable module for creating Flux HelmRelease resources
resource "kubectl_manifest" "namespace" {
  yaml_body = yamlencode({
    apiVersion = "v1"
    kind       = "Namespace"
    metadata = {
      name = var.namespace
    }
  })
}

resource "kubectl_manifest" "helm_release" {
  depends_on = [kubectl_manifest.namespace]

  yaml_body = yamlencode({
    apiVersion = "helm.toolkit.fluxcd.io/v2"
    kind       = "HelmRelease"
    metadata = {
      name      = var.name
      namespace = var.namespace
    }
    spec = {
      interval = "15m"
      chart = {
        spec = {
          chart   = var.chart_name
          version = var.chart_version
          sourceRef = {
            kind      = "HelmRepository"
            name      = var.repository_name
            namespace = "flux-system"
          }
        }
      }
      dependsOn = [for name in var.depends_on_releases : { name = name }]
      values    = var.values
    }
  })
}
```

## Using the Module

Call the module to create HelmRelease resources concisely.

```hcl
# main.tf
# Deploy Redis using the reusable module
module "redis" {
  source = "./modules/flux-helm-release"

  name            = "redis"
  namespace       = "database"
  chart_name      = "redis"
  chart_version   = "19.x"
  repository_name = "bitnami"

  values = {
    architecture = "standalone"
    auth = {
      enabled = false
    }
  }
}

# Deploy PostgreSQL depending on Redis
module "postgresql" {
  source = "./modules/flux-helm-release"

  name            = "postgresql"
  namespace       = "database"
  chart_name      = "postgresql"
  chart_version   = "15.x"
  repository_name = "bitnami"

  values = {
    primary = {
      persistence = {
        size = "50Gi"
      }
    }
  }
}
```

## Managing Notification Resources

Set up Flux notifications through Terraform.

```hcl
# notifications.tf
# Create a Slack notification provider
resource "kubectl_manifest" "slack_provider" {
  yaml_body = yamlencode({
    apiVersion = "notification.toolkit.fluxcd.io/v1beta3"
    kind       = "Provider"
    metadata = {
      name      = "slack"
      namespace = "flux-system"
    }
    spec = {
      type    = "slack"
      channel = var.slack_channel
      # Reference a Secret containing the Slack webhook URL
      secretRef = {
        name = "slack-webhook-url"
      }
    }
  })
}

# Create an alert that sends notifications for reconciliation failures
resource "kubectl_manifest" "reconciliation_alert" {
  depends_on = [kubectl_manifest.slack_provider]

  yaml_body = yamlencode({
    apiVersion = "notification.toolkit.fluxcd.io/v1beta3"
    kind       = "Alert"
    metadata = {
      name      = "reconciliation-failures"
      namespace = "flux-system"
    }
    spec = {
      providerRef = {
        name = "slack"
      }
      # Only alert on error severity
      eventSeverity = "error"
      # Watch all key Flux resource types
      eventSources = [
        { kind = "GitRepository", name = "*" },
        { kind = "Kustomization", name = "*" },
        { kind = "HelmRelease", name = "*" },
      ]
    }
  })
}
```

## Applying and Verifying

Run Terraform to create all the Flux resources.

```bash
# Initialize and apply
terraform init
terraform plan -var-file="environments/production.tfvars"
terraform apply -var-file="environments/production.tfvars"

# Verify all Flux resources were created
kubectl get gitrepositories -A
kubectl get kustomizations -A
kubectl get helmreleases -A
kubectl get providers -A
kubectl get alerts -A
```

## Conclusion

Managing Flux CD resources with Terraform gives you the best of both worlds: Terraform's planning and state management for defining what should run, and Flux's continuous reconciliation for keeping it running. This approach works well for platform teams that need to manage Flux configurations across many clusters, with variables and modules keeping configurations DRY and consistent.
