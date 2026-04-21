# How to Use Terraform to Manage Rancher Resources - Manage Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Terraform, Infrastructure as Code, Automation, Kubernetes, DevOps

Description: Use Terraform with the Rancher2 provider to manage Rancher clusters, projects, namespaces, and RBAC roles as code with version control and automation.

## Introduction

Managing Rancher through the UI is fine for small deployments but becomes error-prone at scale. Terraform enables you to declare your Rancher infrastructure as code, apply it consistently across environments, and track changes through version control.

## Prerequisites

- Terraform v1.0+
- A running Rancher instance
- Rancher API key with appropriate permissions

## Step 1: Create a Rancher API Key

1. Log into Rancher UI
2. Go to **User Avatar > Account & API Keys**
3. Create a new API key and note the Access Key and Secret Key

## Step 2: Configure the Rancher2 Provider

```hcl
# providers.tf

terraform {
  required_providers {
    rancher2 = {
      source  = "rancher/rancher2"
      version = "~> 14.0"
    }
  }
}

provider "rancher2" {
  api_url    = "https://rancher.example.com"
  access_key = var.rancher_access_key
  secret_key = var.rancher_secret_key
  insecure   = false    # Set true only for self-signed certs in development
}
```

## Step 3: Define Variables

```hcl
# variables.tf
variable "rancher_access_key" {
  type      = string
  sensitive = true
}

variable "rancher_secret_key" {
  type      = string
  sensitive = true
}

variable "cluster_name" {
  type    = string
  default = "production-cluster"
}
```

## Step 4: Create a Project and Namespace

```hcl
# main.tf

# Reference an existing cluster
data "rancher2_cluster" "prod" {
  name = var.cluster_name
}

# Create a project within the cluster
resource "rancher2_project" "myapp" {
  name       = "myapp"
  cluster_id = data.rancher2_cluster.prod.id

  resource_quota {
    project_limit {
      limits_cpu       = "4000m"
      limits_memory    = "8Gi"
      requests_storage = "50Gi"
    }
    namespace_default_limit {
      limits_cpu    = "1000m"
      limits_memory = "2Gi"
    }
  }
}

# Create a namespace inside the project
resource "rancher2_namespace" "myapp_prod" {
  name       = "myapp-production"
  project_id = rancher2_project.myapp.id

  labels = {
    environment = "production"
    team        = "platform"
  }
}
```

## Step 5: Configure RBAC

```hcl
# rbac.tf

# Add a user to the project with developer role
resource "rancher2_project_role_template_binding" "dev_binding" {
  name             = "developer-binding"
  project_id       = rancher2_project.myapp.id
  role_template_id = "project-member"
  user_id          = "user-abc123"    # Rancher user ID
}
```

## Step 6: Apply the Configuration

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan -var="rancher_access_key=token-xxxxx" \
               -var="rancher_secret_key=secret-xxxxx"

# Apply changes
terraform apply -var="rancher_access_key=token-xxxxx" \
                -var="rancher_secret_key=secret-xxxxx"
```

## Step 7: Store State Remotely

```hcl
# backend.tf - Store Terraform state in S3
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "rancher/production.tfstate"
    region = "us-east-1"
  }
}
```

## Conclusion

Terraform with the Rancher2 provider provides full infrastructure-as-code management for your Rancher environment. All cluster configurations, projects, namespaces, and RBAC bindings are version-controlled and reproducible, making environment promotion and disaster recovery straightforward.
