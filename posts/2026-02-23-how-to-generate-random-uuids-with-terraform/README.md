# How to Generate Random UUIDs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Random Provider, UUID, Infrastructure as Code, Unique Identifiers

Description: Learn how to generate RFC 4122 compliant UUIDs with Terraform using the random_uuid resource for resource tagging, correlation IDs, and unique identifiers.

---

UUIDs (Universally Unique Identifiers) are 128-bit identifiers that are practically guaranteed to be unique across space and time. The random_uuid resource in Terraform generates version 4 UUIDs that follow the RFC 4122 specification. These are useful for tagging resources, creating correlation IDs, generating unique configuration values, and any scenario where you need a standardized unique identifier format.

In this guide, we will explore the random_uuid resource in Terraform. We will cover basic usage, practical applications, the relationship between UUIDs and keepers, and patterns for using UUIDs effectively in your infrastructure code.

## Understanding random_uuid

A UUID version 4 looks like this: `a1b2c3d4-e5f6-4890-abcd-ef1234567890`. It consists of 32 hexadecimal digits arranged in five groups separated by hyphens, in the pattern 8-4-4-4-12. The "4" in the third group indicates this is a version 4 (random) UUID. The probability of generating two identical UUIDs is astronomically small, making them safe to use as unique identifiers without coordination between systems.

## Basic Setup

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Generating a Simple UUID

```hcl
# basic.tf - Simple UUID generation
resource "random_uuid" "example" {}

output "uuid" {
  value = random_uuid.example.result
  # Example: "a1b2c3d4-e5f6-4890-abcd-ef1234567890"
}

output "uuid_id" {
  value = random_uuid.example.id
  # Same as result: "a1b2c3d4-e5f6-4890-abcd-ef1234567890"
}
```

## Using UUIDs for Deployment Tracking

Track deployments with unique identifiers:

```hcl
# deployment-tracking.tf - Unique deployment identifiers
resource "random_uuid" "deployment" {
  keepers = {
    # Generate a new UUID for each deployment
    deploy_time = var.deploy_timestamp
  }
}

variable "deploy_timestamp" {
  type    = string
  default = "2026-02-23T10:00:00Z"
}

# Store the deployment ID in SSM Parameter Store
resource "aws_ssm_parameter" "deployment_id" {
  name  = "/${var.environment}/current-deployment"
  type  = "String"
  value = random_uuid.deployment.result

  tags = {
    Environment  = var.environment
    DeploymentID = random_uuid.deployment.result
  }
}

# Tag all resources with the deployment UUID
locals {
  deployment_tags = {
    DeploymentID = random_uuid.deployment.result
    Environment  = var.environment
    ManagedBy    = "terraform"
  }
}
```

## Creating Correlation IDs for Distributed Systems

Use UUIDs as correlation IDs that link related resources together:

```hcl
# correlation.tf - Correlation IDs for related resource groups
resource "random_uuid" "stack_id" {
  keepers = {
    stack_version = var.stack_version
  }
}

variable "stack_version" {
  type    = string
  default = "1.0.0"
}

# All resources in this stack share the same correlation ID
resource "aws_ecs_cluster" "app" {
  name = "app-cluster-${var.environment}"

  tags = merge(local.deployment_tags, {
    StackID = random_uuid.stack_id.result
  })
}

resource "aws_rds_cluster" "app" {
  cluster_identifier = "app-db-${var.environment}"
  engine             = "aurora-postgresql"
  master_username    = "admin"
  master_password    = "temporary-change-me"

  tags = merge(local.deployment_tags, {
    StackID = random_uuid.stack_id.result
  })

  skip_final_snapshot = true
}

resource "aws_elasticache_cluster" "app" {
  cluster_id           = "app-cache-${var.environment}"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 1

  tags = merge(local.deployment_tags, {
    StackID = random_uuid.stack_id.result
  })
}

output "stack_correlation_id" {
  description = "Correlation ID linking all stack resources"
  value       = random_uuid.stack_id.result
}
```

## Generating UUIDs for Configuration Files

Create unique identifiers for configuration values:

```hcl
# config.tf - UUIDs in configuration
resource "random_uuid" "api_client_id" {
  keepers = {
    environment = var.environment
    service     = "api-gateway"
  }
}

resource "random_uuid" "webhook_secret_id" {
  keepers = {
    environment = var.environment
  }
}

# Store configuration with UUIDs
resource "aws_ssm_parameter" "api_config" {
  name = "/${var.environment}/api/config"
  type = "String"

  value = jsonencode({
    client_id     = random_uuid.api_client_id.result
    webhook_id    = random_uuid.webhook_secret_id.result
    environment   = var.environment
    version       = var.stack_version
  })
}
```

## Multiple UUIDs for Multi-Tenant Setup

Generate unique identifiers for each tenant in a multi-tenant system:

```hcl
# multi-tenant.tf - Per-tenant UUIDs
variable "tenants" {
  type    = list(string)
  default = ["acme-corp", "globex", "initech", "hooli"]
}

resource "random_uuid" "tenant_id" {
  for_each = toset(var.tenants)

  keepers = {
    tenant_name = each.value
  }
}

# Create per-tenant S3 buckets with UUID-based naming
resource "aws_s3_bucket" "tenant_data" {
  for_each = toset(var.tenants)

  bucket = "tenant-${random_uuid.tenant_id[each.value].result}"

  tags = {
    TenantName = each.value
    TenantID   = random_uuid.tenant_id[each.value].result
    Environment = var.environment
  }
}

output "tenant_ids" {
  description = "UUID assigned to each tenant"
  value = {
    for k, v in random_uuid.tenant_id : k => v.result
  }
}
```

## Using UUIDs as Idempotency Keys

Generate idempotency keys for API calls made through external data sources:

```hcl
# idempotency.tf - Idempotency keys for external operations
resource "random_uuid" "idempotency_key" {
  keepers = {
    # Generate a new key for each unique operation
    operation   = var.operation_name
    environment = var.environment
    timestamp   = var.operation_timestamp
  }
}

variable "operation_name" {
  type    = string
  default = "provision-cluster"
}

variable "operation_timestamp" {
  type    = string
  default = "2026-02-23"
}

output "idempotency_key" {
  value = random_uuid.idempotency_key.result
}
```

## UUID as Resource Group Identifier

```hcl
# resource-groups.tf - Group related resources with UUIDs
resource "random_uuid" "resource_group" {}

resource "aws_resourcegroups_group" "app" {
  name = "app-${var.environment}"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = ["AWS::AllSupported"]
      TagFilters = [{
        Key    = "ResourceGroupID"
        Values = [random_uuid.resource_group.result]
      }]
    })
  }

  tags = {
    ResourceGroupID = random_uuid.resource_group.result
    Environment     = var.environment
  }
}

output "resource_group_id" {
  value = random_uuid.resource_group.result
}
```

## Keepers and UUID Regeneration

```hcl
# keepers.tf - Control UUID lifecycle
# Stable UUID - never changes
resource "random_uuid" "permanent" {}

# UUID that changes with deployments
resource "random_uuid" "per_deploy" {
  keepers = {
    deploy_version = var.app_version
  }
}

variable "app_version" {
  type    = string
  default = "2.0.0"
}

# UUID that changes when infrastructure changes
resource "random_uuid" "per_infra_change" {
  keepers = {
    vpc_id      = var.vpc_id
    instance_type = var.instance_type
  }
}

variable "vpc_id" {
  type    = string
  default = "vpc-12345"
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}
```

## Conclusion

The random_uuid resource generates standardized, practically unique identifiers that are perfect for resource tagging, deployment tracking, and correlation across distributed systems. UUIDs are universally recognized and supported by virtually every programming language and database, making them ideal for identifiers that cross system boundaries. The keepers mechanism gives you precise control over when UUIDs regenerate. For shorter identifiers, consider [random IDs](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-ids-with-terraform/view), and for human-readable names, check out [random pet names](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-random-pet-names-with-terraform/view).
