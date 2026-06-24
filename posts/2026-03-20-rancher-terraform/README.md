# How to Use Terraform to Manage Rancher Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Terraform, Infrastructure as Code, Automation

Description: Use Terraform with the Rancher2 provider to manage Rancher clusters, projects, users, and workloads as infrastructure code for reproducible environments.

## Introduction

Terraform enables infrastructure-as-code management of Rancher resources, making cluster creation, project management, and configuration reproducible and version-controlled. The official Rancher2 Terraform provider supports Rancher v2 resources, allowing you to automate everything from cluster provisioning to RBAC configuration.

## Prerequisites

- Terraform 1.5+ installed
- Rancher instance with API access
- Rancher API token (create in User Settings > API & Keys)
- Compatible Rancher and Rancher2 provider versions
- Basic Terraform knowledge

## Step 1: Configure the Rancher2 Provider

```hcl
# main.tf - Rancher2 provider configuration

terraform {
  required_providers {
    rancher2 = {
      source = "rancher/rancher2"
      # Pin the provider major version that matches your Rancher minor release.
    }
  }

  # Store state in S3 for team collaboration
  backend "s3" {
    bucket = "terraform-state-rancher"
    key    = "rancher/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "rancher2" {
  api_url   = var.rancher_url
  token_key = var.rancher_token
  # Set insecure = true only if Rancher uses a self-signed certificate
  insecure  = false
}
```

```hcl
# variables.tf - Variables
variable "rancher_url" {
  description = "Rancher server URL"
  type        = string
  # Set via TF_VAR_rancher_url environment variable
}

variable "rancher_token" {
  description = "Rancher API token"
  type        = string
  sensitive   = true
  # Set via TF_VAR_rancher_token environment variable
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "devops_password" {
  description = "Password for the example DevOps user"
  type        = string
  sensitive   = true
  # Set via TF_VAR_devops_password environment variable
}
```

## Step 2: Create a Cluster

```hcl
# cluster.tf - RKE2 cluster definition
resource "rancher2_cluster_v2" "production_cluster" {
  name              = "production-${var.environment}"
  kubernetes_version = "<rke2-version-supported-by-your-rancher-release>"

  rke_config {
    # Machine configuration
    machine_global_config = yamlencode({
      cni          = "cilium"
      cluster-cidr = "10.42.0.0/16"
      service-cidr = "10.43.0.0/16"
    })

    # Upgrade strategy
    upgrade_strategy {
      control_plane_concurrency  = "1"
      worker_concurrency         = "10%"
      control_plane_drain_options {
        enabled = true
      }
      worker_drain_options {
        enabled = true
      }
    }
  }

  labels = {
    environment = var.environment
    managed-by  = "terraform"
  }
}

# Get the kubeconfig for the created cluster
output "kubeconfig" {
  value     = rancher2_cluster_v2.production_cluster.kube_config
  sensitive = true
}
```

Because this example omits `machine_pools`, Rancher creates a custom cluster. Register nodes before creating projects, namespaces, or apps against it, or use the node-driver example in Step 3 instead.

## Step 3: Manage Cloud Provider Node Pools

```hcl
# nodepool.tf - Alternative AWS node-driver cluster example
resource "rancher2_cloud_credential" "aws" {
  name = "aws-production"
  amazonec2_credential_config {
    access_key = "<AWS_ACCESS_KEY>"
    secret_key = "<AWS_SECRET_KEY>"
  }
}

resource "rancher2_machine_config_v2" "aws_pool_config" {
  generate_name = "worker-"
  amazonec2_config {
    ami            = "<AMI_ID>"
    region         = "us-east-1"
    security_group = ["rancher-nodes"]
    subnet_id      = "subnet-12345"
    vpc_id         = "vpc-12345"
    zone           = "a"
    instance_type  = "t3.xlarge"
    root_size      = "50"
    tags           = "environment,production,managed-by,terraform"
  }
}

resource "rancher2_cluster_v2" "aws_cluster" {
  name               = "production-${var.environment}-aws"
  kubernetes_version = "<rke2-version-supported-by-your-rancher-release>"

  rke_config {
    machine_pools {
      name                         = "control-plane"
      cloud_credential_secret_name = rancher2_cloud_credential.aws.id
      control_plane_role           = true
      etcd_role                    = true
      quantity                     = 3
      machine_config {
        kind = rancher2_machine_config_v2.aws_pool_config.kind
        name = rancher2_machine_config_v2.aws_pool_config.name
      }
    }

    machine_pools {
      name                         = "workers"
      cloud_credential_secret_name = rancher2_cloud_credential.aws.id
      worker_role                  = true
      quantity                     = 5
      machine_config {
        kind = rancher2_machine_config_v2.aws_pool_config.kind
        name = rancher2_machine_config_v2.aws_pool_config.name
      }
    }
  }
}
```

If you use this node-driver example instead of the custom cluster in Step 2, update later references from `rancher2_cluster_v2.production_cluster` to `rancher2_cluster_v2.aws_cluster`.

## Step 4: Manage Projects and Namespaces

```hcl
# projects.tf - Create Rancher projects and namespaces
resource "rancher2_project" "production_project" {
  name       = "production"
  cluster_id = rancher2_cluster_v2.production_cluster.cluster_v1_id
  wait_for_cluster = true

  # Resource quota for the project
  resource_quota {
    project_limit {
      limits_cpu      = "4000m"
      limits_memory   = "8Gi"
      requests_cpu    = "2000m"
      requests_memory = "4Gi"
    }
    namespace_default_limit {
      limits_cpu      = "500m"
      limits_memory   = "1Gi"
    }
  }

  # Container default resource limits
  container_resource_limit {
    limits_cpu      = "200m"
    limits_memory   = "256Mi"
    requests_cpu    = "100m"
    requests_memory = "128Mi"
  }
}

resource "rancher2_namespace" "production_namespace" {
  name       = "production"
  project_id = rancher2_project.production_project.id

  labels = {
    environment = "production"
    managed-by  = "terraform"
  }

  # Override namespace-level resource quota
  resource_quota {
    limit {
      limits_cpu      = "2000m"
      limits_memory   = "4Gi"
    }
  }
}
```

## Step 5: Configure RBAC

```hcl
# rbac.tf - User and role management
resource "rancher2_user" "devops_user" {
  name     = "DevOps Engineer"
  username = "devops"
  password = var.devops_password
  enabled  = true
}

resource "rancher2_global_role_binding" "devops_user_base" {
  name           = "devops-user-base"
  global_role_id = "user-base"
  user_id        = rancher2_user.devops_user.id
}

resource "rancher2_project_role_template_binding" "devops_binding" {
  name             = "devops-project-member"
  project_id       = rancher2_project.production_project.id
  role_template_id = "project-member"
  user_id          = rancher2_user.devops_user.id
}

# Create custom role template
resource "rancher2_role_template" "readonly_deployer" {
  name    = "readonly-with-deploy"
  context = "project"

  rules {
    api_groups = [""]
    resources  = ["pods", "services", "configmaps"]
    verbs      = ["get", "list", "watch"]
  }

  rules {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }
}
```

## Step 6: Deploy Catalog Apps

```hcl
# apps.tf - Deploy Helm apps via Rancher
resource "rancher2_app_v2" "rancher_monitoring_crd" {
  cluster_id    = rancher2_cluster_v2.production_cluster.cluster_v1_id
  namespace     = "cattle-monitoring-system"
  name          = "rancher-monitoring-crd"
  repo_name     = "rancher-charts"
  chart_name    = "rancher-monitoring-crd"
}

resource "rancher2_app_v2" "rancher_monitoring" {
  cluster_id    = rancher2_cluster_v2.production_cluster.cluster_v1_id
  namespace     = "cattle-monitoring-system"
  name          = "rancher-monitoring"
  repo_name     = "rancher-charts"
  chart_name    = "rancher-monitoring"

  values = yamlencode({
    prometheus = {
      prometheusSpec = {
        retention = "30d"
        storageSpec = {
          volumeClaimTemplate = {
            spec = {
              storageClassName = "standard"
              resources = {
                requests = { storage = "50Gi" }
              }
            }
          }
        }
      }
    }
  })
  depends_on = [rancher2_app_v2.rancher_monitoring_crd]
}
```

## Step 7: Apply and Manage

```bash
# Initialize Terraform
terraform init

# Plan the changes
terraform plan \
  -var="rancher_url=https://rancher.example.com" \
  -var="rancher_token=token-xxxxx:yyyyyyyy" \
  -var="devops_password=ChangeMe1234"

# Apply changes
terraform apply \
  -var="rancher_url=https://rancher.example.com" \
  -var="rancher_token=token-xxxxx:yyyyyyyy" \
  -var="devops_password=ChangeMe1234"

# Use environment variables instead of CLI flags
export TF_VAR_rancher_url="https://rancher.example.com"
export TF_VAR_rancher_token="token-xxxxx:yyyyyyyy"
export TF_VAR_devops_password="ChangeMe1234"
terraform apply

# Destroy (for cleanup)
terraform destroy
```

## Conclusion

Terraform with the Rancher2 provider enables infrastructure-as-code management of Rancher resources. By defining clusters, projects, RBAC, and applications in Terraform, you get version-controlled, reproducible infrastructure that can be deployed consistently across development, staging, and production environments. Store Terraform state in S3 or Terraform Cloud for team collaboration and use workspaces for environment isolation.
