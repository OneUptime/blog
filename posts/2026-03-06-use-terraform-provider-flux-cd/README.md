# How to Use Terraform Provider for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Terraform, Infrastructure as Code, GitOps, Kubernetes, Iac integration

Description: A comprehensive guide to using the Terraform provider for Flux CD to bootstrap and manage Flux installations as part of your infrastructure as code workflow.

---

## Introduction

The Terraform provider for Flux CD bridges the gap between infrastructure provisioning and GitOps. It allows you to bootstrap Flux CD as part of your Terraform workflow, ensuring that when a new cluster is provisioned, Flux is automatically installed and configured. This creates a seamless pipeline from infrastructure creation to application deployment.

This guide covers using the Flux Terraform provider to bootstrap clusters, manage Flux configurations, and integrate with existing Terraform modules for cloud infrastructure.

## Prerequisites

- Terraform 1.5 or later installed
- A Kubernetes cluster (or Terraform configuration to create one)
- A Git repository for Flux (GitHub, GitLab, or Bitbucket)
- Git provider API tokens
- kubectl configured for cluster access

## Why Use Terraform with Flux CD

Using Terraform to manage Flux CD provides several benefits:

- **Single workflow**: Provision infrastructure and bootstrap GitOps in one `terraform apply`
- **State management**: Track Flux installation state alongside infrastructure state
- **Reproducibility**: Create identical cluster+GitOps setups across environments
- **Integration**: Combine with other Terraform providers for end-to-end automation

## Setting Up the Provider

Configure the Flux Terraform provider in your Terraform configuration.

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    # Flux provider for bootstrapping
    flux = {
      source  = "fluxcd/flux"
      version = ">= 1.3.0"
    }
    # Kubernetes provider for cluster access
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.27.0"
    }
    # GitHub provider for repository management
    github = {
      source  = "integrations/github"
      version = ">= 6.0.0"
    }
    # AWS provider for EKS cluster
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}
```

## Provider Configuration

```hcl
# providers.tf

# AWS provider for EKS
provider "aws" {
  region = var.aws_region
}

# Get EKS cluster credentials
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = var.cluster_name
}

# Kubernetes provider using EKS credentials
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

# GitHub provider for repository access
provider "github" {
  owner = var.github_org
  token = var.github_token
}

# Flux provider configuration
provider "flux" {
  kubernetes = {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
  git = {
    url = "ssh://git@github.com/${var.github_org}/${var.github_repository}.git"
    ssh = {
      username    = "git"
      private_key = var.flux_ssh_private_key
    }
  }
}
```

## Variables

```hcl
# variables.tf
variable "aws_region" {
  description = "AWS region for the EKS cluster"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "github_org" {
  description = "GitHub organization or user"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository for Flux"
  type        = string
  default     = "fleet-infra"
}

variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "flux_ssh_private_key" {
  description = "SSH private key for Flux Git access"
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}
```

## Bootstrapping Flux CD

Use the flux_bootstrap_git resource to install Flux on the cluster.

```hcl
# flux.tf

# Bootstrap Flux CD on the cluster
resource "flux_bootstrap_git" "this" {
  # Embedded manifests are included in the provider
  embedded_manifests = true

  # Path in the Git repository for this cluster's configuration
  path = "clusters/${var.cluster_name}"

  # Flux components to install
  components = [
    "source-controller",
    "kustomize-controller",
    "helm-controller",
    "notification-controller",
  ]

  # Additional components for image automation
  components_extra = [
    "image-reflector-controller",
    "image-automation-controller",
  ]

  # Kubernetes namespace for Flux
  namespace = "flux-system"

  # Interval for Git repository polling
  interval = "1m"

  # Network policy for Flux components
  network_policy = true

  # Toleration keys for Flux components
  toleration_keys = []

  # Registry to pull Flux images from
  registry = "ghcr.io/fluxcd"

  depends_on = [
    # Ensure the cluster exists before bootstrapping
    data.aws_eks_cluster.cluster,
  ]
}
```

## Complete EKS + Flux Setup

A full example that provisions an EKS cluster and bootstraps Flux.

```hcl
# eks.tf

# Create the EKS cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = "1.30"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Enable IRSA for service account IAM roles
  enable_irsa = true

  # Managed node groups
  eks_managed_node_groups = {
    general = {
      instance_types = ["m6i.large"]
      min_size       = 2
      max_size       = 5
      desired_size   = 3
    }
  }

  # Cluster access configuration
  cluster_endpoint_public_access = true
}

# VPC for the cluster
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  # Tags required for EKS
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}
```

## Creating the Git Repository Structure

Use Terraform to set up the initial repository structure for Flux.

```hcl
# repository.tf

# Create the fleet management repository
resource "github_repository" "fleet_infra" {
  name        = var.github_repository
  description = "Fleet infrastructure managed by Flux CD"
  visibility  = "private"
  auto_init   = true
}

# Create initial directory structure using repository files
resource "github_repository_file" "clusters_readme" {
  repository          = github_repository.fleet_infra.name
  branch              = "main"
  file                = "clusters/README.md"
  content             = "# Cluster Configurations\n\nThis directory contains per-cluster Flux configurations.\n"
  commit_message      = "Initialize cluster configurations directory"
  overwrite_on_create = true
}

resource "github_repository_file" "infrastructure_readme" {
  repository          = github_repository.fleet_infra.name
  branch              = "main"
  file                = "infrastructure/README.md"
  content             = "# Infrastructure Components\n\nShared infrastructure configurations.\n"
  commit_message      = "Initialize infrastructure directory"
  overwrite_on_create = true
}
```

## Deploying Infrastructure Components via Terraform

Push Flux Kustomization files to the repository to deploy infrastructure.

```hcl
# infrastructure-kustomizations.tf

# Deploy monitoring stack via Flux
resource "github_repository_file" "monitoring_kustomization" {
  repository = github_repository.fleet_infra.name
  branch     = "main"
  file       = "clusters/${var.cluster_name}/monitoring.yaml"
  content    = <<-EOT
    apiVersion: kustomize.toolkit.fluxcd.io/v1
    kind: Kustomization
    metadata:
      name: monitoring
      namespace: flux-system
    spec:
      interval: 15m
      path: ./infrastructure/monitoring
      prune: true
      sourceRef:
        kind: GitRepository
        name: flux-system
      healthChecks:
        - apiVersion: apps/v1
          kind: Deployment
          name: kube-prometheus-stack-grafana
          namespace: monitoring
      timeout: 10m
  EOT

  commit_message      = "Add monitoring stack for ${var.cluster_name}"
  overwrite_on_create = true

  depends_on = [flux_bootstrap_git.this]
}
```

## Multi-Cluster Management

Manage multiple clusters with separate Terraform workspaces.

```hcl
# multi-cluster.tf

# Define clusters as a map
variable "clusters" {
  description = "Map of cluster configurations"
  type = map(object({
    region      = string
    environment = string
    node_count  = number
  }))
  default = {
    "prod-us-east" = {
      region      = "us-east-1"
      environment = "production"
      node_count  = 5
    }
    "prod-eu-west" = {
      region      = "eu-west-1"
      environment = "production"
      node_count  = 3
    }
    "staging" = {
      region      = "us-east-1"
      environment = "staging"
      node_count  = 2
    }
  }
}

# Bootstrap Flux on each cluster
resource "flux_bootstrap_git" "clusters" {
  for_each = var.clusters

  embedded_manifests = true
  path               = "clusters/${each.key}"
  namespace          = "flux-system"

  components = [
    "source-controller",
    "kustomize-controller",
    "helm-controller",
    "notification-controller",
  ]
}
```

## Outputs

```hcl
# outputs.tf
output "flux_namespace" {
  description = "The namespace where Flux is installed"
  value       = flux_bootstrap_git.this.namespace
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "flux_git_path" {
  description = "Git repository path for this cluster"
  value       = "clusters/${var.cluster_name}"
}
```

## Terraform Backend Configuration

Store Terraform state securely.

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "flux-clusters/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

## Applying the Configuration

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan -var-file="production.tfvars"

# Apply to create the cluster and bootstrap Flux
terraform apply -var-file="production.tfvars"

# Verify Flux is running
export KUBECONFIG=$(terraform output -raw kubeconfig_path)
flux check
flux get all
```

## Environment-Specific Variables

```hcl
# production.tfvars
aws_region        = "us-east-1"
cluster_name      = "prod-cluster"
github_org        = "my-org"
github_repository = "fleet-infra"
environment       = "production"
```

```hcl
# staging.tfvars
aws_region        = "us-east-1"
cluster_name      = "staging-cluster"
github_org        = "my-org"
github_repository = "fleet-infra"
environment       = "staging"
```

## Verifying the Setup

```bash
# Check Terraform state
terraform state list

# Verify Flux bootstrap resource
terraform state show flux_bootstrap_git.this

# Check Flux components on the cluster
kubectl get pods -n flux-system

# Verify Git repository source
flux get sources git

# Check all Flux resources
flux get all --all-namespaces
```

## Troubleshooting

- **Provider authentication errors**: Verify GitHub token has repo and admin:public_key scopes. Check SSH key format
- **Bootstrap timeout**: Ensure the cluster is reachable and the Kubernetes provider is correctly configured
- **State conflicts**: Use Terraform workspaces or separate state files for each cluster
- **Drift detection**: Run `terraform plan` regularly to detect configuration drift between Terraform state and actual cluster state
- **Flux not reconciling**: Check the Git repository URL and SSH key. Verify the path exists in the repository

## Conclusion

The Terraform provider for Flux CD creates a powerful integration between infrastructure provisioning and GitOps. By bootstrapping Flux as part of your Terraform workflow, you ensure that every new cluster is immediately ready for GitOps-driven deployments. This approach provides a single source of truth for both infrastructure and application configuration, making it easier to manage fleets of clusters at scale.
