# How to Handle Kubernetes Provider Authentication in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Authentication, EKS, GKE, AKS, DevOps

Description: Learn how to authenticate Terraform's Kubernetes provider with different cluster types including EKS, GKE, AKS, kubeconfig files, and service account tokens.

---

Before Terraform can create a single Kubernetes resource, it needs to authenticate with your cluster. This sounds straightforward, but in practice the authentication setup varies significantly depending on your cluster type and deployment environment. EKS uses IAM, GKE uses Google OAuth tokens, AKS uses Azure AD, and local clusters use kubeconfig files. Getting this wrong means Terraform cannot talk to your cluster at all.

This guide covers authentication patterns for every major Kubernetes platform.

## The Kubernetes Provider Basics

The Kubernetes provider (and the Helm provider, which uses the same authentication) needs three things to connect: the cluster endpoint, a certificate authority to verify the server, and credentials to authenticate the client.

```hcl
# The simplest possible configuration - use local kubeconfig
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "my-cluster"
}

provider "helm" {
  kubernetes {
    config_path    = "~/.kube/config"
    config_context = "my-cluster"
  }
}
```

This works for local development but breaks in CI/CD where there is no kubeconfig file. Let's look at platform-specific approaches.

## AWS EKS Authentication

EKS uses IAM for authentication. The Terraform AWS provider can fetch the cluster details and generate a token.

```hcl
# Fetch EKS cluster information
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = var.cluster_name
}

# Configure providers using EKS data
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}
```

### Using exec-based Authentication for EKS

The token from `aws_eks_cluster_auth` expires after 15 minutes. For long Terraform runs, use exec-based authentication instead.

```hcl
provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)

  # Use the AWS CLI to generate tokens on demand
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", var.cluster_name]
  }
}
```

This calls `aws eks get-token` each time Terraform needs to authenticate, so the token is always fresh.

### EKS with Assumed Role

When Terraform runs in a CI/CD pipeline that assumes an IAM role:

```hcl
provider "aws" {
  region = var.aws_region

  assume_role {
    role_arn = var.deploy_role_arn
  }
}

# The EKS auth inherits the assumed role
data "aws_eks_cluster_auth" "cluster" {
  name = var.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}
```

Make sure the assumed role is mapped in the EKS aws-auth ConfigMap.

## Google GKE Authentication

GKE uses Google OAuth tokens for authentication.

```hcl
# Get the current Google client configuration
data "google_client_config" "current" {}

# Fetch GKE cluster information
data "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.cluster_location
}

# Configure providers using GKE data
provider "kubernetes" {
  host                   = "https://${data.google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.current.access_token
  cluster_ca_certificate = base64decode(data.google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = "https://${data.google_container_cluster.primary.endpoint}"
    token                  = data.google_client_config.current.access_token
    cluster_ca_certificate = base64decode(data.google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
  }
}
```

### GKE with Workload Identity

For GKE clusters using Workload Identity Federation:

```hcl
# Use gcloud to get credentials (exec-based)
provider "kubernetes" {
  host                   = "https://${data.google_container_cluster.primary.endpoint}"
  cluster_ca_certificate = base64decode(data.google_container_cluster.primary.master_auth[0].cluster_ca_certificate)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "gke-gcloud-auth-plugin"
  }
}
```

## Azure AKS Authentication

AKS supports both Azure AD and client certificate authentication.

```hcl
# Fetch AKS cluster information
data "azurerm_kubernetes_cluster" "cluster" {
  name                = var.cluster_name
  resource_group_name = var.resource_group_name
}

# Configure providers using AKS data
provider "kubernetes" {
  host                   = data.azurerm_kubernetes_cluster.cluster.kube_config[0].host
  client_certificate     = base64decode(data.azurerm_kubernetes_cluster.cluster.kube_config[0].client_certificate)
  client_key             = base64decode(data.azurerm_kubernetes_cluster.cluster.kube_config[0].client_key)
  cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.cluster.kube_config[0].cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = data.azurerm_kubernetes_cluster.cluster.kube_config[0].host
    client_certificate     = base64decode(data.azurerm_kubernetes_cluster.cluster.kube_config[0].client_certificate)
    client_key             = base64decode(data.azurerm_kubernetes_cluster.cluster.kube_config[0].client_key)
    cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.cluster.kube_config[0].cluster_ca_certificate)
  }
}
```

### AKS with Azure AD

For AKS clusters with Azure AD integration:

```hcl
provider "kubernetes" {
  host                   = data.azurerm_kubernetes_cluster.cluster.kube_config[0].host
  cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.cluster.kube_config[0].cluster_ca_certificate)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "kubelogin"
    args = [
      "get-token",
      "--login", "spn",
      "--server-id", var.aad_server_app_id,
      "--environment", "AzurePublicCloud",
      "--tenant-id", var.tenant_id,
    ]
    env = {
      AAD_SERVICE_PRINCIPAL_CLIENT_ID     = var.client_id
      AAD_SERVICE_PRINCIPAL_CLIENT_SECRET = var.client_secret
    }
  }
}
```

## Service Account Token Authentication

For clusters where you have a service account token:

```hcl
# Use a service account token directly
provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  token                  = var.service_account_token
}
```

Create the service account and get its token:

```hcl
# Create a service account for Terraform
resource "kubernetes_service_account" "terraform" {
  metadata {
    name      = "terraform"
    namespace = "kube-system"
  }
}

# Bind it to cluster-admin (or a more restrictive role)
resource "kubernetes_cluster_role_binding" "terraform" {
  metadata {
    name = "terraform-admin"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "cluster-admin"
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.terraform.metadata[0].name
    namespace = "kube-system"
  }
}

# Create a long-lived token (Kubernetes 1.24+)
resource "kubernetes_secret" "terraform_token" {
  metadata {
    name      = "terraform-token"
    namespace = "kube-system"

    annotations = {
      "kubernetes.io/service-account.name" = kubernetes_service_account.terraform.metadata[0].name
    }
  }

  type = "kubernetes.io/service-account-token"
}
```

## Creating Cluster and Configuring Providers in One Module

A common pattern is creating the cluster and deploying resources in the same Terraform configuration. This requires careful provider configuration.

```hcl
# Create the EKS cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.21.0"

  cluster_name    = "my-cluster"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      instance_types = ["m5.large"]
      min_size       = 2
      max_size       = 10
      desired_size   = 3
    }
  }
}

# Configure Kubernetes provider using module outputs
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

## Troubleshooting Authentication Issues

Common problems and solutions:

```bash
# Check if your kubeconfig is valid
kubectl cluster-info

# For EKS, verify the IAM identity
aws sts get-caller-identity

# Check the aws-auth ConfigMap
kubectl get configmap aws-auth -n kube-system -o yaml

# For GKE, verify credentials
gcloud auth list
gcloud container clusters get-credentials CLUSTER_NAME --region REGION

# Test connectivity
kubectl get nodes
```

## Best Practices

- Use exec-based authentication for long Terraform runs to avoid token expiration
- Never hardcode credentials in Terraform files
- Use IAM roles, Workload Identity, or Azure AD instead of static tokens when possible
- For CI/CD, use short-lived credentials from your cloud provider's identity service
- Keep cluster creation and resource deployment in separate Terraform states when possible
- Test authentication independently before running Terraform

For more on managing Kubernetes resources after authentication, see our guide on [handling Kubernetes resource dependencies in Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-resource-dependencies-terraform/view).
