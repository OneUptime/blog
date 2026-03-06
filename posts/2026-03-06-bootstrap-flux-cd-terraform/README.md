# How to Bootstrap Flux CD with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, terraform, gitops, kubernetes, infrastructure as code, bootstrap

Description: A practical guide to bootstrapping Flux CD on Kubernetes clusters using Terraform for repeatable and automated GitOps setup.

---

## Introduction

Bootstrapping Flux CD manually with the CLI works well for individual clusters, but when you manage dozens or hundreds of clusters, you need automation. Terraform provides a declarative way to bootstrap Flux CD consistently across all your environments.

This guide walks you through setting up Flux CD using the official Terraform provider, configuring Git repositories, and ensuring your GitOps pipeline is production-ready from day one.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (EKS, GKE, AKS, or local)
- Terraform v1.5 or later installed
- A GitHub personal access token with repo permissions
- kubectl configured to access your cluster

## Setting Up the Terraform Project

Start by creating a new Terraform project with the required providers.

```hcl
# versions.tf
# Define required providers for Flux CD bootstrapping
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    # The Flux provider handles Flux CD installation and configuration
    flux = {
      source  = "fluxcd/flux"
      version = ">= 1.4.0"
    }

    # GitHub provider manages repository and deploy key setup
    github = {
      source  = "integrations/github"
      version = ">= 6.0.0"
    }

    # Kubernetes provider for cluster access validation
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.27.0"
    }

    # TLS provider generates SSH keys for Git authentication
    tls = {
      source  = "hashicorp/tls"
      version = ">= 4.0.0"
    }
  }
}
```

## Configuring Variables

Define the variables your bootstrap process needs.

```hcl
# variables.tf
# GitHub organization or user account name
variable "github_owner" {
  description = "GitHub owner (organization or user)"
  type        = string
}

# Personal access token for GitHub API operations
variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

# Name of the Git repository that Flux will manage
variable "repository_name" {
  description = "Name of the GitHub repository for Flux"
  type        = string
  default     = "fleet-infra"
}

# Target environment for the cluster
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
}

# Kubernetes cluster name for identification
variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
}
```

## Configuring Providers

Set up each provider with the required authentication.

```hcl
# providers.tf
# Configure the GitHub provider with token authentication
provider "github" {
  owner = var.github_owner
  token = var.github_token
}

# Configure the Kubernetes provider using kubeconfig
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.cluster_name
}

# Configure the Flux provider to connect to both Kubernetes and Git
provider "flux" {
  kubernetes = {
    config_path    = "~/.kube/config"
    config_context = var.cluster_name
  }

  git = {
    url = "ssh://git@github.com/${var.github_owner}/${var.repository_name}.git"
    ssh = {
      username    = "git"
      private_key = tls_private_key.flux.private_key_pem
    }
  }
}
```

## Generating SSH Keys

Create an SSH key pair for Flux to authenticate with your Git repository.

```hcl
# main.tf - SSH key generation
# Generate an ED25519 SSH key pair for Flux Git authentication
resource "tls_private_key" "flux" {
  algorithm   = "ED25519"
}

# Create the GitHub repository if it does not exist
resource "github_repository" "flux" {
  name        = var.repository_name
  description = "Flux CD fleet infrastructure repository"
  visibility  = "private"
  auto_init   = true
}

# Add the public key as a deploy key to the GitHub repository
# Write access is required so Flux can push status updates
resource "github_repository_deploy_key" "flux" {
  title      = "Flux CD - ${var.cluster_name}"
  repository = github_repository.flux.name
  key        = tls_private_key.flux.public_key_openssh
  read_only  = false
}
```

## Bootstrapping Flux CD

Now define the Flux bootstrap resource that installs Flux and configures it.

```hcl
# main.tf - Flux bootstrap
# Bootstrap Flux CD onto the Kubernetes cluster
# This installs the Flux controllers and creates the initial Git source
resource "flux_bootstrap_git" "this" {
  # Depend on the deploy key being present before bootstrapping
  depends_on = [github_repository_deploy_key.flux]

  # Path inside the Git repository where this cluster's manifests live
  path = "clusters/${var.environment}/${var.cluster_name}"

  # Flux components to install on the cluster
  components = [
    "source-controller",
    "kustomize-controller",
    "helm-controller",
    "notification-controller"
  ]

  # Namespace where Flux system components are deployed
  namespace = "flux-system"

  # Set the Flux version to install
  version = "v2.4.0"
}
```

## Adding Outputs

Define outputs to capture important information after bootstrapping.

```hcl
# outputs.tf
# Output the repository URL for reference
output "repository_url" {
  description = "URL of the Flux Git repository"
  value       = github_repository.flux.html_url
}

# Output the path within the repository for this cluster
output "cluster_path" {
  description = "Path in the repository for this cluster"
  value       = "clusters/${var.environment}/${var.cluster_name}"
}

# Output the Flux namespace
output "flux_namespace" {
  description = "Namespace where Flux is installed"
  value       = flux_bootstrap_git.this.namespace
}
```

## Running the Bootstrap

Execute the Terraform workflow to bootstrap Flux.

```bash
# Initialize the Terraform project and download providers
terraform init

# Create a plan to review what will be created
terraform plan \
  -var="github_owner=my-org" \
  -var="github_token=$GITHUB_TOKEN" \
  -var="cluster_name=production-east-1"

# Apply the configuration to bootstrap Flux
terraform apply \
  -var="github_owner=my-org" \
  -var="github_token=$GITHUB_TOKEN" \
  -var="cluster_name=production-east-1" \
  -auto-approve
```

## Using a Terraform Variables File

For production use, store variables in a tfvars file.

```hcl
# environments/production.tfvars
# Production cluster configuration
github_owner    = "my-org"
repository_name = "fleet-infra"
environment     = "production"
cluster_name    = "production-east-1"
```

```bash
# Apply using the variables file
# The github_token is passed via environment variable for security
export TF_VAR_github_token="$GITHUB_TOKEN"
terraform apply -var-file="environments/production.tfvars"
```

## Verifying the Bootstrap

After Terraform completes, verify that Flux is running correctly.

```bash
# Check that all Flux controllers are running
kubectl get pods -n flux-system

# Verify the GitRepository source is synced
kubectl get gitrepositories -n flux-system

# Check the Kustomization reconciliation status
kubectl get kustomizations -n flux-system

# Use the Flux CLI for a comprehensive check
flux check
```

## Multi-Cluster Bootstrap with Terraform Workspaces

You can use Terraform workspaces to bootstrap multiple clusters from the same configuration.

```bash
# Create a workspace for each cluster
terraform workspace new production-east-1
terraform workspace new production-west-2
terraform workspace new staging-east-1

# Switch to a workspace and apply
terraform workspace select production-east-1
terraform apply -var-file="environments/production-east-1.tfvars"

# Switch to the next cluster
terraform workspace select production-west-2
terraform apply -var-file="environments/production-west-2.tfvars"
```

## Storing Terraform State Remotely

For team collaboration, configure remote state storage.

```hcl
# backend.tf
# Store Terraform state in S3 with DynamoDB locking
terraform {
  backend "s3" {
    bucket         = "my-org-terraform-state"
    key            = "flux-bootstrap/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

## Handling Bootstrap Updates

When you need to update Flux versions or components, modify the Terraform configuration and re-apply.

```hcl
# Update the Flux version in the bootstrap resource
resource "flux_bootstrap_git" "this" {
  depends_on = [github_repository_deploy_key.flux]
  path       = "clusters/${var.environment}/${var.cluster_name}"

  # Upgrade to a newer Flux version
  version = "v2.5.0"

  # Add image automation controllers for automated image updates
  components_extra = [
    "image-reflector-controller",
    "image-automation-controller"
  ]

  namespace = "flux-system"
}
```

## Destroying and Recreating

If you need to tear down Flux from a cluster, Terraform handles the cleanup.

```bash
# Remove Flux and all its resources from the cluster
terraform destroy \
  -var="github_owner=my-org" \
  -var="github_token=$GITHUB_TOKEN" \
  -var="cluster_name=production-east-1"
```

## Troubleshooting Common Issues

### Deploy Key Permission Errors

If Flux cannot push to the repository, verify the deploy key has write access:

```bash
# Check the deploy key in GitHub
gh repo deploy-key list --repo my-org/fleet-infra

# Verify the SSH key fingerprint matches
ssh-keygen -lf <(terraform output -raw flux_public_key)
```

### Flux Controllers Not Starting

If controllers fail to start, check the namespace events:

```bash
# View events in the flux-system namespace
kubectl get events -n flux-system --sort-by='.lastTimestamp'

# Check controller logs for errors
kubectl logs -n flux-system deployment/source-controller
```

## Conclusion

Bootstrapping Flux CD with Terraform gives you a repeatable, version-controlled way to set up GitOps across your infrastructure. By combining Terraform's state management with Flux's continuous delivery, you get full visibility into both your infrastructure provisioning and application deployment pipelines. This approach scales from a single cluster to hundreds, with each cluster's configuration tracked in both Terraform state and Git.
