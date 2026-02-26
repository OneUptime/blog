# How to Use Terraform ArgoCD Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Terraform, Infrastructure as Code

Description: Learn how to use the Terraform ArgoCD provider to manage ArgoCD applications, projects, repositories, and cluster configurations as declarative Terraform code.

---

The Terraform ArgoCD provider lets you manage ArgoCD resources - applications, projects, repositories, and clusters - using Terraform's declarative syntax. Instead of clicking through the UI or running `argocd` CLI commands, you define your ArgoCD configuration as Terraform code, version it in Git, and apply it through your standard Terraform workflow.

This approach is particularly useful when you are already using Terraform to provision your Kubernetes clusters and want to bootstrap ArgoCD configuration as part of the same pipeline.

## Installing the ArgoCD Provider

Add the provider to your Terraform configuration:

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    argocd = {
      source  = "oboukili/argocd"
      version = "~> 6.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}
```

## Configuring Provider Authentication

The ArgoCD provider needs to connect to your ArgoCD server. There are several authentication options:

```hcl
# Option 1: Username and password
provider "argocd" {
  server_addr = "argocd.example.com:443"
  username    = "admin"
  password    = var.argocd_admin_password
  insecure    = false
}

# Option 2: Auth token
provider "argocd" {
  server_addr = "argocd.example.com:443"
  auth_token  = var.argocd_auth_token
}

# Option 3: Kubernetes port-forward (for local development)
provider "argocd" {
  port_forward_with_namespace = "argocd"
  username                    = "admin"
  password                    = var.argocd_admin_password
}

# Option 4: Core mode (direct Kubernetes access, no API server)
provider "argocd" {
  core = true
}
```

For production, use auth tokens stored in your secrets manager:

```hcl
data "aws_secretsmanager_secret_version" "argocd_token" {
  secret_id = "argocd/api-token"
}

provider "argocd" {
  server_addr = "argocd.${var.domain}:443"
  auth_token  = data.aws_secretsmanager_secret_version.argocd_token.secret_string
}
```

## Managing ArgoCD Projects

Projects in ArgoCD define boundaries for applications - what repositories they can use, what clusters they can deploy to, and what namespaces they can target:

```hcl
resource "argocd_project" "platform" {
  metadata {
    name      = "platform"
    namespace = "argocd"
    labels = {
      team = "platform-engineering"
    }
  }

  spec {
    description = "Platform team services"

    # Source repositories this project can use
    source_repos = [
      "https://github.com/myorg/platform-gitops.git",
      "https://github.com/myorg/helm-charts.git",
    ]

    # Allowed destinations
    destination {
      server    = "https://kubernetes.default.svc"
      namespace = "platform-*"
    }

    destination {
      server    = "https://kubernetes.default.svc"
      namespace = "monitoring"
    }

    # Allow specific cluster-scoped resources
    cluster_resource_whitelist {
      group = ""
      kind  = "Namespace"
    }

    cluster_resource_whitelist {
      group = "rbac.authorization.k8s.io"
      kind  = "ClusterRole"
    }

    cluster_resource_whitelist {
      group = "rbac.authorization.k8s.io"
      kind  = "ClusterRoleBinding"
    }

    # Namespace-scoped resource blacklist
    namespace_resource_blacklist {
      group = ""
      kind  = "ResourceQuota"
    }

    # RBAC roles
    role {
      name        = "developers"
      description = "Read-only access for developers"
      policies = [
        "p, proj:platform:developers, applications, get, platform/*, allow",
        "p, proj:platform:developers, applications, sync, platform/*, allow",
      ]
      groups = ["platform-developers"]
    }

    role {
      name        = "admins"
      description = "Full access for platform admins"
      policies = [
        "p, proj:platform:admins, applications, *, platform/*, allow",
      ]
      groups = ["platform-admins"]
    }

    # Sync windows
    sync_window {
      kind         = "deny"
      schedule     = "0 22 * * 5"
      duration     = "36h"
      applications = ["*"]
      clusters     = ["*"]
      namespaces   = ["*"]
    }
  }
}
```

## Managing ArgoCD Applications

Define ArgoCD Applications as Terraform resources:

```hcl
resource "argocd_application" "api_service" {
  metadata {
    name      = "api-service"
    namespace = "argocd"
    labels = {
      team        = "backend"
      environment = var.environment
    }
  }

  spec {
    project = argocd_project.platform.metadata[0].name

    source {
      repo_url        = "https://github.com/myorg/platform-gitops.git"
      target_revision = var.git_branch
      path            = "apps/api-service/overlays/${var.environment}"
    }

    destination {
      server    = "https://kubernetes.default.svc"
      namespace = "api-${var.environment}"
    }

    sync_policy {
      automated {
        prune       = true
        self_heal   = true
        allow_empty = false
      }

      retry {
        limit = 5
        backoff {
          duration     = "5s"
          factor       = 2
          max_duration = "3m"
        }
      }

      sync_options = [
        "CreateNamespace=true",
        "PrunePropagationPolicy=foreground",
        "PruneLast=true",
      ]
    }

    # Ignore differences managed by other controllers
    ignore_difference {
      group         = "apps"
      kind          = "Deployment"
      json_pointers = ["/spec/replicas"]
    }
  }

  wait = true

  depends_on = [argocd_project.platform]
}
```

## Managing Helm-Based Applications

For applications deployed from Helm charts:

```hcl
resource "argocd_application" "nginx_ingress" {
  metadata {
    name      = "nginx-ingress"
    namespace = "argocd"
  }

  spec {
    project = "platform"

    source {
      repo_url        = "https://kubernetes.github.io/ingress-nginx"
      chart           = "ingress-nginx"
      target_revision = "4.9.0"

      helm {
        release_name = "nginx-ingress"

        values = yamlencode({
          controller = {
            replicaCount = var.environment == "production" ? 3 : 1
            resources = {
              requests = {
                cpu    = "100m"
                memory = "128Mi"
              }
              limits = {
                cpu    = "500m"
                memory = "512Mi"
              }
            }
            metrics = {
              enabled = true
            }
          }
        })

        parameter {
          name  = "controller.service.type"
          value = "LoadBalancer"
        }
      }
    }

    destination {
      server    = "https://kubernetes.default.svc"
      namespace = "ingress-system"
    }

    sync_policy {
      automated {
        prune     = true
        self_heal = true
      }
      sync_options = ["CreateNamespace=true"]
    }
  }
}
```

## Managing Repository Credentials

Register Git repositories with ArgoCD:

```hcl
resource "argocd_repository" "platform_gitops" {
  repo     = "https://github.com/myorg/platform-gitops.git"
  type     = "git"
  username = "argocd-bot"
  password = var.git_token

  # SSH-based authentication alternative
  # ssh_private_key = var.ssh_private_key
}

# Helm repository
resource "argocd_repository" "bitnami" {
  repo = "https://charts.bitnami.com/bitnami"
  type = "helm"
  name = "bitnami"
}

# OCI Helm repository
resource "argocd_repository" "oci_charts" {
  repo            = "oci://myregistry.io/helm-charts"
  type            = "helm"
  name            = "internal-charts"
  username        = var.registry_username
  password        = var.registry_password
  enable_oci      = true
}
```

## Managing Cluster Connections

Register external clusters for multi-cluster deployments:

```hcl
resource "argocd_cluster" "staging" {
  server = "https://staging-cluster.example.com"
  name   = "staging"

  config {
    bearer_token = var.staging_cluster_token

    tls_client_config {
      ca_data = base64decode(var.staging_ca_cert)
    }
  }

  metadata {
    labels = {
      environment = "staging"
      region      = "us-east-1"
    }
  }
}
```

## Building a Complete Platform Module

Combine everything into a reusable Terraform module:

```hcl
# modules/argocd-app/variables.tf
variable "app_name" {
  type = string
}

variable "project" {
  type = string
}

variable "repo_url" {
  type = string
}

variable "path" {
  type = string
}

variable "environment" {
  type = string
}

variable "namespace" {
  type = string
}

variable "auto_sync" {
  type    = bool
  default = true
}

# modules/argocd-app/main.tf
resource "argocd_application" "app" {
  metadata {
    name      = "${var.app_name}-${var.environment}"
    namespace = "argocd"
    labels = {
      app         = var.app_name
      environment = var.environment
      managed-by  = "terraform"
    }
  }

  spec {
    project = var.project

    source {
      repo_url        = var.repo_url
      target_revision = "main"
      path            = "${var.path}/overlays/${var.environment}"
    }

    destination {
      server    = "https://kubernetes.default.svc"
      namespace = var.namespace
    }

    dynamic "sync_policy" {
      for_each = var.auto_sync ? [1] : []
      content {
        automated {
          prune     = true
          self_heal = true
        }
        sync_options = ["CreateNamespace=true"]
      }
    }
  }
}
```

Use the module for each application:

```hcl
module "api_service" {
  source      = "./modules/argocd-app"
  app_name    = "api-service"
  project     = argocd_project.platform.metadata[0].name
  repo_url    = "https://github.com/myorg/platform-gitops.git"
  path        = "apps/api-service"
  environment = var.environment
  namespace   = "api"
}

module "frontend" {
  source      = "./modules/argocd-app"
  app_name    = "frontend"
  project     = argocd_project.platform.metadata[0].name
  repo_url    = "https://github.com/myorg/platform-gitops.git"
  path        = "apps/frontend"
  environment = var.environment
  namespace   = "frontend"
}
```

## Importing Existing ArgoCD Resources

If you already have ArgoCD resources created manually, import them into Terraform:

```bash
# Import an existing application
terraform import argocd_application.api_service argocd/api-service

# Import a project
terraform import argocd_project.platform argocd/platform

# Import a repository
terraform import argocd_repository.platform_gitops https://github.com/myorg/platform-gitops.git
```

For more on deploying ArgoCD itself with Terraform, see our guide on [deploying ArgoCD with Terraform](https://oneuptime.com/blog/post/2026-02-23-argocd-terraform/view). For state management considerations, see [Terraform and ArgoCD state management](https://oneuptime.com/blog/post/2026-02-26-terraform-argocd-state-management/view).

## Best Practices

1. **Use Terraform for structure, ArgoCD for apps** - Let Terraform manage ArgoCD projects, repos, and cluster connections. Let ArgoCD manage the actual application deployments.
2. **Store provider credentials securely** - Never hardcode tokens. Use secret managers or environment variables.
3. **Use modules for repeated patterns** - Standardize application definitions with reusable modules.
4. **Import before recreating** - If resources already exist, import them into Terraform state.
5. **Pin provider versions** - The ArgoCD provider evolves quickly. Pin to a specific version.
6. **Use `wait = true` carefully** - Waiting for application health can make Terraform plans slow.
7. **Separate Terraform state from GitOps state** - Terraform manages ArgoCD configuration. ArgoCD manages application state. Keep these concerns separate.

The Terraform ArgoCD provider bridges the gap between infrastructure provisioning and GitOps configuration, letting you manage your entire platform from a single Terraform codebase.
