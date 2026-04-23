# How to Use Terraform Rancher2 Provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Terraform, Infrastructure as Code, Rancher2 Provider

Description: Deep dive into the Terraform Rancher2 provider features including data sources, resource imports, and managing complex Rancher configurations with Terraform.

## Introduction

The Terraform Rancher2 provider is the official way to manage Rancher resources programmatically. This guide provides a deep dive into the provider's capabilities, best practices for state management, and advanced patterns for managing complex Rancher environments with modules. Pin the provider major version to the Rancher minor version you run, because Rancher aligns provider major releases with Rancher minor releases.

## Prerequisites

- Terraform 1.5+ installed
- Rancher instance version matched to the `rancher2` provider major version you pin (for example, provider `3.x` for Rancher `2.7.x`)
- API token with appropriate permissions

## Step 1: Provider Authentication Methods

```hcl
# provider-methods.tf - Different authentication approaches

# Method 1: API Token (recommended for CI/CD)
provider "rancher2" {
  api_url   = "https://rancher.example.com"
  token_key = "token-xxxxx:yyyyyyyyyy"
}

# Method 2: Access Key / Secret Key pair
provider "rancher2" {
  api_url    = "https://rancher.example.com"
  access_key = "token-xxxxx"
  secret_key = "yyyyyyyyyy"
}

# Method 3: Bootstrapping (first-time setup on a fresh Rancher install)
provider "rancher2" {
  api_url   = "https://rancher.example.com"
  bootstrap = true
}

resource "rancher2_bootstrap" "admin" {
  initial_password = var.initial_admin_password
  password         = var.admin_password
}
```

## Step 2: Data Sources

```hcl
# data-sources.tf - Read existing Rancher resources
# Get existing cluster details
data "rancher2_cluster" "existing_cluster" {
  name = "existing-production"
}

# Get existing project
data "rancher2_project" "system_project" {
  cluster_id = data.rancher2_cluster.existing_cluster.id
  name       = "System"
}

# Get existing namespace
data "rancher2_namespace" "cattle_system" {
  name       = "cattle-system"
  project_id = data.rancher2_project.system_project.id
}

# Get catalog
data "rancher2_catalog_v2" "rancher_charts" {
  cluster_id = data.rancher2_cluster.existing_cluster.id
  name       = "rancher-charts"
}

# Use data source outputs
output "cluster_id" {
  value = data.rancher2_cluster.existing_cluster.id
}

output "kubeconfig" {
  value     = data.rancher2_cluster.existing_cluster.kube_config
  sensitive = true
}
```

## Step 3: Import Existing Resources

```bash
# Import existing resources into Terraform state
# First, find the resource ID in Rancher UI or API

# Import a cluster
terraform import rancher2_cluster_v2.imported_cluster fleet-default/imported-cluster

# Import a project
terraform import rancher2_project.imported_project c-12345:p-abcdef

# Import a namespace
terraform import rancher2_namespace.imported_ns c-12345:p-abcdef.my-namespace

# After import, inspect the imported state
terraform state show rancher2_project.imported_project
```

## Step 4: Advanced Module Structure

```hcl
# terraform/modules/rancher-cluster/main.tf - Reusable cluster module
variable "cluster_name" {
  description = "Name of the cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version supported by your Rancher release"
  type        = string
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}

variable "cloud_credential_secret_name" {
  description = "Cloud credential secret name"
  type        = string
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}

variable "ami" {
  description = "AWS AMI ID"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "security_groups" {
  description = "AWS security groups"
  type        = list(string)
}

variable "subnet_id" {
  description = "AWS subnet ID"
  type        = string
}

variable "vpc_id" {
  description = "AWS VPC ID"
  type        = string
}

variable "zone" {
  description = "AWS availability zone suffix"
  type        = string
}

variable "control_plane_instance_type" {
  description = "Control plane instance type"
  type        = string
  default     = "t3.xlarge"
}

variable "worker_instance_type" {
  description = "Worker instance type"
  type        = string
  default     = "t3.xlarge"
}

resource "rancher2_machine_config_v2" "cp_config" {
  generate_name = "${var.cluster_name}-cp"
  amazonec2_config {
    ami            = var.ami
    region         = var.region
    security_group = var.security_groups
    subnet_id      = var.subnet_id
    vpc_id         = var.vpc_id
    zone           = var.zone
    instance_type  = var.control_plane_instance_type
  }
}

resource "rancher2_machine_config_v2" "worker_config" {
  generate_name = "${var.cluster_name}-worker"
  amazonec2_config {
    ami            = var.ami
    region         = var.region
    security_group = var.security_groups
    subnet_id      = var.subnet_id
    vpc_id         = var.vpc_id
    zone           = var.zone
    instance_type  = var.worker_instance_type
  }
}

resource "rancher2_cluster_v2" "cluster" {
  name               = var.cluster_name
  kubernetes_version = var.kubernetes_version

  rke_config {
    machine_pools {
      name                         = "control-plane"
      cloud_credential_secret_name = var.cloud_credential_secret_name
      control_plane_role           = true
      etcd_role                    = true
      worker_role                  = false
      quantity                     = 3
      machine_config {
        kind = rancher2_machine_config_v2.cp_config.kind
        name = rancher2_machine_config_v2.cp_config.name
      }
    }

    machine_pools {
      name                         = "workers"
      cloud_credential_secret_name = var.cloud_credential_secret_name
      worker_role                  = true
      quantity                     = var.node_count
      machine_config {
        kind = rancher2_machine_config_v2.worker_config.kind
        name = rancher2_machine_config_v2.worker_config.name
      }
    }
  }

  labels = merge(var.tags, {
    "managed-by" = "terraform"
  })
}

output "cluster_id" {
  value = rancher2_cluster_v2.cluster.cluster_v1_id
}

output "kubeconfig" {
  value     = rancher2_cluster_v2.cluster.kube_config
  sensitive = true
}
```

```hcl
# terraform/environments/production/main.tf - Use the module
data "rancher2_cloud_credential" "aws_prod" {
  name = "aws-production"
}

module "production_cluster" {
  source = "../../modules/rancher-cluster"

  cluster_name                 = "production"
  kubernetes_version           = "<supported-rke2-version>"
  node_count                   = 5
  cloud_credential_secret_name = data.rancher2_cloud_credential.aws_prod.id
  ami                          = "<AMI_ID>"
  region                       = "us-east-1"
  security_groups              = ["rancher-production"]
  subnet_id                    = "<SUBNET_ID>"
  vpc_id                       = "<VPC_ID>"
  zone                         = "a"

  tags = {
    environment = "production"
    team        = "platform"
    cost-center = "engineering"
  }
}
```

```hcl
# terraform/environments/staging/main.tf - Use the module
data "rancher2_cloud_credential" "aws_staging" {
  name = "aws-staging"
}

module "staging_cluster" {
  source = "../../modules/rancher-cluster"

  cluster_name                 = "staging"
  kubernetes_version           = "<supported-rke2-version>"
  node_count                   = 2
  cloud_credential_secret_name = data.rancher2_cloud_credential.aws_staging.id
  ami                          = "<AMI_ID>"
  region                       = "us-east-1"
  security_groups              = ["rancher-staging"]
  subnet_id                    = "<SUBNET_ID>"
  vpc_id                       = "<VPC_ID>"
  zone                         = "a"

  tags = {
    environment = "staging"
    team        = "platform"
  }
}
```

## Step 5: Manage Cloud Credentials

```hcl
# terraform/credentials.tf - Cloud provider credentials
resource "rancher2_cloud_credential" "aws_prod" {
  name = "aws-production"
  amazonec2_credential_config {
    access_key = var.aws_access_key
    secret_key = var.aws_secret_key
  }
}

resource "rancher2_cloud_credential" "aws_staging" {
  name = "aws-staging"
  amazonec2_credential_config {
    access_key = var.aws_access_key
    secret_key = var.aws_secret_key
  }
}

resource "rancher2_cloud_credential" "azure_prod" {
  name = "azure-production"
  azure_credential_config {
    client_id       = var.azure_client_id
    client_secret   = var.azure_client_secret
    subscription_id = var.azure_subscription_id
  }
}
```

## Step 6: Configure Node Templates

```hcl
# terraform/node-template.tf - Node template for Rancher node drivers
resource "rancher2_node_template" "aws_worker" {
  name                = "aws-worker-t3xlarge"
  cloud_credential_id = rancher2_cloud_credential.aws_prod.id
  engine_insecure_registry = ["registry.internal.example.com"]

  amazonec2_config {
    ami            = "<AMI_ID>"
    region         = "us-east-1"
    security_group = ["rancher-workers"]
    subnet_id      = var.worker_subnet_id
    vpc_id         = var.vpc_id
    zone           = "a"
    instance_type  = "t3.xlarge"
    root_size      = "100"
    tags           = "environment,production"

    # IAM role for ECR access
    iam_instance_profile = "EC2-ECR-ReadOnly"
  }
}
```

## Step 7: Handle State and Environment Separation

```bash
# With separate root modules per environment, prefer separate state backends
terraform -chdir=terraform/environments/production init
terraform -chdir=terraform/environments/production apply

terraform -chdir=terraform/environments/staging init
terraform -chdir=terraform/environments/staging apply

# State management
terraform -chdir=terraform/environments/production state list
terraform -chdir=terraform/environments/production state show module.production_cluster.rancher2_cluster_v2.cluster
terraform -chdir=terraform/environments/production state rm rancher2_user.old_user
terraform -chdir=terraform/environments/production state mv module.production_cluster.rancher2_cluster_v2.old module.production_cluster.rancher2_cluster_v2.new
```

## Step 8: CI/CD Pipeline Integration

```yaml
# .github/workflows/terraform.yml - GitHub Actions for Terraform
name: Terraform Rancher

on:
  push:
    branches: [main]
    paths: ['terraform/**']
  pull_request:
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        run: terraform init
        working-directory: terraform/environments/production

      - name: Terraform Plan
        run: terraform plan -no-color
        working-directory: terraform/environments/production
        env:
          RANCHER_URL: ${{ secrets.RANCHER_URL }}
          RANCHER_TOKEN_KEY: ${{ secrets.RANCHER_TOKEN }}
          TF_VAR_aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          TF_VAR_aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve
        working-directory: terraform/environments/production
        env:
          RANCHER_URL: ${{ secrets.RANCHER_URL }}
          RANCHER_TOKEN_KEY: ${{ secrets.RANCHER_TOKEN }}
          TF_VAR_aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          TF_VAR_aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Conclusion

The Terraform Rancher2 provider offers broad coverage of Rancher resources for infrastructure-as-code workflows. By using modules for reusable patterns, separate state per environment, and CI/CD pipelines for automated changes, you can build a robust, version-controlled Rancher management system. Always pin provider versions to the Rancher minor release you run, use remote state for collaboration, and implement proper secret management with Vault or similar tools for credentials.
