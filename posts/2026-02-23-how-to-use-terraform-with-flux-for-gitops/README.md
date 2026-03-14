# How to Use Terraform with Flux for GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Flux, GitOps, Kubernetes, DevOps, Infrastructure as Code, CI/CD

Description: Learn how to combine Terraform for infrastructure provisioning with Flux CD for GitOps-based continuous delivery on Kubernetes clusters.

---

Flux is a popular GitOps toolkit for Kubernetes that keeps clusters in sync with configuration stored in Git repositories. When combined with Terraform, you get a powerful end-to-end pipeline where Terraform provisions and configures cloud infrastructure, and Flux handles continuous delivery of applications. This guide walks you through setting up this combination from cluster creation to application deployment.

## Understanding Terraform and Flux Together

Terraform excels at provisioning cloud resources like Kubernetes clusters, networking, and managed services. Flux excels at keeping Kubernetes clusters synchronized with Git repositories containing application manifests. Together, they cover the entire lifecycle from infrastructure creation to application delivery, with each tool handling what it does best.

The typical workflow is: Terraform creates the cluster and installs Flux, Flux takes over and deploys applications from Git, and both tools continue to manage their respective domains independently.

## Prerequisites

You need a cloud provider account, Terraform version 1.0 or later, the Flux CLI installed, a GitHub personal access token with repo permissions, and kubectl configured for cluster access.

## Step 1: Provision the Kubernetes Cluster

Start with Terraform to create the underlying infrastructure.

```hcl
# providers.tf
# Define required providers for the Terraform configuration
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    flux = {
      source  = "fluxcd/flux"
      version = "~> 1.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

```hcl
# cluster.tf
# Create the EKS cluster that Flux will manage
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "flux-demo-cluster"
  cluster_version = "1.29"

  cluster_endpoint_public_access = true
  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      desired_size   = 3
      min_size       = 2
      max_size       = 5
      instance_types = ["t3.medium"]
    }
  }
}

# Configure providers that depend on the cluster
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}
```

## Step 2: Install Flux Using the Terraform Provider

The official Flux Terraform provider makes bootstrap straightforward.

```hcl
# flux.tf
# Configure the Flux provider
provider "flux" {
  kubernetes = {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec = {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }

  git = {
    url = "ssh://git@github.com/${var.github_org}/${var.github_repository}.git"
    ssh = {
      username    = "git"
      private_key = tls_private_key.flux.private_key_pem
    }
  }
}

# Generate an SSH key pair for Flux to access the Git repository
resource "tls_private_key" "flux" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

# Configure the GitHub provider
provider "github" {
  owner = var.github_org
  token = var.github_token
}

# Create the GitHub repository for Flux manifests
resource "github_repository" "flux" {
  name        = var.github_repository
  description = "Flux GitOps repository for Kubernetes cluster"
  visibility  = "private"
  auto_init   = true
}

# Add the Flux deploy key to the repository
resource "github_repository_deploy_key" "flux" {
  title      = "Flux CD"
  repository = github_repository.flux.name
  key        = tls_private_key.flux.public_key_openssh
  read_only  = false
}

# Bootstrap Flux on the cluster
resource "flux_bootstrap_git" "this" {
  depends_on = [github_repository_deploy_key.flux]

  path = "clusters/production"
}
```

## Step 3: Define Application Sources

With Flux installed, define GitRepository and HelmRepository sources using Terraform.

```hcl
# flux-sources.tf
# Create a GitRepository source for application manifests
resource "kubernetes_manifest" "app_source" {
  manifest = {
    apiVersion = "source.toolkit.fluxcd.io/v1"
    kind       = "GitRepository"

    metadata = {
      name      = "app-manifests"
      namespace = "flux-system"
    }

    spec = {
      interval = "1m"
      url      = "https://github.com/${var.github_org}/app-manifests.git"
      ref = {
        branch = "main"
      }
      secretRef = {
        name = "app-repo-credentials"
      }
    }
  }

  depends_on = [flux_bootstrap_git.this]
}

# Create a HelmRepository source for third-party charts
resource "kubernetes_manifest" "helm_repo" {
  manifest = {
    apiVersion = "source.toolkit.fluxcd.io/v1"
    kind       = "HelmRepository"

    metadata = {
      name      = "bitnami"
      namespace = "flux-system"
    }

    spec = {
      interval = "30m"
      url      = "https://charts.bitnami.com/bitnami"
    }
  }

  depends_on = [flux_bootstrap_git.this]
}
```

## Step 4: Configure Kustomizations

Kustomization resources tell Flux how to reconcile manifests from sources.

```hcl
# flux-kustomizations.tf
# Create a Kustomization for the production application
resource "kubernetes_manifest" "app_kustomization" {
  manifest = {
    apiVersion = "kustomize.toolkit.fluxcd.io/v1"
    kind       = "Kustomization"

    metadata = {
      name      = "production-apps"
      namespace = "flux-system"
    }

    spec = {
      interval    = "5m"
      retryInterval = "2m"
      timeout     = "3m"

      # Reference the Git source
      sourceRef = {
        kind = "GitRepository"
        name = "app-manifests"
      }

      # Path within the repository
      path  = "./production"
      prune = true

      # Health checks for deployed resources
      healthChecks = [
        {
          apiVersion = "apps/v1"
          kind       = "Deployment"
          name       = "my-app"
          namespace  = "production"
        }
      ]

      # Variable substitution from ConfigMaps and Secrets
      postBuild = {
        substituteFrom = [
          {
            kind = "ConfigMap"
            name = "cluster-config"
          },
          {
            kind = "Secret"
            name = "cluster-secrets"
          }
        ]
      }
    }
  }

  depends_on = [flux_bootstrap_git.this]
}
```

## Step 5: Deploy Helm Releases Through Flux

Use Terraform to create HelmRelease resources that Flux will manage.

```hcl
# flux-helm-releases.tf
# Create a HelmRelease for an application
resource "kubernetes_manifest" "nginx_release" {
  manifest = {
    apiVersion = "helm.toolkit.fluxcd.io/v2"
    kind       = "HelmRelease"

    metadata = {
      name      = "nginx-ingress"
      namespace = "flux-system"
    }

    spec = {
      interval = "10m"
      chart = {
        spec = {
          chart   = "nginx-ingress-controller"
          version = "9.x"
          sourceRef = {
            kind      = "HelmRepository"
            name      = "bitnami"
            namespace = "flux-system"
          }
        }
      }

      # Target namespace for the Helm release
      targetNamespace = "ingress-system"
      install = {
        createNamespace = true
      }

      # Helm values
      values = {
        replicaCount = 2
        service = {
          type = "LoadBalancer"
        }
      }
    }
  }

  depends_on = [flux_bootstrap_git.this]
}
```

## Step 6: Pass Infrastructure Outputs to Flux

Terraform often creates resources whose details need to be available to Flux-managed applications.

```hcl
# infra-outputs.tf
# Create a ConfigMap with infrastructure details for Flux substitution
resource "kubernetes_config_map" "cluster_config" {
  metadata {
    name      = "cluster-config"
    namespace = "flux-system"
  }

  data = {
    CLUSTER_NAME      = module.eks.cluster_name
    AWS_REGION        = var.aws_region
    DATABASE_ENDPOINT = module.rds.cluster_endpoint
    REDIS_ENDPOINT    = module.elasticache.cluster_address
  }

  depends_on = [flux_bootstrap_git.this]
}

# Create a Secret with sensitive infrastructure outputs
resource "kubernetes_secret" "cluster_secrets" {
  metadata {
    name      = "cluster-secrets"
    namespace = "flux-system"
  }

  data = {
    DATABASE_PASSWORD = var.database_password
    API_KEY           = var.api_key
  }

  depends_on = [flux_bootstrap_git.this]
}
```

## Step 7: Set Up Flux Notifications

Configure Flux to send notifications about deployment status.

```hcl
# flux-notifications.tf
# Create a notification provider for Slack
resource "kubernetes_manifest" "slack_provider" {
  manifest = {
    apiVersion = "notification.toolkit.fluxcd.io/v1"
    kind       = "Provider"

    metadata = {
      name      = "slack"
      namespace = "flux-system"
    }

    spec = {
      type    = "slack"
      channel = "deployments"
      address = var.slack_webhook_url
    }
  }

  depends_on = [flux_bootstrap_git.this]
}

# Create an alert for Flux events
resource "kubernetes_manifest" "flux_alert" {
  manifest = {
    apiVersion = "notification.toolkit.fluxcd.io/v1"
    kind       = "Alert"

    metadata = {
      name      = "deployment-alerts"
      namespace = "flux-system"
    }

    spec = {
      providerRef = {
        name = "slack"
      }

      eventSeverity = "info"

      # Watch these resources for events
      eventSources = [
        {
          kind      = "Kustomization"
          name      = "*"
          namespace = "flux-system"
        },
        {
          kind      = "HelmRelease"
          name      = "*"
          namespace = "flux-system"
        }
      ]
    }
  }

  depends_on = [flux_bootstrap_git.this]
}
```

## Multi-Cluster Setup

For organizations managing multiple clusters, Terraform can bootstrap Flux on each one.

```hcl
# multi-cluster.tf
# Define cluster configurations
locals {
  clusters = {
    production = {
      path   = "clusters/production"
      branch = "main"
    }
    staging = {
      path   = "clusters/staging"
      branch = "staging"
    }
  }
}

# Bootstrap Flux on each cluster
resource "flux_bootstrap_git" "clusters" {
  for_each = local.clusters

  path = each.value.path
}
```

## Best Practices

Use Terraform for infrastructure and Flux for applications, maintaining a clear separation of concerns. Store Flux manifests in the same repository that Flux watches so changes are automatically applied. Use Flux's variable substitution to inject Terraform outputs into application manifests. Implement Flux's image automation to keep container images up to date. Monitor Flux's reconciliation status to catch drift quickly. Pin Flux component versions in your Terraform configuration for reproducibility.

## Conclusion

Terraform and Flux together create a robust GitOps pipeline. Terraform handles cluster provisioning and initial Flux bootstrap, while Flux continuously reconciles application state from Git. This separation allows infrastructure and application teams to work independently while maintaining a consistent deployment process. The combination provides declarative management for your entire stack from cloud resources to running applications.
