# How to Deploy Dapr with Terraform on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Terraform, Kubernetes, Infrastructure as Code, Deployment

Description: Step-by-step guide to deploying Dapr on Kubernetes using Terraform with the Helm provider for repeatable, version-controlled infrastructure.

---

## Why Use Terraform for Dapr Deployments?

Terraform enables declarative, repeatable deployments of Dapr across multiple clusters and environments. By codifying your Dapr installation alongside your application infrastructure, you get consistent configuration, state tracking, and safe upgrades through plan/apply cycles.

## Prerequisites

- Terraform >= 1.3
- A running Kubernetes cluster
- `kubectl` configured with cluster access
- Helm provider for Terraform

## Setting Up the Terraform Configuration

Create a `main.tf` file with the required providers:

```hcl
terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Creating the Dapr Namespace

```hcl
resource "kubernetes_namespace" "dapr_system" {
  metadata {
    name = "dapr-system"
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}
```

## Deploying Dapr with the Helm Resource

```hcl
resource "helm_release" "dapr" {
  name       = "dapr"
  repository = "https://dapr.github.io/helm-charts/"
  chart      = "dapr"
  namespace  = kubernetes_namespace.dapr_system.metadata[0].name
  version    = "1.13.0"

  set {
    name  = "global.mtls.enabled"
    value = "true"
  }

  set {
    name  = "dapr_operator.replicaCount"
    value = "2"
  }

  set {
    name  = "dapr_sentry.replicaCount"
    value = "2"
  }

  set {
    name  = "global.ha.enabled"
    value = "true"
  }

  set {
    name  = "global.logAsJson"
    value = "true"
  }

  depends_on = [kubernetes_namespace.dapr_system]
}
```

## Adding Dapr Dashboard

The Dapr dashboard chart is not published to the main Dapr Helm repository. To install it via Terraform, use the chart directly from the GitHub repository:

```bash
# Clone the dashboard repo and reference the chart locally
git clone https://github.com/dapr/dashboard.git dapr-dashboard-repo
```

```hcl
resource "helm_release" "dapr_dashboard" {
  name      = "dapr-dashboard"
  chart     = "./dapr-dashboard-repo/chart/dapr-dashboard"
  namespace = kubernetes_namespace.dapr_system.metadata[0].name

  depends_on = [helm_release.dapr]
}
```

Alternatively, install the dashboard using the Dapr CLI:

```bash
dapr dashboard -k -n dapr-system
```

## Variables for Multi-Environment Deployments

Create a `variables.tf` to parameterize your deployment:

```hcl
variable "dapr_version" {
  description = "Dapr Helm chart version"
  type        = string
  default     = "1.13.0"
}

variable "environment" {
  description = "Deployment environment (dev/staging/prod)"
  type        = string
}

variable "operator_replicas" {
  description = "Number of Dapr operator replicas"
  type        = number
  default     = 1
}
```

Use workspace-specific values:

```hcl
# terraform.tfvars for prod
dapr_version     = "1.13.0"
environment      = "production"
operator_replicas = 2
```

## Running the Deployment

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan -var="environment=production"

# Apply the deployment
terraform apply -var="environment=production" -auto-approve

# Verify Dapr is running
kubectl get pods -n dapr-system
```

## Summary

Deploying Dapr with Terraform gives you a fully auditable, version-controlled installation that integrates naturally into your existing IaC workflows. Using the Helm provider and Kubernetes resources together, you can manage Dapr's control plane, configure HA replicas, and promote the same configuration across dev, staging, and production environments with confidence.
