# How to Provision MongoDB Atlas with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Terraform, Atlas, Infrastructure as Code, DevOps

Description: Learn how to provision MongoDB Atlas clusters, database users, and network access rules using Terraform with the MongoDB Atlas provider for reproducible infrastructure.

---

## Prerequisites

- Terraform 1.0+
- MongoDB Atlas account with an organization
- Atlas API keys (public and private)

## Provider Configuration

```hcl
terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15"
    }
  }
}

provider "mongodbatlas" {
  public_key  = var.atlas_public_key
  private_key = var.atlas_private_key
}
```

## Variables

```hcl
variable "atlas_public_key" {
  description = "MongoDB Atlas public API key"
  type        = string
  sensitive   = true
}

variable "atlas_private_key" {
  description = "MongoDB Atlas private API key"
  type        = string
  sensitive   = true
}

variable "atlas_org_id" {
  description = "MongoDB Atlas organization ID"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_password" {
  description = "Password for the application database user"
  type        = string
  sensitive   = true
}

variable "readonly_password" {
  description = "Password for the read-only database user"
  type        = string
  sensitive   = true
}
```

## Creating a Project

```hcl
resource "mongodbatlas_project" "main" {
  name   = "myapp-${var.environment}"
  org_id = var.atlas_org_id
}
```

## Provisioning a Cluster

```hcl
resource "mongodbatlas_cluster" "main" {
  project_id = mongodbatlas_project.main.id
  name       = "myapp-${var.environment}"

  provider_name               = "AWS"
  provider_region_name        = "US_EAST_1"
  provider_instance_size_name = var.environment == "prod" ? "M30" : "M10"

  mongo_db_major_version = "7.0"

  # Enable backups for production
  cloud_backup = var.environment == "prod" ? true : false

  replication_specs {
    num_shards = 1
    regions_config {
      region_name     = "US_EAST_1"
      electable_nodes = 3
      priority        = 7
      read_only_nodes = 0
    }
  }

  auto_scaling_disk_gb_enabled = true

  advanced_configuration {
    javascript_enabled           = false
    minimum_enabled_tls_protocol = "TLS1_2"
  }

  tags {
    key   = "environment"
    value = var.environment
  }
}
```

## Database Users

```hcl
resource "mongodbatlas_database_user" "app_user" {
  username           = "app-user"
  password           = var.db_password
  project_id         = mongodbatlas_project.main.id
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "myapp"
  }

  scopes {
    name = mongodbatlas_cluster.main.name
    type = "CLUSTER"
  }
}

resource "mongodbatlas_database_user" "readonly_user" {
  username           = "readonly-user"
  password           = var.readonly_password
  project_id         = mongodbatlas_project.main.id
  auth_database_name = "admin"

  roles {
    role_name     = "read"
    database_name = "myapp"
  }
}
```

## Network Access

```hcl
# Allow specific IP range
resource "mongodbatlas_project_ip_access_list" "app_servers" {
  project_id = mongodbatlas_project.main.id
  cidr_block = "10.0.1.0/24"
  comment    = "Application server subnet"
}

# VPC Peering (production recommended)
resource "mongodbatlas_network_peering" "aws_peer" {
  accepter_region_name   = "us-east-1"
  project_id             = mongodbatlas_project.main.id
  container_id           = mongodbatlas_cluster.main.container_id
  provider_name          = "AWS"
  route_table_cidr_block = "10.0.0.0/16"
  vpc_id                 = aws_vpc.main.id
  aws_account_id         = data.aws_caller_identity.current.account_id
}
```

## Outputs

```hcl
output "connection_string" {
  value       = mongodbatlas_cluster.main.connection_strings[0].standard_srv
  description = "MongoDB Atlas SRV connection string"
  sensitive   = true
}

output "cluster_id" {
  value = mongodbatlas_cluster.main.cluster_id
}

output "project_id" {
  value = mongodbatlas_project.main.id
}
```

## Applying the Configuration

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan -var="atlas_public_key=$ATLAS_PUB" \
               -var="atlas_private_key=$ATLAS_PRIV" \
               -var="atlas_org_id=$ATLAS_ORG"

# Apply changes
terraform apply -auto-approve \
               -var="atlas_public_key=$ATLAS_PUB" \
               -var="atlas_private_key=$ATLAS_PRIV" \
               -var="atlas_org_id=$ATLAS_ORG"
```

## Managing Secrets Securely

Store Atlas API keys in environment variables or a secrets manager rather than in `.tfvars` files:

```bash
export TF_VAR_atlas_public_key="your-public-key"
export TF_VAR_atlas_private_key="your-private-key"
export TF_VAR_atlas_org_id="your-org-id"
terraform apply
```

## Summary

Provision MongoDB Atlas infrastructure using Terraform's `mongodbatlas` provider to create projects, clusters, database users, and network access rules as code. Use variables for environment-specific configuration and store API keys as sensitive Terraform variables or environment variables. Output the connection string for use in application deployment pipelines.
