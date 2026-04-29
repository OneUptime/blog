# How to Configure the MongoDB Atlas Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, MongoDB Atlas, Infrastructure as Code, IaC, Database, Cloud Database

Description: Learn how to configure the MongoDB Atlas provider in OpenTofu to manage clusters, databases, and network peering.

## Introduction

This guide covers How to Configure the MongoDB Atlas Provider in OpenTofu using OpenTofu with practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- A MongoDB Atlas account with an organization and an API key (public/private) with sufficient permissions
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.24"
    }
  }
}

# Configure the provider with credentials

provider "mongodbatlas" {
  # Use environment variables for credentials:
  # MONGODB_ATLAS_PUBLIC_KEY and MONGODB_ATLAS_PRIVATE_KEY

  # Or specify directly (not recommended for secrets)
  # public_key  = var.public_key
  # private_key = var.private_key
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication
export MONGODB_ATLAS_PUBLIC_KEY="your-public-key"
export MONGODB_ATLAS_PRIVATE_KEY="your-private-key"
```

```hcl
variable "public_key" {
  description = "MongoDB Atlas API public key"
  type        = string
  sensitive   = true
}

variable "private_key" {
  description = "MongoDB Atlas API private key"
  type        = string
  sensitive   = true
}

variable "org_id" {
  description = "MongoDB Atlas organization ID"
  type        = string
}
```

## Step 3: Create Basic Resources

```hcl
# Create an Atlas project within the organization
resource "mongodbatlas_project" "main" {
  name   = "${var.environment}-project"
  org_id = var.org_id

  tags = {
    environment = var.environment
    managed_by  = "opentofu"
  }
}

# Create a team in the organization, then assign it to the project
resource "mongodbatlas_team" "developers" {
  name      = "developers"
  org_id    = var.org_id
  usernames = ["developer@example.com"]
}

resource "mongodbatlas_project_team" "developers" {
  project_id = mongodbatlas_project.main.id
  team_id    = mongodbatlas_team.developers.team_id
  role_names = ["GROUP_READ_WRITE"]
}
```

## Step 4: Configure Advanced Settings

```hcl
# Monitoring and alerting configuration
resource "mongodbatlas_alert_configuration" "main" {
  project_id = mongodbatlas_project.main.id
  event_type = "OUTSIDE_METRIC_THRESHOLD"
  enabled    = true

  notification {
    type_name     = "EMAIL"
    email_address = var.notification_email
    delay_min     = 0
  }

  metric_threshold_config {
    metric_name = "DISK_PARTITION_SPACE_USED_DATA"
    operator    = "GREATER_THAN"
    threshold   = 90
    units       = "PERCENT"
    mode        = "AVERAGE"
  }
}

# Backup and retention policies (per cluster)
resource "mongodbatlas_cloud_backup_schedule" "main" {
  project_id   = mongodbatlas_project.main.id
  cluster_name = "your-cluster-name"

  reference_hour_of_day    = 2  # Daily at 2 AM UTC
  reference_minute_of_hour = 0

  policy_item_daily {
    frequency_interval = 1
    retention_unit     = "days"
    retention_value    = 30
  }
}
```

## Step 5: Define Outputs

```hcl
output "project_id" {
  description = "The ID of the created project"
  value       = mongodbatlas_project.main.id
}

output "project_name" {
  description = "The name of the created project"
  value       = mongodbatlas_project.main.name
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify API keys are valid and have the required permissions. Check for typos in environment variable names.

### Rate Limiting
Add `depends_on` to serialize resource creation and avoid hitting API rate limits.

### Provider Version Conflicts
Pin to a specific provider version range to ensure reproducible deployments.

## Conclusion

You have successfully configured How to Configure the MongoDB Atlas Provider in OpenTofu using OpenTofu. This provider enables you to manage all aspects of the service as code, ensuring consistency and enabling GitOps workflows. Always use environment variables or secure secret stores for sensitive credentials.
