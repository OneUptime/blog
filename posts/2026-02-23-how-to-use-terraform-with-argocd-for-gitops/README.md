# How to Use Terraform with ArgoCD for GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, ArgoCD, GitOps, Kubernetes, DevOps, Infrastructure as Code, CI/CD

Description: Learn how to combine Terraform for infrastructure provisioning with ArgoCD for GitOps-based application delivery on Kubernetes clusters.

---

Terraform and ArgoCD serve complementary roles in modern cloud-native workflows. Terraform provisions and manages the underlying infrastructure, while ArgoCD handles application deployment using GitOps principles. This guide shows you how to use both tools together effectively, creating a seamless pipeline from infrastructure provisioning to application delivery.

## Understanding the Terraform and ArgoCD Workflow

In a typical GitOps workflow, Terraform handles the "Day 0" and "Day 1" operations like creating Kubernetes clusters, networking, databases, and other cloud resources. ArgoCD then takes over for "Day 2" operations, continuously syncing application manifests from Git repositories to the Kubernetes cluster. The boundary between these two tools is the Kubernetes cluster itself.

## Prerequisites

You will need a cloud provider account (AWS, GCP, or Azure), Terraform version 1.0 or later, kubectl configured for your cluster, Helm for installing ArgoCD, and a Git repository for your application manifests.

## Step 1: Provision a Kubernetes Cluster with Terraform

Start by creating the infrastructure that ArgoCD will manage.

```hcl
# providers.tf
# Configure the AWS provider and EKS module
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

```hcl
# eks-cluster.tf
# Create an EKS cluster for ArgoCD and application workloads
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.29"

  # Enable public and private access to the cluster
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Define managed node groups
  eks_managed_node_groups = {
    general = {
      desired_size = 3
      min_size     = 2
      max_size     = 5

      instance_types = ["t3.medium"]
    }
  }
}

# Configure the Kubernetes provider using the EKS cluster details
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

# Configure the Helm provider similarly
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}
```

## Step 2: Install ArgoCD with Terraform

Use the Helm provider to install ArgoCD on the cluster Terraform just created.

```hcl
# argocd.tf
# Create a namespace for ArgoCD
resource "kubernetes_namespace" "argocd" {
  metadata {
    name = "argocd"
  }

  depends_on = [module.eks]
}

# Install ArgoCD using Helm
resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "5.51.0"
  namespace  = kubernetes_namespace.argocd.metadata[0].name

  # Configure ArgoCD server settings
  set {
    name  = "server.service.type"
    value = "LoadBalancer"
  }

  # Enable HA mode for production
  set {
    name  = "redis-ha.enabled"
    value = "true"
  }

  set {
    name  = "controller.replicas"
    value = "2"
  }

  set {
    name  = "server.replicas"
    value = "2"
  }

  set {
    name  = "repoServer.replicas"
    value = "2"
  }

  # Set the admin password
  set_sensitive {
    name  = "configs.secret.argocdServerAdminPassword"
    value = bcrypt(var.argocd_admin_password)
  }

  depends_on = [kubernetes_namespace.argocd]
}
```

## Step 3: Configure ArgoCD Applications with Terraform

After installing ArgoCD, use Terraform to configure the applications it should manage.

```hcl
# argocd-apps.tf
# Define an ArgoCD Application resource using the Kubernetes provider
resource "kubernetes_manifest" "argocd_app" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"

    metadata = {
      name      = "my-application"
      namespace = "argocd"
    }

    spec = {
      project = "default"

      # Source Git repository containing the application manifests
      source = {
        repoURL        = "https://github.com/your-org/app-manifests.git"
        targetRevision = "HEAD"
        path           = "environments/production"
      }

      # Destination cluster and namespace
      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "production"
      }

      # Sync policy for automatic synchronization
      syncPolicy = {
        automated = {
          prune    = true
          selfHeal = true
        }

        syncOptions = [
          "CreateNamespace=true"
        ]

        retry = {
          limit = 5
          backoff = {
            duration    = "5s"
            factor      = 2
            maxDuration = "3m"
          }
        }
      }
    }
  }

  depends_on = [helm_release.argocd]
}
```

## Step 4: Set Up the App of Apps Pattern

The App of Apps pattern lets ArgoCD manage a collection of applications defined in a single repository.

```hcl
# app-of-apps.tf
# Create the root application that manages all other applications
resource "kubernetes_manifest" "argocd_root_app" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"

    metadata = {
      name      = "root-app"
      namespace = "argocd"
      finalizers = [
        "resources-finalizer.argocd.argoproj.io"
      ]
    }

    spec = {
      project = "default"

      source = {
        repoURL        = "https://github.com/your-org/argocd-apps.git"
        targetRevision = "main"
        path           = "apps"
      }

      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "argocd"
      }

      syncPolicy = {
        automated = {
          prune    = true
          selfHeal = true
        }
      }
    }
  }

  depends_on = [helm_release.argocd]
}
```

## Step 5: Configure ArgoCD Projects for Multi-Team Access

Use Terraform to define ArgoCD projects that control which repositories and clusters each team can access.

```hcl
# argocd-projects.tf
# Create a project for the platform team
resource "kubernetes_manifest" "platform_project" {
  manifest = {
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "AppProject"

    metadata = {
      name      = "platform"
      namespace = "argocd"
    }

    spec = {
      description = "Platform team applications"

      # Allowed source repositories
      sourceRepos = [
        "https://github.com/your-org/platform-apps.git",
        "https://github.com/your-org/shared-charts.git",
      ]

      # Allowed destinations
      destinations = [
        {
          server    = "https://kubernetes.default.svc"
          namespace = "platform-*"
        }
      ]

      # Cluster resource allow list
      clusterResourceWhitelist = [
        {
          group = ""
          kind  = "Namespace"
        }
      ]

      # Namespace resource allow list
      namespaceResourceWhitelist = [
        {
          group = "*"
          kind  = "*"
        }
      ]
    }
  }

  depends_on = [helm_release.argocd]
}
```

## Step 6: Managing Repository Credentials

Store Git repository credentials in Kubernetes secrets that ArgoCD can access.

```hcl
# argocd-repos.tf
# Create a secret for private repository access
resource "kubernetes_secret" "argocd_repo" {
  metadata {
    name      = "private-repo"
    namespace = "argocd"
    labels = {
      "argocd.argoproj.io/secret-type" = "repository"
    }
  }

  data = {
    type     = "git"
    url      = "https://github.com/your-org/private-manifests.git"
    username = var.git_username
    password = var.git_token
  }

  depends_on = [kubernetes_namespace.argocd]
}
```

## Separating Concerns: Infrastructure vs Application

A key principle when using Terraform with ArgoCD is maintaining clear boundaries. Terraform should manage cloud resources like VPCs, clusters, databases, load balancers, IAM roles, and the ArgoCD installation itself. ArgoCD should manage everything that runs inside Kubernetes including deployments, services, configmaps, ingress rules, and application-level resources.

This separation means that infrastructure changes go through Terraform's plan-and-apply workflow with state management, while application changes follow the GitOps model with automatic sync from Git.

## Handling the Handoff

The output from Terraform often becomes input for ArgoCD applications. For example, Terraform creates a database and outputs the connection string, which then needs to be available to applications managed by ArgoCD.

```hcl
# handoff.tf
# Create a Kubernetes secret with infrastructure outputs for application use
resource "kubernetes_secret" "infra_outputs" {
  metadata {
    name      = "infrastructure-config"
    namespace = "production"
  }

  data = {
    database_endpoint = module.rds.cluster_endpoint
    redis_endpoint    = module.elasticache.cluster_address
    s3_bucket_name    = module.s3.bucket_name
  }

  depends_on = [module.eks]
}
```

## Best Practices

Keep your Terraform and ArgoCD repositories separate to maintain clear ownership. Use Terraform for anything that lives outside of Kubernetes and ArgoCD for everything inside. Version pin both your Terraform providers and ArgoCD Helm chart. Implement proper RBAC in ArgoCD using projects to limit team access. Use the App of Apps pattern to scale your ArgoCD setup. Monitor both your Terraform state and ArgoCD sync status for drift detection.

## Conclusion

Terraform and ArgoCD together provide a complete infrastructure and application delivery pipeline. Terraform handles the heavy lifting of cloud resource provisioning and cluster setup, while ArgoCD ensures your applications are continuously deployed and reconciled with their desired state in Git. This combination gives you the best of both worlds: declarative infrastructure management and GitOps-driven application delivery.
